// Audit generated catalog for place/photo/map mismatches.
// Usage: node scripts/audit-catalog.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const deployRoot = fs.existsSync(path.resolve(__dirname, "../../../hibilog/data/lists"))
  ? path.resolve(__dirname, "../../../hibilog")
  : root;

const catalogPath = path.join(root, "src/lib/generated-restaurants.ts");
const placeCachePath = path.join(deployRoot, "data/place-cache.json");
const photoCachePath = path.join(deployRoot, "data/photo-cache.json");

const PREF_BOUNDS = {
  北海道: { lat: [41.2, 45.6], lng: [139.2, 145.9] },
  青森: { lat: [40.2, 41.6], lng: [139.5, 141.7] },
  岩手: { lat: [38.9, 40.5], lng: [140.6, 142.1] },
  宮城: { lat: [37.8, 39.0], lng: [140.3, 141.7] },
  秋田: { lat: [39.0, 40.6], lng: [139.6, 140.9] },
  山形: { lat: [37.7, 39.2], lng: [139.5, 140.6] },
  福島: { lat: [36.8, 38.1], lng: [139.2, 141.1] },
  茨城: { lat: [35.7, 36.9], lng: [139.6, 140.9] },
  栃木: { lat: [36.2, 37.2], lng: [139.2, 140.2] },
  群馬: { lat: [36.0, 37.0], lng: [138.4, 139.6] },
  埼玉: { lat: [35.7, 36.3], lng: [138.9, 139.9] },
  千葉: { lat: [34.9, 35.9], lng: [139.7, 140.9] },
  東京: { lat: [35.5, 35.9], lng: [139.4, 139.95] },
  神奈川: { lat: [35.1, 35.7], lng: [138.9, 139.8] },
  新潟: { lat: [36.8, 38.6], lng: [137.6, 139.9] },
  富山: { lat: [36.4, 36.9], lng: [136.7, 137.8] },
  石川: { lat: [36.0, 37.4], lng: [136.2, 137.4] },
  福井: { lat: [35.4, 36.3], lng: [135.8, 136.9] },
  山梨: { lat: [35.2, 35.9], lng: [138.2, 139.1] },
  長野: { lat: [35.2, 37.1], lng: [137.3, 138.9] },
  岐阜: { lat: [35.3, 36.4], lng: [136.5, 137.8] },
  静岡: { lat: [34.6, 35.5], lng: [137.5, 139.2] },
  愛知: { lat: [34.5, 35.5], lng: [136.7, 137.8] },
  三重: { lat: [33.7, 35.0], lng: [135.8, 136.9] },
  滋賀: { lat: [34.8, 35.7], lng: [135.8, 136.4] },
  京都: { lat: [34.8, 35.8], lng: [135.0, 135.9] },
  大阪: { lat: [34.3, 35.0], lng: [135.3, 135.8] },
  兵庫: { lat: [34.3, 35.7], lng: [134.3, 135.5] },
  奈良: { lat: [33.9, 34.8], lng: [135.6, 136.2] },
  和歌山: { lat: [33.4, 34.4], lng: [135.0, 136.0] },
  鳥取: { lat: [35.2, 35.7], lng: [133.2, 134.4] },
  島根: { lat: [34.3, 36.3], lng: [131.8, 133.5] },
  岡山: { lat: [34.3, 35.3], lng: [133.2, 134.4] },
  広島: { lat: [34.0, 35.0], lng: [132.0, 133.5] },
  山口: { lat: [33.7, 34.6], lng: [130.8, 132.2] },
  徳島: { lat: [33.6, 34.4], lng: [133.5, 134.8] },
  香川: { lat: [34.0, 34.5], lng: [133.5, 134.5] },
  愛媛: { lat: [32.9, 34.3], lng: [132.0, 133.5] },
  高知: { lat: [32.7, 33.8], lng: [132.5, 134.2] },
  福岡: { lat: [33.0, 33.9], lng: [130.0, 131.2] },
  佐賀: { lat: [33.0, 33.6], lng: [129.8, 130.5] },
  長崎: { lat: [32.6, 34.7], lng: [128.8, 130.4] },
  熊本: { lat: [32.2, 33.4], lng: [130.0, 131.2] },
  大分: { lat: [32.7, 33.6], lng: [131.0, 132.2] },
  宮崎: { lat: [31.4, 32.8], lng: [130.7, 131.9] },
  鹿児島: { lat: [30.5, 32.3], lng: [129.5, 131.5] },
  沖縄: { lat: [24.0, 28.0], lng: [122.9, 131.4] },
};

function prefectureFromAddress(address) {
  if (!address) return null;
  const m = address.match(/(北海道|東京都|京都府|大阪府|(.{2,3}県))/);
  if (!m) return null;
  if (m[1] === "東京都") return "東京";
  if (m[1] === "京都府") return "京都";
  if (m[1] === "大阪府") return "大阪";
  if (m[1] === "北海道") return "北海道";
  return m[2]?.replace(/県$/, "") || null;
}

function coordsMatchPrefecture(lat, lng, pref) {
  if (!pref || typeof lat !== "number" || typeof lng !== "number") return true;
  const b = PREF_BOUNDS[pref];
  if (!b) return true;
  return lat >= b.lat[0] && lat <= b.lat[1] && lng >= b.lng[0] && lng <= b.lng[1];
}

function loadRestaurants() {
  const src = fs.readFileSync(catalogPath, "utf8");
  const m = src.match(/export const generatedRestaurants: Restaurant\[\] = (\[[\s\S]*?\]);/);
  if (!m) throw new Error("Could not parse generated-restaurants.ts");
  return JSON.parse(m[1]);
}

const restaurants = loadRestaurants();
const photoCache = fs.existsSync(photoCachePath)
  ? JSON.parse(fs.readFileSync(photoCachePath, "utf8"))
  : {};
const placeCache = fs.existsSync(placeCachePath)
  ? JSON.parse(fs.readFileSync(placeCachePath, "utf8"))
  : {};

const photoByUrl = new Map();
for (const [name, url] of Object.entries(photoCache)) {
  if (!url || url.startsWith("/media/")) continue;
  if (!photoByUrl.has(url)) photoByUrl.set(url, []);
  photoByUrl.get(url).push(name);
}

const issues = {
  coordMismatch: [],
  vagueQuery: [],
  badAddress: [],
  unsplashFallback: [],
  sharedPhoto: [],
  areaMismatch: [],
  cuisineMismatch: [],
  sushiIntroMismatch: [],
};

function guessCategoryFromText(text, name) {
  if (!text) return "";
  const t = text.replace(name, "").replace(/[0-9.]+/g, "").trim();
  return t.split(" ").filter(Boolean)[0] || "";
}

function toCuisine(category, name, listName) {
  const cat = category || "";
  if (/すき焼|しゃぶしゃぶ|焼肉|ステーキ|肉料理|鉄板|ホルモン|しゃぶ/.test(cat)) return "肉";
  if (/和食店|日本料理|割烹|懐石|会席|料亭|海鮮|居酒屋|小料理|純和食/.test(cat)) {
    if (listName === "鮨" && /(寿司|鮨|すし|鮓)/.test(name)) return "鮨";
    return "和食";
  }
  const c = cat + " " + (name || "");
  if (/(寿司|鮨|すし|鮓)/.test(c)) return "鮨";
  if (/(焼肉|ステーキ|鉄板|肉|ホルモン|しゃぶ|すき焼)/.test(c)) return "肉";
  if (/(イタリア|パスタ|ピッツァ|ピザ|トラットリア|オステリア)/.test(c)) return "イタリアン";
  if (/(フランス|フレンチ|ビストロ|ブラッスリー)/.test(c)) return "フレンチ";
  if (/(中華|中国|四川|広東|餃子|担々)/.test(c)) return "その他";
  if (/(和食|日本料理|割烹|懐石|会席|うなぎ|鰻|ふぐ|天ぷら|天麩羅|そば|蕎麦|居酒屋|酒場|おでん|串|寿|料亭|海鮮|魚|純和食)/.test(c))
    return "和食";
  if (/鮨|寿司/.test(listName)) return "鮨";
  if (/肉/.test(listName)) return "肉";
  if (/和食|十割そば|焼き鳥|鰻|日本酒/.test(listName)) return "和食";
  if (/イタリアン/.test(listName)) return "イタリアン";
  if (/フレンチ/.test(listName)) return "フレンチ";
  if (/中華/.test(listName)) return "その他";
  return "和食";
}

function refineCuisine(name, category, cuisine) {
  const blob = `${name} ${category || ""}`;
  if (/MAKINONC|マキノンチ/i.test(name)) return "フレンチ";
  if (name === "レヴォ" || /L'?[eé]vo/i.test(name)) return "フレンチ";
  if (name === "カスク" || /^CASK/i.test(name)) return "その他";
  if (/^(Bar |Cafe\/Bar|Ｂａｒ )/i.test(name)) return "その他";
  if (/バー$|ワインクラブ|ワインショップ|Wine Bar|シガー倶楽部/i.test(blob)) {
    if (cuisine === "和食") return "その他";
  }
  if (/イノベーティブ|創作料理/.test(category) && cuisine === "和食") return "フレンチ";
  return cuisine;
}

function expectedCuisine(category, name, listName) {
  let c = refineCuisine(name, category, toCuisine(category, name, listName));
  const override = overrides.places?.[name]?.cuisine;
  if (override) c = override;
  return c;
}

const overrides = fs.existsSync(path.join(deployRoot, "data/catalog-overrides.json"))
  ? JSON.parse(fs.readFileSync(path.join(deployRoot, "data/catalog-overrides.json"), "utf8"))
  : { places: {} };
const introCache = fs.existsSync(path.join(deployRoot, "data/intro-cache.json"))
  ? JSON.parse(fs.readFileSync(path.join(deployRoot, "data/intro-cache.json"), "utf8"))
  : {};
const listsDir = path.join(deployRoot, "data/lists");
const listEntries = new Map();
for (const file of fs.readdirSync(listsDir).filter((f) => f.endsWith(".json"))) {
  const raw = JSON.parse(fs.readFileSync(path.join(listsDir, file), "utf8"));
  const listName = raw.list || file.replace(/\.json$/, "");
  for (const p of raw.places || []) {
    const name = p.name?.trim();
    if (!name) continue;
    const category = guessCategoryFromText(p.cardText, name);
    listEntries.set(name, { category, listName, cardText: p.cardText });
  }
}

for (const r of restaurants) {
  const pref = prefectureFromAddress(r.address);
  if (pref && !coordsMatchPrefecture(r.lat, r.lng, pref)) {
    issues.coordMismatch.push({
      name: r.name,
      id: r.id,
      address: r.address,
      lat: r.lat,
      lng: r.lng,
      pref,
      query: r.googlePlaceQuery,
    });
  }

  const q = r.googlePlaceQuery || "";
  const vague =
    q === r.name ||
    q.endsWith(" 日本") ||
    (!/\s/.test(q) && q.length <= 6) ||
    (q.split(/\s+/).length === 1 && !/[都道府県市区]/.test(q));
  if (vague) {
    issues.vagueQuery.push({ name: r.name, id: r.id, query: q, tags: r.tags, listSource: r.listSource });
  }

  if (!r.address || !/^〒/.test(r.address)) {
    issues.badAddress.push({ name: r.name, id: r.id, address: r.address || "(empty)" });
  } else if (/線$|通り$|交差点|駅前$/.test(r.address) && !/\d/.test(r.address.slice(-8))) {
    issues.badAddress.push({ name: r.name, id: r.id, address: r.address, reason: "road-like" });
  }

  if (/images\.unsplash\.com/.test(r.image)) {
    issues.unsplashFallback.push({ name: r.name, id: r.id, tags: r.tags, listSource: r.listSource });
  }

  const url = photoCache[r.name];
  if (url && photoByUrl.get(url)?.length > 1) {
    issues.sharedPhoto.push({
      name: r.name,
      id: r.id,
      sharedWith: photoByUrl.get(url).filter((n) => n !== r.name),
      url: url.slice(0, 80),
    });
  }

  const addrAreaHints = [
    [/大阪府|大阪市/, "大阪"],
    [/京都府|京都市/, "京都"],
    [/福岡|博多/, "福岡"],
    [/千葉県/, "千葉"],
    [/神奈川/, "神奈川"],
    [/愛知|名古屋/, "名古屋"],
    [/北海道/, "北海道"],
    [/沖縄/, "沖縄"],
    [/富山/, "富山"],
    [/佐賀/, "佐賀"],
    [/島根/, "島根"],
    [/広島/, "広島"],
    [/長崎/, "長崎"],
    [/大分/, "大分"],
  ];
  for (const [re, expectedArea] of addrAreaHints) {
    if (re.test(r.address) && r.area === "東京" && !/東京/.test(r.address)) {
      issues.areaMismatch.push({
        name: r.name,
        id: r.id,
        address: r.address,
        area: r.area,
        expected: expectedArea,
      });
      break;
    }
  }

  const src = listEntries.get(r.name);
  if (src) {
    const expected = expectedCuisine(src.category, r.name, src.listName);
    if (expected !== r.cuisine) {
      issues.cuisineMismatch.push({
        name: r.name,
        id: r.id,
        actual: r.cuisine,
        expected,
        category: src.category,
        listName: src.listName,
        cardText: src.cardText,
      });
    }
  }

  const intro = introCache[r.name]?.intro || "";
  if (r.cuisine !== "鮨" && /シャリ|握り一貫/.test(intro)) {
    issues.sushiIntroMismatch.push({
      name: r.name,
      id: r.id,
      cuisine: r.cuisine,
      tags: r.tags,
      snippet: intro.split("\n")[1]?.slice(0, 60),
    });
  }
}

const summary = Object.fromEntries(
  Object.entries(issues).map(([k, v]) => [k, v.length]),
);

console.log(JSON.stringify({ total: restaurants.length, summary, issues }, null, 2));
