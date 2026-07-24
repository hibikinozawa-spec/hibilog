// Build restaurant intros from Google Maps reviews (positive only).
// Usage: node scripts/enrich-intros.mjs [--limit N] [--force] [--name "店名"]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";
import {
  filterPositiveReviews,
  parseStarRating,
  synthesizeIntro,
} from "./lib/review-intro.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const listsDir = path.join(root, "data", "lists");
const placeCachePath = path.join(root, "data", "place-cache.json");
const cachePath = path.join(root, "data", "intro-cache.json");
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
    const listUrl = LIST_URLS[listName] || LIST_URLS[file.replace(/\.json$/, "")];
    if (!listUrl) continue;
    for (const p of raw.places || []) {
      const name = p.name?.trim();
      if (!name || !isValidPlaceName(name) || byName.has(name)) continue;
      const category =
        (p.cardText || "").split(" ").slice(-1)[0] ||
        p.info?.find((x) => x && !/^[0-9.]+$/.test(x)) ||
        "";
      byName.set(name, {
        name,
        listName,
        listUrl,
        category,
        address: placeCache[name]?.address || "",
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
  for (let i = 0; i < 14; i++) {
    await page.evaluate(() => {
      for (const el of document.querySelectorAll(".m6QErb")) {
        el.scrollTop += 700;
      }
    });
    await new Promise((r) => setTimeout(r, 450));
  }
}

async function openReviewsTab(page) {
  await page.evaluate(() => {
    const tab = [...document.querySelectorAll('button[role="tab"]')].find((b) =>
      /^(クチコミ|Reviews)$/i.test((b.textContent || "").trim()),
    );
    tab?.click();
  });
  await new Promise((r) => setTimeout(r, 2500));
}

async function expandReviewTexts(page) {
  await page.evaluate(() => {
    for (const btn of document.querySelectorAll("button")) {
      if (/もっと見る|More/i.test(btn.textContent || "")) btn.click();
    }
  });
  await new Promise((r) => setTimeout(r, 800));
}

async function extractPlaceMeta(page) {
  return page.evaluate(() => {
    const category = document.querySelector("button.DkEaL")?.textContent?.trim() || "";
    const address =
      document.querySelector('button[data-item-id="address"]')?.textContent?.trim() ||
      document.querySelector('[data-item-id="address"] .Io6YTe')?.textContent?.trim() ||
      "";
    const summaryQuotes = [...document.querySelectorAll("span, div")]
      .map((el) => el.textContent?.trim())
      .filter((t) => t && /^".+"$/.test(t) && t.length >= 12 && t.length <= 180);
    return { category, address, summaryQuotes: [...new Set(summaryQuotes)].slice(0, 6) };
  });
}

async function extractReviews(page) {
  return page.evaluate(() => {
    return [...document.querySelectorAll(".jftiEf")]
      .slice(0, 12)
      .map((card) => {
        const aria =
          card.querySelector('[role="img"][aria-label*="星"], [role="img"][aria-label*="star"]')
            ?.getAttribute("aria-label") || "";
        const text = card.querySelector(".wiI7pd")?.textContent?.replace(/\s+/g, " ").trim() || "";
        return { aria, text };
      })
      .filter((r) => r.text.length > 15);
  });
}

async function fetchIntroForPlace(page, place, currentListUrl) {
  if (currentListUrl !== place.listUrl) {
    await openList(page, place.listUrl);
    currentListUrl = place.listUrl;
  }

  const found = await clickPlaceInList(page, place.name);
  if (!found) return { currentListUrl, result: null, reason: "place_not_found" };

  await scrollPlacePanel(page);
  const meta = await extractPlaceMeta(page);
  await openReviewsTab(page);
  await expandReviewTexts(page);

  const rawReviews = await extractReviews(page);
  const reviews = rawReviews.map((r) => ({
    rating: parseStarRating(r.aria),
    text: r.text,
  }));
  const positiveReviews = filterPositiveReviews(reviews);

  if (positiveReviews.length === 0 && meta.summaryQuotes.length === 0) {
    return { currentListUrl, result: null, reason: "no_positive_reviews" };
  }

  const intro = synthesizeIntro({
    name: place.name,
    category: meta.category || place.category,
    address: meta.address || place.address,
    reviews: positiveReviews,
    summaryQuotes: meta.summaryQuotes,
  });

  return {
    currentListUrl,
    result: {
      intro,
      reviewCount: positiveReviews.length,
      totalReviews: reviews.length,
      generatedAt: new Date().toISOString().slice(0, 10),
      source: "google_maps_reviews",
    },
  };
}

const places = collectPlaces().filter((p) => !onlyName || p.name === onlyName);
const cache = fs.existsSync(cachePath)
  ? JSON.parse(fs.readFileSync(cachePath, "utf8"))
  : {};

const todo = places
  .filter((p) => force || !cache[p.name]?.intro)
  .slice(0, limitArg);

console.log(`Intro enrich: ${todo.length} / ${places.length} places`);

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
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
let currentListUrl = null;

for (const [i, place] of todo.entries()) {
  process.stderr.write(`[${i + 1}/${todo.length}] ${place.name} … `);
  try {
    const { currentListUrl: nextUrl, result, reason } = await fetchIntroForPlace(
      page,
      place,
      currentListUrl,
    );
    currentListUrl = nextUrl;
    if (result?.intro) {
      cache[place.name] = result;
      fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
      ok++;
      process.stderr.write("OK\n");
    } else {
      fail++;
      process.stderr.write(`${reason || "skip"}\n`);
    }
  } catch (e) {
    fail++;
    process.stderr.write(`err: ${e.message}\n`);
  }
  await new Promise((r) => setTimeout(r, 900));
}

await browser.close();
console.log(
  JSON.stringify({ ok, fail, cached: Object.keys(cache).length }, null, 2),
);
