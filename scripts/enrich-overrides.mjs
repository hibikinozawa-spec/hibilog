// Re-fetch Google Maps photos for entries listed in catalog-overrides.json photos section.
// Usage: node scripts/enrich-overrides.mjs [--places] [--photos] [--force]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const deployRoot = fs.existsSync(path.resolve(__dirname, "../../../hibilog/data/lists"))
  ? path.resolve(__dirname, "../../../hibilog")
  : root;
const overridesPath = path.join(deployRoot, "data", "catalog-overrides.json");
const photoCachePath = path.join(deployRoot, "data", "photo-cache.json");
const placeCachePath = path.join(deployRoot, "data", "place-cache.json");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const args = process.argv.slice(2);
const doPhotos = args.includes("--photos") || (!args.includes("--places") && !args.includes("--photos"));
const doPlaces = args.includes("--places") || (!args.includes("--places") && !args.includes("--photos"));
const force = args.includes("--force");

const overrides = JSON.parse(fs.readFileSync(overridesPath, "utf8"));

function normalizePhotoUrl(src) {
  if (!src) return null;
  if (/no-thumbnail|gstatic\.com\/tactile|google\.com\/maps\/vt|gps-proxy/.test(src)) {
    return null;
  }
  if (/=w\d+-h\d+/.test(src)) {
    return src.replace(/=w\d+-h\d+(-k-no)?/, "=w800-h600-k-no");
  }
  return src;
}

async function extractPhoto(page) {
  return page.evaluate(() => {
    const imgs = [...document.querySelectorAll("img")]
      .map((img) => ({
        src: img.src || "",
        w: img.naturalWidth || img.width || 0,
        h: img.naturalHeight || img.height || 0,
      }))
      .filter(
        (x) =>
          /googleusercontent|ggpht/.test(x.src) &&
          !/google\.com\/maps\/vt|w36-h36|=s32|=s40|profile|avatar|gps-proxy/i.test(
            x.src,
          ) &&
          x.w >= 100 &&
          x.h >= 70,
      );
    imgs.sort((a, b) => b.w * b.h - a.w * a.h);
    return imgs[0]?.src || null;
  });
}

async function fetchPhoto(page, query) {
  const url = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
  await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 2500));
  const hasResult = await page.evaluate(() => {
    const el =
      document.querySelector(".fontHeadlineSmall") ||
      document.querySelector('a[href*="/maps/place/"]');
    if (el) {
      el.click();
      return true;
    }
    return false;
  });
  if (!hasResult) return null;
  await new Promise((r) => setTimeout(r, 2200));
  let photo = await extractPhoto(page);
  if (!photo) {
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll("button")].find((b) =>
        /写真|Photos/i.test(b.textContent || ""),
      );
      btn?.click();
    });
    await new Promise((r) => setTimeout(r, 1500));
    photo = await extractPhoto(page);
  }
  return normalizePhotoUrl(photo);
}

async function extractPlace(page) {
  return page.evaluate(() => {
    const clean = (raw) =>
      (raw || "")
        .replace(/^住所[：:\s]*/, "")
        .replace(/^Address[：:\s]*/i, "")
        .trim();
    const candidates = [];
    const addressBtn = document.querySelector('button[data-item-id="address"]');
    if (addressBtn) {
      candidates.push(clean(addressBtn.getAttribute("aria-label")));
      candidates.push(clean(addressBtn.textContent));
    }
    for (const el of document.querySelectorAll(
      '[data-item-id="address"] .Io6YTe, .Io6YTe.fontBodyMedium',
    )) {
      candidates.push(clean(el.textContent));
    }
    const address =
      candidates.find(
        (a) =>
          /^〒/.test(a) ||
          /(北海道|東京都|京都府|大阪府|.{2,3}県).*(市|区|町|村|郡)/.test(a),
      ) || "";
    const url = location.href;
    const coordMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    const lat = coordMatch ? parseFloat(coordMatch[1]) : null;
    const lng = coordMatch ? parseFloat(coordMatch[2]) : null;
    return { lat, lng, address };
  });
}

async function fetchPlace(page, query) {
  const url = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
  await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 2500));
  const hasResult = await page.evaluate(() => {
    const el =
      document.querySelector(".fontHeadlineSmall") ||
      document.querySelector('a[href*="/maps/place/"]');
    if (el) {
      el.click();
      return true;
    }
    return false;
  });
  if (!hasResult) return null;
  await new Promise((r) => setTimeout(r, 2200));
  return extractPlace(page);
}

const photoCache = fs.existsSync(photoCachePath)
  ? JSON.parse(fs.readFileSync(photoCachePath, "utf8"))
  : {};
const placeCache = fs.existsSync(placeCachePath)
  ? JSON.parse(fs.readFileSync(placeCachePath, "utf8"))
  : {};

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--lang=ja-JP", "--window-size=1280,900", "--no-sandbox"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });

let photoOk = 0;
let placeOk = 0;

if (doPlaces && overrides.places) {
  for (const [name, data] of Object.entries(overrides.places)) {
    if (!data.query) continue;
    process.stderr.write(`place ${name} … `);
    try {
      const result = await fetchPlace(page, data.query);
      if (result?.address || result?.lat) {
        placeCache[name] = {
          address: data.address || result.address || placeCache[name]?.address || "",
          lat: data.lat ?? result.lat ?? placeCache[name]?.lat ?? null,
          lng: data.lng ?? result.lng ?? placeCache[name]?.lng ?? null,
          query: data.query,
        };
        fs.writeFileSync(placeCachePath, JSON.stringify(placeCache, null, 2));
        placeOk++;
        process.stderr.write("OK\n");
      } else {
        placeCache[name] = {
          ...placeCache[name],
          ...data,
          query: data.query,
        };
        fs.writeFileSync(placeCachePath, JSON.stringify(placeCache, null, 2));
        process.stderr.write("manual\n");
      }
    } catch (e) {
      process.stderr.write(`err ${e.message}\n`);
    }
    await new Promise((r) => setTimeout(r, 800));
  }
}

if (doPhotos && overrides.photos) {
  for (const [name, query] of Object.entries(overrides.photos)) {
    if (!force && photoCache[name] && !/gps-proxy|unsplash/.test(photoCache[name])) {
      continue;
    }
    process.stderr.write(`photo ${name} … `);
    try {
      const photo = await fetchPhoto(page, query);
      if (photo) {
        photoCache[name] = photo;
        fs.writeFileSync(photoCachePath, JSON.stringify(photoCache, null, 2));
        photoOk++;
        process.stderr.write("OK\n");
      } else {
        process.stderr.write("skip\n");
      }
    } catch (e) {
      process.stderr.write(`err ${e.message}\n`);
    }
    await new Promise((r) => setTimeout(r, 800));
  }
}

await browser.close();
console.log(JSON.stringify({ photoOk, placeOk }, null, 2));
