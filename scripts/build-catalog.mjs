// Build src/lib/generated-restaurants.ts from data/lists/*.json (scraped Google Maps lists).
// Run: node scripts/build-catalog.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const deployRoot = fs.existsSync(path.resolve(__dirname, "../../../hibilog/data/lists"))
  ? path.resolve(__dirname, "../../../hibilog")
  : root;
const listsDir = path.join(deployRoot, "data", "lists");
const photoCachePath = path.join(deployRoot, "data", "photo-cache.json");
const placeCachePath = path.join(deployRoot, "data", "place-cache.json");
const attributesCachePath = path.join(deployRoot, "data", "place-attributes-cache.json");
const overridesPath = path.join(deployRoot, "data", "catalog-overrides.json");
const outFile = path.join(root, "src", "lib", "generated-restaurants.ts");

const overrides = fs.existsSync(overridesPath)
  ? JSON.parse(fs.readFileSync(overridesPath, "utf8"))
  : { excludeNames: [], places: {}, photos: {} };
const excludeNames = new Set(overrides.excludeNames || []);

// ---- Mapping helpers -------------------------------------------------

function listNameSpecialty(listName) {
  if (/鮨|寿司/.test(listName)) return "鮨";
  if (/肉/.test(listName)) return "肉";
  if (/十割そば|焼き鳥|鰻/.test(listName)) return "その他";
  if (/和食|日本酒/.test(listName)) return "和食";
  if (/イタリアン/.test(listName)) return "イタリアン";
  if (/フレンチ/.test(listName)) return "フレンチ";
  if (/中華/.test(listName)) return "その他";
  return null;
}

function matchesWashokuSubGenre(blob) {
  if (/(うなぎ|鰻|Unagi)/i.test(blob)) return true;
  if (/(焼き鳥|焼鳥|やきとり|鳥料理|串焼き|せせり|yakitori)/i.test(blob)) return true;
  if (/(そば|蕎麦|ラーメン|らーめん|麺|うどん|中華そば|沖縄そば|沖縄|Soba|soba|ramen)/i.test(blob)) return true;
  return false;
}

/** Tags/description/category → primary cuisine (null if unknown). */
function inferCuisineFromBlob(blob) {
  if (matchesWashokuSubGenre(blob)) return "その他";
  if (/(イタリア|パスタ|ピッツァ|ピザ|トラットリア|オステリア)/i.test(blob)) return "イタリアン";
  if (/(フランス|フレンチ|ビストロ|ブラッスリー)/i.test(blob)) return "フレンチ";
  if (/(中華|中国|四川|広東|餃子|担々|台湾料理)/i.test(blob)) return "その他";
  if (
    /(スペイン|Spanish|tapas|韓国|Korean|洋食|ヨーロッパ|とんかつ|ベトナム|タイ料理|インド|メキシコ|カレー屋|ハンバーガー|ピザ)/i.test(
      blob,
    )
  ) {
    return "その他";
  }
  if (/(バー$|バー |Bar |Ｂａｒ |カフェ|喫茶|ベーカリー|ワインバー|pub|Pub)/i.test(blob)) {
    return "その他";
  }
  if (/(和食|日本料理|割烹|懐石|会席|料亭|海鮮|ふぐ|天ぷら|天麩羅|純和食|小料理|居酒屋|酒場)/.test(blob)) {
    return "和食";
  }
  return null;
}

// Google category (日本語) -> app cuisine
function toCuisine(category, name, listName) {
  const cat = category || "";
  const c = cat + " " + (name || "");
  const fromList = listNameSpecialty(listName);
  // Specialty shops: primary cuisine その他, browse sub-genre via tags/name
  if (/ラーメン|らーめん|つけ麺|油そば|中華そば|まぜそば|ラーメン屋/.test(c)) return "その他";
  if (/蕎麦|そば|うどん|麺類|沖縄そば|手打|Soba|soba|ramen/i.test(c)) return "その他";
  if (/焼鳥|焼き鳥|やきとり|鳥料理|串焼き|焼鳥店/.test(c)) return "その他";
  if (/うなぎ|鰻|うなぎ店|鰻店/.test(c)) return "その他";
  if (fromList) return fromList;
  // Explicit scraped category wins over name keywords
  if (/すき焼|しゃぶしゃぶ|焼肉|ステーキ|肉料理|鉄板|ホルモン|しゃぶ/.test(cat)) return "肉";
  if (/和食店|日本料理|割烹|懐石|会席|料亭|海鮮|居酒屋|小料理|純和食/.test(cat)) {
    // 鮨専用リスト + 店名が寿司系 → 和食店ラベルより鮨を優先（鮨かみなりのような和食リスト例外は listName で区別）
    if (listName === "鮨" && /(寿司|鮨|すし|鮓)/.test(name)) return "鮨";
    return "和食";
  }
  if (/(寿司|鮨|すし|鮓)/.test(c)) return "鮨";
  if (/(焼肉|ステーキ|鉄板|肉|ホルモン|しゃぶ|すき焼)/.test(c)) return "肉";
  if (/(イタリア|パスタ|ピッツァ|ピザ|トラットリア|オステリア)/.test(c)) return "イタリアン";
  if (/(フランス|フレンチ|ビストロ|ブラッスリー)/.test(c)) return "フレンチ";
  if (/(中華|中国|四川|広東|餃子|担々|台湾)/.test(c)) return "その他";
  if (
    /(スペイン|Spanish|tapas|韓国|Korean|洋食|ヨーロッパ|とんかつ|ベトナム|タイ料理|インド|メキシコ|カレー)/i.test(
      c,
    )
  ) {
    return "その他";
  }
  if (/(バー$|バー |Bar |カフェ|喫茶|ベーカリー|定食屋|食堂$)/i.test(c)) return "その他";
  if (/(和食|日本料理|割烹|懐石|会席|ふぐ|天ぷら|天麩羅|居酒屋|酒場|おでん|寿|料亭|海鮮|魚|純和食)/.test(c))
    return "和食";
  const inferred = inferCuisineFromBlob(c);
  if (inferred) return inferred;
  return listNameSpecialty(listName) || "その他";
}

// Determine price tier from list name + category + rating
function toPriceTier(listName, category, rating) {
  if (/会食low|low/i.test(listName)) return "casual";
  if (/会食middle|middle|ミドル/i.test(listName)) return "middle";
  if (/会食exective|executive|エグゼ/i.test(listName)) return "executive";
  if (/コスパ|安い|value/i.test(listName)) return "casual";
  if (/ビブグルマン/.test(listName)) return rating >= 4.5 ? "middle" : "casual";
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
  if (/コスパ|安い|会食low/.test(listName)) s.add("コスパ");
  if (/行ってみたい|とっておき/.test(listName)) s.add("とっておき");
  if (/記念日|アニバーサリー/.test(listName)) s.add("記念日");

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
  京都: { area: "京都", lat: 35.0116, lng: 135.7681 },
  祇園: { area: "京都", lat: 35.0037, lng: 135.7788 },
  北新地: { area: "大阪", lat: 34.6972, lng: 135.5002 },
  茅ヶ崎: { area: "神奈川", lat: 35.3192, lng: 139.4043 },
  鎌倉: { area: "神奈川", lat: 35.3192, lng: 139.5503 },
};

function detectArea(name, listName) {
  for (const key of Object.keys(AREA_COORDS)) {
    if (name.includes(key)) return AREA_COORDS[key];
  }
  if (/京都/.test(listName)) return AREA_COORDS["京都"];
  if (/茅ヶ崎|鎌倉/.test(listName)) return { area: "神奈川", lat: 35.3192, lng: 139.45 };
  if (/地方/.test(listName)) {
    return { area: "地方", lat: 35.6812, lng: 139.7671 };
  }
  return { area: "東京", lat: 35.6812, lng: 139.7671 };
}

function inferLocationHint(name) {
  const patterns = [
    [/富山/, "富山"],
    [/金沢/, "金沢"],
    [/函館|小樽|札幌|北海道/, "北海道"],
    [/福岡|博多/, "福岡"],
    [/大阪|心斎橋|梅田|北区|北新地|曾根崎/, "大阪"],
    [/京都|祇園/, "京都"],
    [/名古屋|栄/, "名古屋"],
    [/広島/, "広島"],
    [/仙台/, "仙台"],
    [/長崎/, "長崎"],
    [/鹿児島/, "鹿児島"],
    [/沖縄|那覇/, "沖縄"],
    [/高松|香川/, "香川"],
    [/松山|道後/, "愛媛"],
    [/勝どき|銀座|麻布|六本木|渋谷|新宿|恵比寿|日本橋|品川|表参道|青山|赤坂|上野|池袋|八重洲|神田|大手町|西麻布|東麻布/, "東京"],
    [/横浜|鎌倉|茅ヶ崎|神奈川/, "神奈川"],
    [/佐賀|祐徳/, "佐賀"],
  ];
  for (const [re, hint] of patterns) {
    if (re.test(name)) return hint;
  }
  return "";
}

function inferAreaFromAddress(address) {
  if (!address) return "地方";
  if (/北新地|曾根崎|大阪府|大阪市/.test(address)) return "大阪";
  if (/福岡市|福岡県/.test(address)) return "福岡";
  if (/神戸市|兵庫県/.test(address)) return "神戸";
  if (/名古屋|愛知県/.test(address)) return "名古屋";
  if (/広島/.test(address)) return "広島";
  if (/仙台|宮城/.test(address)) return "仙台";
  if (/札幌|北海道/.test(address)) return "北海道";
  if (/京都府|京都市|祇園/.test(address)) return "京都";
  if (/神奈川|横浜|鎌倉|茅ヶ崎/.test(address)) return "神奈川";
  if (/東京都/.test(address) || /^(台東区|港区|渋谷区|中央区|新宿区|千代田区|目黒区|品川区|大田区|世田谷区|杉並区|豊島区|墨田区|江東区|文京区|中野区|板橋区|練馬区|足立区|葛飾区|江戸川区)/.test(address)) {
    if (/虎ノ門|虎の門/.test(address)) return "虎ノ門";
    if (/銀座/.test(address)) return "銀座";
    if (/日本橋|人形町|蛎殻町|小伝馬町|茅場町|浜町/.test(address)) return "東京";
    if (/六本木|麻布|港区|西麻布|東麻布|赤坂|青山|表参道/.test(address)) {
      if (/西麻布/.test(address)) return "西麻布";
      return "六本木";
    }
    if (/渋谷|恵比寿|代々木|代官山/.test(address)) return "渋谷";
    if (/新宿|代々木/.test(address)) return "新宿";
    if (/浅草|上野|台東区/.test(address)) return "東京";
    return "東京";
  }
  const pref = prefectureFromAddress(address);
  if (pref) return pref;
  return "地方";
}

function listLocationHint(listName) {
  if (/京都/.test(listName)) return "京都";
  if (/茅ヶ崎|鎌倉/.test(listName)) return "神奈川";
  if (/東京/.test(listName)) return "東京";
  if (/地方/.test(listName)) return "日本";
  return "";
}

function categoryHint(listName, category) {
  const blob = `${listName} ${category || ""}`;
  if (/鰻/.test(blob) || /うなぎ/.test(blob)) return "うなぎ";
  if (/鮨|寿司/.test(blob)) return "鮨";
  if (/焼肉|肉/.test(blob)) return "焼肉";
  if (/焼き鳥/.test(blob)) return "焼き鳥";
  if (/蕎麦|そば|十割/.test(blob)) return "蕎麦";
  if (/フレンチ|イタリアン/.test(blob)) return "";
  return "レストラン";
}

function buildPlaceQuery(name, listName, area, category) {
  const hint = inferLocationHint(name);
  if (hint) {
    const cat = categoryHint(listName, category);
    return cat ? `${name} ${cat} ${hint}`.trim() : `${name} ${hint}`.trim();
  }
  const listHint = listLocationHint(listName);
  if (listHint && listHint !== "日本") {
    const cat = categoryHint(listName, category);
    return cat ? `${name} ${cat} ${listHint}`.trim() : `${name} ${listHint}`.trim();
  }
  if (area && area !== "地方") return `${name} ${area}`.trim();
  const cat = categoryHint(listName, category);
  return cat ? `${name} ${cat}`.trim() : name;
}

function formatFallbackAddress(area) {
  if (area === "京都") return "京都府（周辺）";
  if (area === "神奈川") return "神奈川県（周辺）";
  if (area === "地方") return "";
  return `東京都（${area}周辺）`;
}

function isValidName(name, category, cardText) {
  const allowShort = new Set(["瞬", ...(overrides.allowShortNames || [])]);
  if (!name || (name.length < 2 && !allowShort.has(name))) return false;
  if (excludeNames.has(name)) return false;
  if (/^〒/.test(name)) return false;
  if (/^[0-9０-９]/.test(name)) return false;
  if (/^\d{2,3}°/.test(name)) return false;
  if (/閉業|permanently closed|closed permanently/i.test(name)) return false;
  if (/神社$|稲荷神社|護国神社|天満宮$|神宮$/.test(name)) return false;
  if (/(京都府|東京都|大阪府|神奈川県|愛知県|福岡県)/.test(name) && /\d/.test(name)) {
    return false;
  }
  const meta = `${category || ""} ${cardText || ""}`;
  if (/^閉業[。.]?$/.test(meta.trim())) return false;
  return true;
}

function refineCuisine(name, category, cuisine) {
  const blob = `${name} ${category || ""}`;
  if (/MAKINONC|マキノンチ/i.test(name)) return "フレンチ";
  if (name === "レヴォ" || /L'?[eé]vo/i.test(name)) return "フレンチ";
  if (name === "カスク" || /^CASK/i.test(name)) return "その他";
  if (/^(Bar |Cafe\/Bar|Ｂａｒ )/i.test(name)) return "その他";
  if (/ラーメン|らーめん|つけ麺|油そば|蕎麦|そば|うどん|ラーメン屋|麺屋|麺道|Soba|soba|ramen/i.test(blob)) {
    return "その他";
  }
  if (/焼鳥|焼き鳥|やきとり|鳥料理|串焼き|せせり|yakitori/i.test(blob) && !/割烹|懐石|会席|料亭/.test(category || "")) {
    return "その他";
  }
  if (/うなぎ|鰻|unagi/i.test(blob) && !/割烹|懐石|会席|料亭|日本料理店/.test(category || "")) {
    return "その他";
  }
  if (/バー$|ワインクラブ|ワインショップ|Wine Bar|シガー倶楽部/i.test(blob)) {
    if (cuisine === "和食") return "その他";
  }
  if (/イノベーティブ|創作料理/.test(category) && cuisine === "和食") {
    return "フレンチ";
  }
  return cuisine;
}

function finalizeCuisine(entry) {
  const blob = [
    entry.name,
    entry.category,
    entry.description,
    entry.tags.join(" "),
    (entry.listSources || []).join(" "),
  ].join(" ");
  if (entry.cuisine === "和食") {
    const inferred = inferCuisineFromBlob(blob);
    if (inferred && inferred !== "和食") return inferred;
  }
  return entry.cuisine;
}

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
  const m = address.match(/(北海道|東京都|京都府|大阪府|([^\s]{2,3}県))/);
  if (m) {
    if (m[1] === "東京都") return "東京";
    if (m[1] === "京都府") return "京都";
    if (m[1] === "大阪府") return "大阪";
    if (m[1] === "北海道") return "北海道";
    return m[2]?.replace(/県$/, "").trim() || null;
  }
  if (/台東区|港区|渋谷区|中央区|新宿区|千代田区|目黒区|品川区|大田区|世田谷区|杉並区|豊島区|墨田区|江東区|文京区|中野区|板橋区|練馬区|足立区|葛飾区|江戸川区|浅草|上野/.test(address)) {
    return "東京";
  }
  return null;
}

function fallbackCoords(name, pref) {
  if (pref && PREF_BOUNDS[pref]) {
    const b = PREF_BOUNDS[pref];
    return {
      lat: (b.lat[0] + b.lat[1]) / 2 + jitter(name),
      lng: (b.lng[0] + b.lng[1]) / 2 + jitter(name + "x"),
    };
  }
  return regionalCoords(name);
}

function coordsMatchPrefecture(lat, lng, pref) {
  if (!pref || typeof lat !== "number" || typeof lng !== "number") return true;
  const b = PREF_BOUNDS[pref];
  if (!b) return true;
  return lat >= b.lat[0] && lat <= b.lat[1] && lng >= b.lng[0] && lng <= b.lng[1];
}

function regionalCoords(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return {
    lat: 31.5 + (h % 1300) / 100,
    lng: 130.5 + ((h >> 11) % 1400) / 100,
  };
}

function jitter(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) & 0xffff;
  return ((h % 200) - 100) / 12000; // ~ +-0.008 deg
}

const CUISINE_IMG = {
  和食: [
    "photo-1553621042-f6e147245754",
    "photo-1580822184713-fc5400e7fe10",
    "photo-1596797038530-2c107229654b",
    "photo-1607301405390-d831c242f59b",
    "photo-1547592166-23ac45744acd",
  ],
  蕎麦: [
    "photo-1596797038530-2c107229654b",
    "photo-1547592166-23ac45744acd",
    "photo-1553621042-f6e147245754",
  ],
  鮨: [
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
  const soba = /(蕎麦|そば|soba)/i.test(seed);
  const arr = soba
    ? CUISINE_IMG["蕎麦"]
    : CUISINE_IMG[cuisine] || CUISINE_IMG["和食"];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) & 0xffff;
  return arr[h % arr.length];
}

function isBrokenPhotoUrl(url) {
  return !url || /gps-proxy/.test(url);
}

function resolveImage(name, p, cuisine) {
  const overridePhoto = overrides.photos?.[name];
  if (overridePhoto?.startsWith("/media/")) return overridePhoto;
  if (photoCache[name] && !isBrokenPhotoUrl(photoCache[name])) return photoCache[name];
  if (p.image && !isBrokenPhotoUrl(p.image)) return p.image;
  return `https://images.unsplash.com/${pickImage(cuisine, name)}?w=800&q=80`;
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

function formatPriceRange(attrs) {
  if (!attrs?.priceMin) return null;
  const min = attrs.priceMin.toLocaleString("ja-JP");
  if (attrs.priceMax) return `¥${min}〜${attrs.priceMax.toLocaleString("ja-JP")}`;
  if (attrs.priceOpenEnded) return `¥${min}〜`;
  return `¥${min}〜`;
}

function defaultPrivateRoom(category, listName, attrs, tags = []) {
  if (attrs?.privateRoom === true) return true;
  const blob = `${category || ""} ${tags.join(" ")} ${listName}`;
  if (/個室/.test(blob)) return true;
  if (/会席|懐石|割烹|料亭|日本料理店|寿司店|鮨|すし店/i.test(blob)) return true;
  if (/会食middle|会食exective|会食executive/i.test(listName)) return true;
  return false;
}

function applyAttributes(entry, attrs) {
  if (!attrs || attrs.source === "google_maps_failed") return;
  if (attrs.privateRoom === true) entry.privateRoom = true;
  if (typeof attrs.priceMin === "number") entry.priceMin = attrs.priceMin;
  if (typeof attrs.priceMax === "number") entry.priceMax = attrs.priceMax;
  const formatted = formatPriceRange(attrs);
  if (formatted) entry.priceDinner = formatted;
}

// ---- Build -----------------------------------------------------------

const files = fs
  .readdirSync(listsDir)
  .filter((f) => f.endsWith(".json"));

const photoCache = fs.existsSync(photoCachePath)
  ? JSON.parse(fs.readFileSync(photoCachePath, "utf8"))
  : {};
const placeCache = fs.existsSync(placeCachePath)
  ? JSON.parse(fs.readFileSync(placeCachePath, "utf8"))
  : {};
const attributesCache = fs.existsSync(attributesCachePath)
  ? JSON.parse(fs.readFileSync(attributesCachePath, "utf8"))
  : {};

const byName = new Map(); // dedupe by restaurant name, merge lists/scenes
let counter = 0;

for (const file of files) {
  const raw = JSON.parse(fs.readFileSync(path.join(listsDir, file), "utf8"));
  const listName = raw.list || file.replace(/\.json$/, "");
  for (const p of raw.places) {
    const name = p.name.trim();
    const category = (p.info && p.info.find((x) => !/^[0-9.]+$/.test(x))) || p.cardTextCategory || guessCategoryFromText(p.cardText, name);
    if (!isValidName(name, category, p.cardText)) continue;
    let rating = typeof p.rating === "number" ? p.rating : 4.3;
    let cuisine = refineCuisine(name, category, toCuisine(category, name, listName));
    let priceTier = toPriceTier(listName, category, rating);
    const areaInfo = detectArea(name, listName);
    const placeOverride = overrides.places?.[name];
    const attrs = attributesCache[name];
    const cachedPlace = placeOverride
      ? { ...placeCache[name], ...placeOverride }
      : placeCache[name];

    if (byName.has(name)) {
      const ex = byName.get(name);
      const mergedScenes = placeOverride?.scenes
        ? [...new Set([...ex.scenes, ...toScenes(listName, category, rating, priceTier), ...placeOverride.scenes])]
        : [...new Set([...ex.scenes, ...toScenes(listName, category, rating, priceTier)])];
      ex.scenes = mergedScenes;
      ex.listSources = [...new Set([...ex.listSources, listName])];
      if (p.image && !ex.imageFromMaps) {
        ex.image = p.image;
        ex.imageFromMaps = true;
      }
      if (photoCache[name] && !ex.imageFromMaps) {
        ex.image = photoCache[name];
        ex.imageFromMaps = true;
      }
      if (cachedPlace) {
        applyPlaceCache(ex, cachedPlace);
      }
      applyAttributes(ex, attributesCache[name]);
      continue;
    }

    counter += 1;
    const area = placeOverride?.area
      ? placeOverride.area
      : cachedPlace?.address
        ? inferAreaFromAddress(cachedPlace.address)
        : cachedPlace?.lat
          ? areaInfo.area
          : areaInfo.area;
    let lat = cachedPlace?.lat ?? areaInfo.lat + jitter(name);
    let lng = cachedPlace?.lng ?? areaInfo.lng + jitter(name + "x");
    const query = cachedPlace?.query || buildPlaceQuery(name, listName, area, category);
    let address =
      cachedPlace?.address && /^〒/.test(cachedPlace.address)
        ? cachedPlace.address
        : formatFallbackAddress(area);
    const pref = prefectureFromAddress(address);
    if (!coordsMatchPrefecture(lat, lng, pref)) {
      if (cachedPlace?.lat != null && cachedPlace?.lng != null && coordsMatchPrefecture(cachedPlace.lat, cachedPlace.lng, pref)) {
        lat = cachedPlace.lat;
        lng = cachedPlace.lng;
      } else {
        const fb = fallbackCoords(name, pref);
        lat = fb.lat;
        lng = fb.lng;
      }
    }
    if (placeOverride?.cuisine) cuisine = placeOverride.cuisine;
    if (placeOverride?.priceTier) priceTier = placeOverride.priceTier;
    if (typeof placeOverride?.rating === "number") rating = placeOverride.rating;
    const scenesBase = toScenes(listName, category, rating, priceTier);
    const scenes = placeOverride?.scenes
      ? [...new Set([...scenesBase, ...placeOverride.scenes])]
      : scenesBase;
    const tags = placeOverride?.tags || [category].filter(Boolean);
    const description = placeOverride?.description || `${category || cuisine}。`;
    byName.set(name, {
      id: slugify(name, counter),
      name,
      cuisine,
      category: category || "",
      priceTier,
      priceDinner: priceGuess(priceTier),
      scenes,
      area,
      address,
      nearestStation: "",
      lat,
      lng,
      googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`,
      googlePlaceQuery: query,
      image: resolveImage(name, p, cuisine),
      imageFromMaps: Boolean(
        overrides.photos?.[name]?.startsWith("/media/") ||
          photoCache[name] ||
          p.image,
      ),
      rating,
      reviewCount: 0,
      tags,
      description,
      privateRoom: defaultPrivateRoom(category, listName, attrs, tags),
      listSources: [listName],
    });
    applyAttributes(byName.get(name), attrs);
    if (cachedPlace) {
      applyPlaceCache(byName.get(name), cachedPlace);
    }
  }
}

function applyPlaceCache(entry, cachedPlace) {
  const merged = overrides.places?.[entry.name]
    ? { ...cachedPlace, ...overrides.places[entry.name] }
    : cachedPlace;
  if (merged.address && /^〒/.test(merged.address)) {
    entry.address = merged.address;
    entry.area = inferAreaFromAddress(merged.address);
  }
  if (typeof merged.lat === "number") entry.lat = merged.lat;
  if (typeof merged.lng === "number") entry.lng = merged.lng;
  const pref = prefectureFromAddress(entry.address);
  if (!coordsMatchPrefecture(entry.lat, entry.lng, pref)) {
    if (merged.lat != null && merged.lng != null && coordsMatchPrefecture(merged.lat, merged.lng, pref)) {
      entry.lat = merged.lat;
      entry.lng = merged.lng;
    } else {
      const fb = fallbackCoords(entry.name, pref);
      entry.lat = fb.lat;
      entry.lng = fb.lng;
    }
  }
  if (merged.query) {
    entry.googlePlaceQuery = merged.query;
    entry.googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(merged.query)}`;
  }
  if (overrides.places?.[entry.name]?.cuisine) {
    entry.cuisine = overrides.places[entry.name].cuisine;
  }
  if (overrides.places?.[entry.name]?.description) {
    entry.description = overrides.places[entry.name].description;
  }
  if (overrides.places?.[entry.name]?.tags) {
    entry.tags = overrides.places[entry.name].tags;
  }
  if (overrides.places?.[entry.name]?.priceTier) {
    entry.priceTier = overrides.places[entry.name].priceTier;
    entry.priceDinner = priceGuess(entry.priceTier);
  }
  if (typeof overrides.places?.[entry.name]?.rating === "number") {
    entry.rating = overrides.places[entry.name].rating;
  }
  if (overrides.places?.[entry.name]?.area) {
    entry.area = overrides.places[entry.name].area;
  }
  if (overrides.places?.[entry.name]?.scenes) {
    entry.scenes = [...new Set([...entry.scenes, ...overrides.places[entry.name].scenes])];
  }
  if (typeof overrides.places?.[entry.name]?.mapZoom === "number") {
    entry.mapZoom = overrides.places[entry.name].mapZoom;
  }
  applyAttributes(entry, attributesCache[entry.name]);
}

function guessCategoryFromText(text, name) {
  if (!text) return "";
  const t = text.replace(name, "").replace(/[0-9.]+/g, "").trim();
  return t.split(" ").filter(Boolean)[0] || "";
}

const restaurants = [...byName.values()]
  .filter((r) => {
    if (/^閉業[。.]?$/.test(r.description)) return false;
    if (r.tags.some((t) => /^閉業/.test(t))) return false;
    return true;
  })
  .map((r) => {
    const finalized = { ...r, cuisine: finalizeCuisine(r) };
    return {
      ...finalized,
      listSource: finalized.listSources.join(" / "),
    };
  });

const header = `// AUTO-GENERATED by scripts/build-catalog.mjs — do not edit by hand.
// Source: data/lists/*.json (scraped from Hibiki's Google Maps saved lists).
import type { Restaurant } from "./types";

export const generatedRestaurants: Restaurant[] = ${JSON.stringify(
  restaurants.map(({ listSources, category, imageFromMaps, ...r }) => r),
  null,
  2,
)};
`;

fs.writeFileSync(outFile, header);
console.log(`Wrote ${restaurants.length} restaurants -> ${path.relative(root, outFile)}`);
