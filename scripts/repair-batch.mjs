// Targeted place + photo repair for known bad matches.
// Usage: node scripts/repair-batch.mjs [--places] [--photos] [--force]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const placeCachePath = path.join(root, "data", "place-cache.json");
const photoCachePath = path.join(root, "data", "photo-cache.json");
const introCachePath = path.join(root, "data", "intro-cache.json");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const args = process.argv.slice(2);
const doPlaces = args.includes("--places") || (!args.includes("--photos") && !args.includes("--places"));
const doPhotos = args.includes("--photos") || (!args.includes("--photos") && !args.includes("--places"));
const force = args.includes("--force");

/** name -> Google Maps search query */
const REPAIRS = {
  // B: wrong place match
  オステリアドゥエ: "osteria due 那覇 沖縄 イタリアン",
  藤乃: "蕎麦 藤乃 大阪 福島",
  春光園: "御宿料亭 春光園 臼杵 大分",
  鰻家: "鰻家 うなぎ 西中島南方 大阪",
  // C: road-like / vague addresses
  "Ja☆Night": "Ja Night バー 神戸",
  "鮨割烹 やま中": "鮨割烹 やま中 福岡 博多",
  "Le Bois （ル ボア）": "Le Bois ルボア 東京 フレンチ",
  "串焼き 鳥茂": "串焼き 鳥茂 麹町 東京",
  だるまや: "だるまや ラーメン 東京",
  "薬膳火鍋専門店 天香回味 銀座店": "薬膳火鍋専門店 天香回味 銀座店 東京",
  "薬膳火鍋専門店 天香回味 銀座中央通り店": "薬膳火鍋専門店 天香回味 銀座中央通り店 東京",
  わたなべ: "わたなべ 割烹 新宿 東京",
  山﨑: "山﨑 懐石 会席 東京",
  "鮨 和さび": "鮨 和さび 三番町 東京",
  "鮨 おにかい": "鮨 おにかい 虎ノ門ヒルズ",
  "三宿の寿司 えん": "三宿の寿司 えん 池尻大橋",
  はせ川: "はせ川 うなぎ 東京",
  魚徳: "魚徳 うなぎ 埼玉 本町",
  "うなぎ 藤田": "うなぎ 藤田 富士 静岡",
  "うなぎ はし本": "うなぎ はし本 常盤 東京",
  // A: unsplash fallbacks (photo-only if place already ok)
  祇園やまかわ: "祇園やまかわ 京都 バー",
  "ラ・ブリランテ": "ラ・ブリランテ 軽井沢",
  ヤマト: "日本料理 ヤマト 東京 銀座",
  "銀座 維新號": "銀座 維新號 中華",
  こはぜ: "こはぜ 和食 六本木 東京",
  和田: "割烹 和田 東京 日本橋",
  くすのき: "くすのき 天ぷら 東京",
  "こだわりの料理と酒 利き酒家": "利き酒家 日本酒 東京",
  "道後 海舟": "道後 海舟 松山 愛媛 和食",
  "鮨 はし本": "鮨 はし本 神田 寿司",
  "那古野 しば福や 名駅店": "那古野 しば福や 名古屋 名駅",
  "鮨処やまと": "鮨処 やまと 築地 寿司 店内",
};

const INTRO_PATCHES = {
  オステリアドゥエ: "那覇のイタリア料理店。\n沖縄の食材を活かしたコースが人気。",
  藤乃: "大阪・福島の蕎麦と河内鴨割烹。\n食べログそば百名店にも選出。",
  春光園: "大分・臼杵の料亭旅館。\n河豚料理と歴史ある庭園が名物。",
  鰻家: "大阪・西中島南方の地焼きうなぎ。\n食べログうなぎ百名店の名店。",
};

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
          !/google\.com\/maps\/vt|w36-h36|=s32|=s40|profile|avatar|gps-proxy/i.test(x.src) &&
          x.w >= 100 &&
          x.h >= 70,
      );
    imgs.sort((a, b) => b.w * b.h - a.w * b.h);
    return imgs[0]?.src || null;
  });
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
    for (const el of document.querySelectorAll('[data-item-id="address"] .Io6YTe, .Io6YTe.fontBodyMedium')) {
      candidates.push(clean(el.textContent));
    }
    const address =
      candidates.find(
        (a) =>
          /^〒/.test(a) ||
          /(北海道|東京都|京都府|大阪府|(.{2,3}県)).*(市|区|町|村|郡)/.test(a),
      ) || "";
    const url = location.href;
    const coordMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    const lat = coordMatch ? parseFloat(coordMatch[1]) : null;
    const lng = coordMatch ? parseFloat(coordMatch[2]) : null;
    return { lat, lng, address };
  });
}

async function openFirstResult(page, query) {
  const url = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
  await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 2500));
  return page.evaluate(() => {
    const el =
      document.querySelector(".fontHeadlineSmall") ||
      document.querySelector('a[href*="/maps/place/"]');
    if (el) {
      el.click();
      return true;
    }
    return false;
  });
}

async function fetchPlace(page, query) {
  if (!(await openFirstResult(page, query))) return null;
  await new Promise((r) => setTimeout(r, 2200));
  return extractPlace(page);
}

async function fetchPhoto(page, query) {
  if (!(await openFirstResult(page, query))) return null;
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

const placeCache = fs.existsSync(placeCachePath)
  ? JSON.parse(fs.readFileSync(placeCachePath, "utf8"))
  : {};
const photoCache = fs.existsSync(photoCachePath)
  ? JSON.parse(fs.readFileSync(photoCachePath, "utf8"))
  : {};
const introCache = fs.existsSync(introCachePath)
  ? JSON.parse(fs.readFileSync(introCachePath, "utf8"))
  : {};

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--lang=ja-JP", "--window-size=1280,900", "--no-sandbox"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });

const results = { placeOk: [], placeSkip: [], photoOk: [], photoSkip: [] };

for (const [name, query] of Object.entries(REPAIRS)) {
  if (doPlaces) {
    process.stderr.write(`place ${name} … `);
    try {
      const result = await fetchPlace(page, query);
      if (result?.address || result?.lat) {
        placeCache[name] = {
          address: result.address || placeCache[name]?.address || "",
          lat: result.lat ?? placeCache[name]?.lat ?? null,
          lng: result.lng ?? placeCache[name]?.lng ?? null,
          query,
        };
        fs.writeFileSync(placeCachePath, JSON.stringify(placeCache, null, 2));
        results.placeOk.push(name);
        process.stderr.write("OK\n");
      } else {
        results.placeSkip.push(name);
        process.stderr.write("skip\n");
      }
    } catch (e) {
      results.placeSkip.push(name);
      process.stderr.write(`err ${e.message}\n`);
    }
    await new Promise((r) => setTimeout(r, 800));
  }

  if (doPhotos) {
    if (!force && photoCache[name] && !/gps-proxy|unsplash/.test(photoCache[name])) {
      continue;
    }
    process.stderr.write(`photo ${name} … `);
    try {
      const photo = await fetchPhoto(page, query);
      if (photo) {
        photoCache[name] = photo;
        fs.writeFileSync(photoCachePath, JSON.stringify(photoCache, null, 2));
        results.photoOk.push(name);
        process.stderr.write("OK\n");
      } else {
        results.photoSkip.push(name);
        process.stderr.write("skip\n");
      }
    } catch (e) {
      results.photoSkip.push(name);
      process.stderr.write(`err ${e.message}\n`);
    }
    await new Promise((r) => setTimeout(r, 800));
  }
}

for (const [name, intro] of Object.entries(INTRO_PATCHES)) {
  introCache[name] = {
    ...(introCache[name] || {}),
    intro,
    source: "manual_repair",
    generatedAt: new Date().toISOString().slice(0, 10),
  };
}
fs.writeFileSync(introCachePath, JSON.stringify(introCache, null, 2));

await browser.close();
console.log(JSON.stringify(results, null, 2));
