// Scrape Google Maps place attributes (個室, price range) from 基本情報 tab.
// Usage: node scripts/enrich-place-attributes.mjs [--limit N] [--force] [--name "店名"]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const listsDir = path.join(root, "data", "lists");
const placeCachePath = path.join(root, "data", "place-cache.json");
const cachePath = path.join(root, "data", "place-attributes-cache.json");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const LIST_URLS = {
  東京レストラン_和食: "https://maps.app.goo.gl/stNafCCq1fMxu2D9A",
  東京レストラン_肉: "https://maps.app.goo.gl/8tS6air5cjG4Ra9VA",
  東京レストラン_イタリアン: "https://maps.app.goo.gl/TyUxSccCFwP1yBPa7",
  東京レストラン_フレンチ: "https://maps.app.goo.gl/pRCaWM8rmXabUqxk7",
  東京レストラン_十割そば: "https://maps.app.goo.gl/xCSHyKdVC625bgHT8",
  鰻: "https://maps.app.goo.gl/KyW3nYUPVogmptjy6",
  東京レストラン_中華: "https://maps.app.goo.gl/ZpcrrMaVSKTTq7MK8",
  東京レストラン_焼き鳥: "https://maps.app.goo.gl/kUwiuLQU31MaRzfU6",
  東京レストラン_日本酒名店: "https://maps.app.goo.gl/SAvA2baSXJcKSr8X6",
  東京レストラン_ビブグルマン: "https://maps.app.goo.gl/z4dJYmtBK8tH8Y6K8",
  東京レストラン_会食low: "https://maps.app.goo.gl/mFQD6f6hdnUNmbGe6",
  東京レストラン_会食middle: "https://maps.app.goo.gl/F1V72f2fHDkoitik7",
  東京レストラン_会食exective: "https://maps.app.goo.gl/USqdbubKKk2ykEq57",
  京都レストラン: "https://maps.app.goo.gl/WdkfcMKYpXC3nkeQ9",
  地方レストラン_名店: "https://maps.app.goo.gl/a5JATnasa5Q1Aqx28",
  東京レストラン_コスパ: "https://maps.app.goo.gl/btNiKmntFgy3983w9",
  "茅ヶ崎/鎌倉レストラン": "https://maps.app.goo.gl/9u23dXb3DNFe2iUM7",
  鮨: "https://maps.app.goo.gl/PgNEACSTe8taKRYf9",
};

const args = process.argv.slice(2);
const limitArg = args.includes("--limit")
  ? Number(args[args.indexOf("--limit") + 1])
  : Infinity;
const force = args.includes("--force");
const headed = args.includes("--headed");
const onlyName = args.includes("--name")
  ? args[args.indexOf("--name") + 1]
  : null;

const placeCache = fs.existsSync(placeCachePath)
  ? JSON.parse(fs.readFileSync(placeCachePath, "utf8"))
  : {};

function isValidPlaceName(name) {
  if (!name || name.length < 2) return false;
  if (/^〒/.test(name)) return false;
  if (/^\d{3}-\d{4}/.test(name)) return false;
  return true;
}

function collectPlaces() {
  const byName = new Map();
  for (const file of fs.readdirSync(listsDir).filter((f) => f.endsWith(".json"))) {
    const raw = JSON.parse(fs.readFileSync(path.join(listsDir, file), "utf8"));
    const listName = raw.list || file.replace(/\.json$/, "");
    for (const p of raw.places || []) {
      const name = p.name?.trim();
      if (!name || !isValidPlaceName(name) || byName.has(name)) continue;
      byName.set(name, {
        name,
        listName,
        query: placeCache[name]?.query || `${name} レストラン`,
      });
    }
  }
  return [...byName.values()];
}

async function acceptConsent(page) {
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll("button")].find((b) =>
      /同意|すべて同意|Accept all|承諾|同意する/.test(b.textContent || ""),
    );
    btn?.click();
  });
}

async function openList(page, listUrl) {
  await page.goto(listUrl, { waitUntil: "networkidle2", timeout: 90000 });
  await new Promise((r) => setTimeout(r, 3500));
  await acceptConsent(page);
  await new Promise((r) => setTimeout(r, 1500));
}

async function clickPlaceInList(page, name) {
  const clicked = await page.evaluate((targetName) => {
    const heads = [...document.querySelectorAll(".fontHeadlineSmall")];
    const exact = heads.find((el) => (el.textContent || "").trim() === targetName);
    const partial = heads.find((el) => (el.textContent || "").includes(targetName));
    const el = exact || partial;
    if (!el) return false;
    el.click();
    return true;
  }, name);
  if (!clicked) return false;
  await new Promise((r) => setTimeout(r, 3500));
  return true;
}

async function scrollPlacePanel(page) {
  for (let i = 0; i < 10; i++) {
    await page.evaluate(() => {
      for (const el of document.querySelectorAll(".m6QErb")) {
        el.scrollTop += 700;
      }
    });
    await new Promise((r) => setTimeout(r, 400));
  }
}

async function openAboutTab(page) {
  await page.evaluate(() => {
    const tab = [...document.querySelectorAll('button[role="tab"]')].find((b) =>
      /^(基本情報|About)$/i.test((b.textContent || "").trim()),
    );
    tab?.click();
  });
  await new Promise((r) => setTimeout(r, 2500));
  for (let i = 0; i < 8; i++) {
    await page.evaluate(() => {
      for (const el of document.querySelectorAll(".m6QErb")) {
        el.scrollTop += 600;
      }
    });
    await new Promise((r) => setTimeout(r, 350));
  }
}

async function extractAttributes(page) {
  return page.evaluate(() => {
    function parseYenLocal(raw) {
      if (!raw) return null;
      const v = parseInt(String(raw).replace(/,/g, ""), 10);
      return Number.isFinite(v) ? v : null;
    }

    function attributeAvailable(label) {
      for (const el of document.querySelectorAll("[aria-label]")) {
        const aria = el.getAttribute("aria-label") || "";
        if (!aria.includes(label)) continue;
        if (/利用不可|利用できません|not available|No /i.test(aria)) return false;
        if (/利用可|available|あり/i.test(aria)) return true;
      }

      const bodyText = document.body.innerText || "";
      const serviceStart = bodyText.indexOf("サービス");
      if (serviceStart >= 0) {
        const chunk = bodyText.slice(serviceStart, serviceStart + 1200);
        if (chunk.includes(label)) {
          const lines = chunk.split("\n").map((s) => s.trim()).filter(Boolean);
          for (let i = 0; i < lines.length; i++) {
            if (lines[i] !== label && !lines[i].startsWith(label)) continue;
            const windowText = lines.slice(Math.max(0, i - 1), i + 3).join(" ");
            if (/利用不可|利用できません|なし|No /i.test(windowText)) return false;
            return true;
          }
        }
      }

      for (const el of document.querySelectorAll("div, span, li")) {
        const text = (el.textContent || "").trim();
        if (text !== label) continue;
        let node = el.parentElement;
        for (let depth = 0; depth < 5 && node; depth++) {
          const blob = `${node.getAttribute("aria-label") || ""} ${node.textContent || ""}`;
          if (/利用不可|利用できません|not available|No /i.test(blob)) return false;
          if (/利用可|available|あり/i.test(blob)) return true;
          node = node.parentElement;
        }
      }
      return false;
    }

    const bodyText = document.body.innerText || "";
    let priceMin = null;
    let priceMax = null;
    let priceOpenEnded = false;

    const perPerson =
      bodyText.match(/1人あたり[^\d¥￥]*[¥￥]([\d,]+)\s*[〜～~－-]\s*[¥￥]?([\d,]+)/) ||
      bodyText.match(/[¥￥]([\d,]+)\s*[〜～~－-]\s*[¥￥]?([\d,]+)/);
    if (perPerson) {
      priceMin = parseYenLocal(perPerson[1]);
      priceMax = parseYenLocal(perPerson[2]);
    } else {
      const openEnded = bodyText.match(/1人あたり[^\d¥￥]*[¥￥]([\d,]+)\s*以上/);
      if (openEnded) {
        priceMin = parseYenLocal(openEnded[1]);
        priceOpenEnded = true;
      }
    }

    if (!priceMin) {
      const headerTier = bodyText.match(/[¥￥]([\d,]+)\s*以上/);
      if (headerTier) {
        priceMin = parseYenLocal(headerTier[1]);
        priceOpenEnded = true;
      }
    }

    return {
      privateRoom: attributeAvailable("個室"),
      priceMin,
      priceMax: priceOpenEnded ? null : priceMax,
      priceOpenEnded,
    };
  });
}

async function fetchAttributesForPlace(page, place) {
  const query = place.query || `${place.name} レストラン`;
  const url = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
  await page.goto(url, { waitUntil: "networkidle2", timeout: 90000 });
  await acceptConsent(page);
  await new Promise((r) => setTimeout(r, 2800));

  const clicked = await page.evaluate((targetName) => {
    const heads = [...document.querySelectorAll(".fontHeadlineSmall")];
    const exact = heads.find((el) => (el.textContent || "").trim() === targetName);
    const partial = heads.find((el) => (el.textContent || "").includes(targetName));
    const el = exact || partial || heads[0];
    if (!el) return false;
    el.click();
    return true;
  }, place.name);
  if (!clicked) return { result: null, reason: "place_not_found" };

  await new Promise((r) => setTimeout(r, 3200));
  const restricted = await page.evaluate(() =>
    (document.body.innerText || "").includes("表示が制限されています"),
  );
  if (restricted) return { result: null, reason: "maps_restricted" };

  await scrollPlacePanel(page);
  const overviewAttrs = await extractAttributes(page);
  await openAboutTab(page);
  const aboutAttrs = await extractAttributes(page);

  const privateRoom = aboutAttrs.privateRoom || overviewAttrs.privateRoom;
  const priceMin = overviewAttrs.priceMin ?? aboutAttrs.priceMin;
  const priceMax = overviewAttrs.priceMax ?? aboutAttrs.priceMax;
  const priceOpenEnded =
    overviewAttrs.priceOpenEnded || aboutAttrs.priceOpenEnded;

  return {
    result: {
      privateRoom,
      priceMin,
      priceMax,
      priceOpenEnded,
      fetchedAt: new Date().toISOString().slice(0, 10),
      source: "google_maps_about",
    },
  };
}

const places = collectPlaces().filter((p) => !onlyName || p.name === onlyName);
const cache = fs.existsSync(cachePath)
  ? JSON.parse(fs.readFileSync(cachePath, "utf8"))
  : {};

const todo = places
  .filter((p) => !onlyName || p.name === onlyName)
  .filter((p) => force || cache[p.name]?.source !== "google_maps_about")
  .slice(0, limitArg);

console.log(`Place attributes: ${todo.length} / ${places.length} places`);

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: headed ? false : "new",
  args: [
    "--lang=ja-JP",
    "--window-size=1280,1600",
    "--no-sandbox",
    "--disable-blink-features=AutomationControlled",
  ],
});
const page = await browser.newPage();
await page.evaluateOnNewDocument(() => {
  Object.defineProperty(navigator, "webdriver", { get: () => false });
});
await page.setUserAgent(
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
);
await page.setViewport({ width: 1280, height: 1600 });

let ok = 0;
let fail = 0;
let privateRooms = 0;

for (const [i, place] of todo.entries()) {
  process.stderr.write(`[${i + 1}/${todo.length}] ${place.name} … `);
  try {
    const { result, reason } = await fetchAttributesForPlace(page, place);
    if (result?.privateRoom || result?.priceMin) {
      cache[place.name] = result;
      fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
      ok++;
      if (result.privateRoom) privateRooms++;
      process.stderr.write(
        `OK (個室:${result.privateRoom ? "あり" : "なし"} price:${result.priceMin ?? "?"})\n`,
      );
    } else {
      fail++;
      process.stderr.write(`${reason || "no_data"}\n`);
    }
  } catch (e) {
    fail++;
    process.stderr.write(`err: ${e.message}\n`);
  }
  await new Promise((r) => setTimeout(r, 900));
}

await browser.close();
console.log(
  JSON.stringify(
    {
      ok,
      fail,
      cached: Object.keys(cache).length,
      privateRoomsInCache: Object.values(cache).filter((v) => v.privateRoom).length,
    },
    null,
    2,
  ),
);
