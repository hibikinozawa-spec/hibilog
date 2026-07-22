// Fetch real Google Maps photos for each restaurant (food / interior / storefront).
// Usage: node scripts/enrich-photos.mjs [--limit N] [--force]
// Resume-safe: writes data/photo-cache.json after each success.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const listsDir = path.join(root, "data", "lists");
const cachePath = path.join(root, "data", "photo-cache.json");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const args = process.argv.slice(2);
const limitArg = args.includes("--limit")
  ? Number(args[args.indexOf("--limit") + 1])
  : Infinity;
const force = args.includes("--force");

function areaHint(listName) {
  if (/京都/.test(listName)) return "京都";
  if (/茅ヶ崎|鎌倉/.test(listName)) return "神奈川";
  if (/地方/.test(listName)) return "";
  return "東京";
}

function collectPlaces() {
  const byName = new Map();
  for (const file of fs.readdirSync(listsDir).filter((f) => f.endsWith(".json"))) {
    const raw = JSON.parse(fs.readFileSync(path.join(listsDir, file), "utf8"));
    const listName = raw.list || file.replace(/\.json$/, "");
    for (const p of raw.places || []) {
      const name = p.name?.trim();
      if (!name || byName.has(name)) continue;
      const hint = areaHint(listName);
      byName.set(name, {
        name,
        query: hint ? `${name} ${hint}` : name,
      });
    }
  }
  return [...byName.values()];
}

function normalizePhotoUrl(src) {
  if (!src) return null;
  if (/no-thumbnail|gstatic\.com\/tactile|google\.com\/maps\/vt/.test(src)) {
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
          !/google\.com\/maps\/vt|w36-h36|=s32|=s40|profile|avatar/i.test(
            x.src,
          ) &&
          x.w >= 100 &&
          x.h >= 70,
      );
    imgs.sort((a, b) => b.w * b.h - a.w * b.h);
    return imgs[0]?.src || null;
  });
}

async function fetchPhoto(page, query) {
  const url = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
  await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 2500));

  // Click first search result
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

  // Try photo gallery tab if hero is weak
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

const places = collectPlaces();
const cache = fs.existsSync(cachePath)
  ? JSON.parse(fs.readFileSync(cachePath, "utf8"))
  : {};

const todo = places.filter((p) => force || !cache[p.name]).slice(0, limitArg);
console.log(`Photo enrich: ${todo.length} / ${places.length} places`);

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--lang=ja-JP", "--window-size=1280,900", "--no-sandbox"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });

let ok = 0;
let fail = 0;

for (const [i, place] of todo.entries()) {
  process.stderr.write(`[${i + 1}/${todo.length}] ${place.name} … `);
  try {
    const photo = await fetchPhoto(page, place.query);
    if (photo) {
      cache[place.name] = photo;
      fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
      ok++;
      process.stderr.write("OK\n");
    } else {
      fail++;
      process.stderr.write("skip\n");
    }
  } catch (e) {
    fail++;
    process.stderr.write(`err: ${e.message}\n`);
  }
  await new Promise((r) => setTimeout(r, 800));
}

await browser.close();
console.log(JSON.stringify({ ok, fail, cached: Object.keys(cache).length }, null, 2));
