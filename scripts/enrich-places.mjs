// Fetch address + coordinates from Google Maps for restaurants missing place-cache entries.
// Usage: node scripts/enrich-places.mjs [--list NAME] [--limit N]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const cachePath = path.join(root, "data", "place-cache.json");
const listsDir = path.join(root, "data", "lists");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const args = process.argv.slice(2);
const onlyList = args.includes("--list")
  ? args[args.indexOf("--list") + 1]
  : null;
const limitArg = args.includes("--limit")
  ? Number(args[args.indexOf("--limit") + 1])
  : Infinity;

function inferLocationHint(name) {
  const patterns = [
    [/富山/, "富山"],
    [/金沢/, "金沢"],
    [/函館|小樽|札幌|北海道/, "北海道"],
    [/福岡|博多/, "福岡"],
    [/大阪|心斎橋|梅田|北区/, "大阪"],
    [/京都|祇園/, "京都"],
    [/名古屋|栄/, "名古屋"],
    [/広島/, "広島"],
    [/仙台/, "仙台"],
    [/長崎/, "長崎"],
    [/鹿児島/, "鹿児島"],
    [/沖縄|那覇/, "沖縄"],
    [/高松|香川/, "香川"],
    [/松山|道後/, "愛媛"],
    [/勝どき|銀座|麻布|六本木|渋谷|新宿|恵比寿|日本橋|品川|表参道|青山|赤坂|上野|池袋|八重洲|神田|大手町|西麻布|東麻布|恵比寿|豊洲|代官山|表参道/, "東京"],
    [/横浜|鎌倉|茅ヶ崎|神奈川/, "神奈川"],
    [/佐賀|祐徳/, "佐賀"],
  ];
  for (const [re, hint] of patterns) {
    if (re.test(name)) return hint;
  }
  return "";
}

function listLocationHint(listName) {
  if (/京都/.test(listName)) return "京都";
  if (/茅ヶ崎|鎌倉/.test(listName)) return "神奈川";
  if (/東京/.test(listName)) return "東京";
  if (/地方/.test(listName)) return "日本";
  return "";
}

function buildQuery(name, listName) {
  const nameHint = inferLocationHint(name);
  if (nameHint) return `${name} ${nameHint}`.trim();
  const listHint = listLocationHint(listName);
  if (listHint) return `${name} ${listHint}`.trim();
  return name;
}

function cleanAddress(address) {
  return (address || "")
    .replace(/\s*の操作オプション.*$/, "")
    .replace(/^住所[：:\s]*/, "")
    .trim();
}

function hasRealAddress(cached) {
  if (!cached?.address) return false;
  const a = cleanAddress(cached.address);
  if (/^〒/.test(a)) return true;
  if (/\d{3}-\d{4}/.test(a) && /(北海道|東京都|京都府|大阪府|.{2,3}県)/.test(a))
    return true;
  if (/(北海道|東京都|京都府|大阪府)/.test(a) && /(市|区|町|村|郡)/.test(a))
    return true;
  return /.{2,3}県/.test(a) && /(市|区|町|村|郡)/.test(a);
}

function collectPlaces() {
  const byName = new Map();
  for (const file of fs.readdirSync(listsDir).filter((f) => f.endsWith(".json"))) {
    const raw = JSON.parse(fs.readFileSync(path.join(listsDir, file), "utf8"));
    const listName = raw.list || file.replace(/\.json$/, "");
    if (onlyList && listName !== onlyList && file !== onlyList) continue;
    for (const p of raw.places || []) {
      const name = p.name?.trim();
      if (!name || byName.has(name)) continue;
      byName.set(name, { name, listName, query: buildQuery(name, listName) });
    }
  }
  return [...byName.values()];
}

async function extractPlace(page) {
  await page
    .evaluate(() => {
      document.querySelector('button[data-item-id="address"]')?.click();
    })
    .catch(() => {});
  await new Promise((r) => setTimeout(r, 700));

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
      '[data-item-id="address"] .Io6YTe, .Io6YTe.fontBodyMedium, .rogA2c .fontBodyMedium',
    )) {
      candidates.push(clean(el.textContent));
    }

    for (const el of document.querySelectorAll(
      '[aria-label*="〒"], [aria-label*="東京都"], [aria-label*="京都府"], [aria-label*="大阪府"], [aria-label*="県"]',
    )) {
      candidates.push(clean(el.getAttribute("aria-label")));
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

async function fetchPlaceByCoords(page, lat, lng) {
  const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 2800));
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

async function fetchPlace(page, query, fallbackCoords) {
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
  let place = await extractPlace(page);

  if (!place.address) {
    await new Promise((r) => setTimeout(r, 1500));
    place = await extractPlace(page);
  }

  if (!place.address && fallbackCoords?.lat) {
    const byCoords = await fetchPlaceByCoords(
      page,
      fallbackCoords.lat,
      fallbackCoords.lng,
    );
    if (byCoords?.address) place = { ...place, ...byCoords };
  }

  if (!place.address && !place.lat) return null;
  return place;
}

async function openPage(browser) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  return page;
}

const cache = fs.existsSync(cachePath)
  ? JSON.parse(fs.readFileSync(cachePath, "utf8"))
  : {};
const todo = collectPlaces()
  .filter((p) => !hasRealAddress(cache[p.name]))
  .slice(0, limitArg);
console.log(`Place enrich: ${todo.length} places${onlyList ? ` (${onlyList})` : ""}`);

let ok = 0;
let fail = 0;

async function runWithBrowser(todoSlice) {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: ["--lang=ja-JP", "--window-size=1280,900", "--no-sandbox"],
  });
  let page = await openPage(browser);

  for (const [i, place] of todoSlice.entries()) {
    process.stderr.write(`[${i + 1}/${todoSlice.length}] ${place.name} … `);
    try {
      const existing = cache[place.name];
      const result = await fetchPlace(page, place.query, existing);
      if (result?.address && hasRealAddress({ address: result.address })) {
        cache[place.name] = {
          address: result.address,
          lat: result.lat ?? existing?.lat ?? null,
          lng: result.lng ?? existing?.lng ?? null,
          query: place.query,
        };
        fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
        ok++;
        process.stderr.write(`OK ${result.address.slice(0, 45)}\n`);
      } else if (result?.lat) {
        cache[place.name] = {
          address: existing?.address || "",
          lat: result.lat,
          lng: result.lng,
          query: place.query,
        };
        fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
        fail++;
        process.stderr.write("coords only\n");
      } else {
        fail++;
        process.stderr.write("skip\n");
      }
    } catch (e) {
      fail++;
      process.stderr.write(`err: ${e.message}\n`);
      if (/detached Frame|Connection closed|Protocol error/i.test(e.message)) {
        try {
          await page.close().catch(() => {});
        } catch {}
        try {
          page = await openPage(browser);
        } catch {
          await browser.close().catch(() => {});
          return false;
        }
      }
    }
    await new Promise((r) => setTimeout(r, 800));
  }

  await browser.close().catch(() => {});
  return true;
}

for (let start = 0; start < todo.length; start += 40) {
  const slice = todo.slice(start, start + 40);
  const finished = await runWithBrowser(slice);
  if (!finished && start + 40 < todo.length) {
    process.stderr.write("Restarting browser…\n");
    await new Promise((r) => setTimeout(r, 2000));
  }
}

console.log(JSON.stringify({ ok, fail, cached: Object.keys(cache).length }, null, 2));
