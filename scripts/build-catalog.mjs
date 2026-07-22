// Build src/lib/generated-restaurants.ts from data/lists/*.json (scraped Google Maps lists).
// Run: node scripts/build-catalog.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const listsDir = path.join(root, "data", "lists");
const outFile = path.join(root, "src", "lib", "generated-restaurants.ts");

// ---- Mapping helpers -------------------------------------------------

// Google category (日本語) -> app cuisine
function toCuisine(category, name, listName) {
  const c = (category || "") + " " + (name || "");
  if (/(寿司|鮨|すし|鮓)/.test(c)) return "鮨";
  if (/(焼肉|ステーキ|鉄板|肉|ホルモン|しゃぶ|すき焼)/.test(c)) return "肉";
  if (/(イタリア|パスタ|ピッツァ|ピザ|トラットリア|オステリア)/.test(c)) return "イタリアン";
  if (/(フランス|フレンチ|ビストロ|ブラッスリー)/.test(c)) return "フレンチ";
  if (/(中華|中国|四川|広東|餃子|担々)/.test(c)) return "その他";
  if (/(和食|日本料理|割烹|懐石|会席|うなぎ|鰻|ふぐ|天ぷら|天麩羅|そば|蕎麦|居酒屋|酒場|おでん|串|寿|料亭|海鮮|魚|純和食)/.test(c))
    return "和食";
  // fall back to list name hints
  if (/鮨|寿司/.test(listName)) return "鮨";
  if (/肉/.test(listName)) return "肉";
  if (/和食/.test(listName)) return "和食";
  return "和食";
}

// Determine price tier from list name + category + rating
function toPriceTier(listName, category, rating) {
  if (/middle|ミドル/i.test(listName)) return "middle";
  if (/executive|エグゼ|高級/i.test(listName)) return "executive";
  if (/コスパ|安い|value/i.test(listName)) return "casual";
  const c = category || "";
  if (/(割烹|懐石|会席|日本料理|フランス|フレンチ|鮨|寿司|料亭)/.test(c)) {
    return rating >= 4.6 ? "executive" : "middle";
  }
  if (/(居酒屋|酒場|食堂|ラーメン|定食|大衆)/.test(c)) return "casual";
  return "middle";
}

// Scenes from list name + attributes
function toScenes(listName, category, rating, priceTier) {
  const s = new Set();
  if (/会食|接待|zenkigen/i.test(listName)) s.add("会食");
  if (/コスパ|安い/.test(listName)) s.add("コスパ");
  if (/行ってみたい|とっておき/.test(listName)) s.add("とっておき");
  if (/記念日|アニバーサリー/.test(listName)) s.add("記念日");
  if (/デート/.test(listName)) s.add("デート");
  if (/個室/.test(listName)) s.add("個室");

  const c = category || "";
  if (/(割烹|懐石|会席|日本料理|フレンチ|フランス)/.test(c)) s.add("会食");
  if (/(居酒屋|酒場|大衆|食堂)/.test(c)) s.add("カジュアル");
  if (priceTier === "executive") {
    s.add("とっておき");
    if (rating >= 4.7) s.add("記念日");
  }
  if (priceTier === "casual") s.add("カジュアル");
  if (rating >= 4.6) s.add("接待");
  if (s.size === 0) s.add("会食");
  return [...s];
}

// Area detection from place name keyword (Tokyo wards + others) with centroid coords
const AREA_COORDS = {
  銀座: { area: "銀座", lat: 35.6717, lng: 139.7649 },
  西麻布: { area: "六本木", lat: 35.6588, lng: 139.7255 },
  麻布: { area: "六本木", lat: 35.6565, lng: 139.7352 },
  六本木: { area: "六本木", lat: 35.6627, lng: 139.7314 },
  赤坂: { area: "東京", lat: 35.6745, lng: 139.7366 },
  青山: { area: "東京", lat: 35.6656, lng: 139.7127 },
  恵比寿: { area: "渋谷", lat: 35.6467, lng: 139.71 },
  代々木上原: { area: "渋谷", lat: 35.6693, lng: 139.6803 },
  渋谷: { area: "渋谷", lat: 35.6612, lng: 139.6988 },
  新宿: { area: "新宿", lat: 35.6895, lng: 139.7005 },
  荒木町: { area: "新宿", lat: 35.6879, lng: 139.7205 },
  日本橋: { area: "東京", lat: 35.6812, lng: 139.7745 },
  八重洲: { area: "東京", lat: 35.6796, lng: 139.7695 },
  神田: { area: "東京", lat: 35.6918, lng: 139.7709 },
  築地: { area: "築地", lat: 35.6654, lng: 139.7707 },
  京都: { area: "京都", lat: 35.0116, lng: 135.7681 },
  祇園: { area: "京都", lat: 35.0037, lng: 135.7788 },
};

function detectArea(name, listName) {
  for (const key of Object.keys(AREA_COORDS)) {
    if (name.includes(key)) return AREA_COORDS[key];
  }
  if (/京都/.test(listName)) return AREA_COORDS["京都"];
  if (/築地/.test(listName)) return AREA_COORDS["築地"];
  if (/地方|名店/.test(listName)) return { area: "地方", lat: 36.2048, lng: 138.2529 };
  if (/ロサンゼルス|la\b/i.test(listName)) return { area: "ロサンゼルス", lat: 34.05, lng: -118.25 };
  return { area: "東京", lat: 35.6812, lng: 139.7671 };
}

// deterministic jitter so pins don't overlap
function jitter(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) & 0xffff;
  return ((h % 200) - 100) / 12000; // ~ +-0.008 deg
}

const CUISINE_IMG = {
  和食: [
    "photo-1553621042-f6e147245754",
    "photo-1580822184713-fc5400e7fe10",
    "photo-1569058242567-93de6f36f8eb",
    "photo-1607301405390-d831c242f59b",
    "photo-1519690889869-e705e59f72e1",
  ],
  鮨: [
    "photo-1579584425555-c3ce17fd4351",
    "photo-1611143669185-af224c5e3252",
    "photo-1583623025817-d180a2225852",
    "photo-1617196034796-73dfa7b1fd56",
  ],
  肉: [
    "photo-1600891964092-4316c288032e",
    "photo-1544025162-d76694265947",
    "photo-1529193591184-b1d58069ecdd",
    "photo-1558030006-450675393462",
  ],
  イタリアン: [
    "photo-1414235077428-338989a2e8c0",
    "photo-1473093295043-cdd812d0e601",
    "photo-1555396273-367ea4eb4db5",
    "photo-1559339352-11d035aa65de",
  ],
  フレンチ: [
    "photo-1600891964599-f61ba0e24092",
    "photo-1414235077428-338989a2e8c0",
    "photo-1546833999-b9f581a1996d",
  ],
  その他: [
    "photo-1525755662778-989d0524087e",
    "photo-1552566626-52f8b828add9",
    "photo-1504674900247-0877df9cc836",
  ],
};

function pickImage(cuisine, seed) {
  const arr = CUISINE_IMG[cuisine] || CUISINE_IMG["和食"];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) & 0xffff;
  return arr[h % arr.length];
}

function slugify(name, i) {
  const base = name
    .toLowerCase()
    .replace(/[\s　]+/g, "-")
    .replace(/[^\p{L}\p{N}-]/gu, "")
    .slice(0, 40);
  return `${base || "place"}-${i}`;
}

function priceGuess(tier) {
  if (tier === "executive") return "¥20,000〜";
  if (tier === "middle") return "¥10,000〜";
  return "¥5,000〜";
}

// ---- Build -----------------------------------------------------------

const files = fs
  .readdirSync(listsDir)
  .filter((f) => f.endsWith(".json"));

const byName = new Map(); // dedupe by restaurant name, merge lists/scenes
let counter = 0;

for (const file of files) {
  const raw = JSON.parse(fs.readFileSync(path.join(listsDir, file), "utf8"));
  const listName = raw.list || file.replace(/\.json$/, "");
  for (const p of raw.places) {
    const name = p.name.trim();
    if (!name) continue;
    const category = (p.info && p.info.find((x) => !/^[0-9.]+$/.test(x))) || p.cardTextCategory || guessCategoryFromText(p.cardText, name);
    const rating = typeof p.rating === "number" ? p.rating : 4.3;
    const cuisine = toCuisine(category, name, listName);
    const priceTier = toPriceTier(listName, category, rating);
    const scenes = toScenes(listName, category, rating, priceTier);
    const areaInfo = detectArea(name, listName);

    if (byName.has(name)) {
      const ex = byName.get(name);
      ex.scenes = [...new Set([...ex.scenes, ...scenes])];
      ex.listSources = [...new Set([...ex.listSources, listName])];
      continue;
    }

    counter += 1;
    const lat = areaInfo.lat + jitter(name);
    const lng = areaInfo.lng + jitter(name + "x");
    const query = `${name} ${areaInfo.area === "地方" || areaInfo.area === "ロサンゼルス" ? "" : areaInfo.area}`.trim();
    byName.set(name, {
      id: slugify(name, counter),
      name,
      cuisine,
      category: category || "",
      priceTier,
      priceDinner: priceGuess(priceTier),
      scenes,
      area: areaInfo.area,
      address:
        areaInfo.area === "地方"
          ? "地方"
          : areaInfo.area === "ロサンゼルス"
            ? "Los Angeles, CA"
            : areaInfo.area === "京都"
              ? "京都府（周辺）"
              : `東京都（${areaInfo.area}周辺）`,
      nearestStation: "",
      lat,
      lng,
      googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`,
      googlePlaceQuery: query,
      image: `https://images.unsplash.com/${pickImage(cuisine, name)}?w=800&q=80`,
      rating,
      reviewCount: 0,
      tags: [category].filter(Boolean),
      description: `${category || cuisine}。Googleマップの「${listName}」より。`,
      privateRoom: /個室|割烹|懐石|日本料理/.test((category || "") + listName),
      listSources: [listName],
    });
  }
}

function guessCategoryFromText(text, name) {
  if (!text) return "";
  const t = text.replace(name, "").replace(/[0-9.]+/g, "").trim();
  return t.split(" ").filter(Boolean)[0] || "";
}

const restaurants = [...byName.values()].map((r) => ({
  ...r,
  listSource: r.listSources.join(" / "),
}));

const header = `// AUTO-GENERATED by scripts/build-catalog.mjs — do not edit by hand.
// Source: data/lists/*.json (scraped from Hibiki's Google Maps saved lists).
import type { Restaurant } from "./types";

export const generatedRestaurants: Restaurant[] = ${JSON.stringify(
  restaurants.map(({ listSources, category, ...r }) => r),
  null,
  2,
)};
`;

fs.writeFileSync(outFile, header);
console.log(`Wrote ${restaurants.length} restaurants -> ${path.relative(root, outFile)}`);
