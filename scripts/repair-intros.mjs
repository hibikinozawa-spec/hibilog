// Regenerate intro-cache entries that wrongly use sushi boilerplate on non-sushi shops.
// Usage: node scripts/repair-intros.mjs [--dry-run]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const introCachePath = path.join(root, "data", "intro-cache.json");
const catalogPath = path.join(root, "src/lib/generated-restaurants.ts");
const dryRun = process.argv.includes("--dry-run");

function hash(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return h;
}

function pick(items, seed) {
  return items[hash(seed) % items.length];
}

function cleanCategory(tags, description) {
  const fromTags = tags.find(
    (t) => t.length >= 2 && !/^[0-9.]+/.test(t) && !/^\d/.test(t) && !/閉業/.test(t),
  );
  if (fromTags) return fromTags.replace(/[。.]$/, "");
  const fromDesc = description.replace(/[。.]$/, "").trim();
  if (fromDesc.length >= 3 && fromDesc.length <= 24) return fromDesc;
  return "";
}

function areaLabel(area, address) {
  if (/渋谷/.test(address)) return "渋谷";
  if (/虎ノ門|虎の門/.test(address)) return "虎ノ門";
  if (/六本木|麻布|白金|赤坂|青山|表参道|西麻布/.test(address)) return "六本木・麻布";
  if (/銀座/.test(address)) return "銀座";
  if (/日本橋|人形町|蛎殻町|小伝馬町|茅場町|浜町/.test(address)) return "人形町";
  if (/新宿/.test(address)) return "新宿";
  if (/東京都/.test(address)) return "東京";
  if (/京都府|京都市|祇園/.test(address)) return "京都";
  if (/神奈川|横浜|鎌倉/.test(address)) return "神奈川";
  if (area !== "地方" && area !== "東京") return area;
  const pref = address.match(/(?:北海道|東京都|京都府|大阪府|(.{2,3}県))/);
  if (pref?.[0] === "東京都") return "東京";
  if (pref?.[0]) return pref[0].replace(/[都道府県]$/, "");
  return area === "地方" ? "各地" : area;
}

function buildIntro(r) {
  const category = cleanCategory(r.tags, r.description);
  const area = areaLabel(r.area, r.address);
  const blob = `${category} ${r.cuisine} ${r.listSource} ${r.name}`;

  if (/うなぎ|鰻|どじょう/.test(blob)) {
    return [
      pick([`${area}で評判の${category || "うなぎ料理店"}。`, `${area}の${category || "うなぎ料理店"}。`], r.name),
      pick(
        [
          "活うなぎを丁寧に捌き、蒸し・焼き・仕上げまで一貫した調理で提供する。",
          "備長炭の香ばしさと、継ぎ足しのタレが身の旨みを引き立てる。",
        ],
        r.name + "a",
      ),
      pick(["うな重や蒲焼きをはじめ、一品料理も充実。", "ランチから会食まで利用できる。"], r.name + "b"),
    ].join("\n");
  }

  if (/焼き鳥|焼鳥|やきとり|串焼|もつ焼/.test(blob)) {
    return [
      `${area}の${category || "焼き鳥店"}。`,
      pick(
        [
          "備長炭で香ばしく焼き上げる串焼きが評価されている。",
          "ふっくらとした身とタレ・塩のバランスが好評。",
        ],
        r.name,
      ),
      pick(["お通しやコースなどが人気。", "落ち着いた店内で、ゆっくりと楽しめる。"], r.name + "a"),
    ].join("\n");
  }

  if (/焼肉|ステーキ|肉|ホルモン|鉄板|しゃぶ|すき焼/.test(blob) || r.cuisine === "肉") {
    return [
      pick([`${area}で人気の${category || "焼肉店"}。`, `${area}の${category || "肉料理店"}。`], r.name),
      pick(
        [
          "厳選した部位を、炭火や鉄板で香ばしく焼き上げる。",
          "肉の旨みを引き出す焼き加減と、タレ・塩の組み合わせが好評。",
        ],
        r.name + "a",
      ),
      pick(["会食からカジュアルな集まりまで利用できる。", "落ち着いた店内で肉料理を存分に楽しめる。"], r.name + "b"),
    ].join("\n");
  }

  if (/フレンチ|フランス|ビストロ|ブラッスリー/.test(blob) || r.cuisine === "フレンチ") {
    return [
      `${area}のフレンチレストラン。`,
      pick(
        ["季節の素材を活かしたコース料理が評価されている。", "ソースや仕込みに時間をかけた丁寧な料理が揃う。"],
        r.name,
      ),
      pick(["ワインとのペアリングも楽しめる。", "記念日や会食にも選ばれる。"], r.name + "a"),
    ].join("\n");
  }

  if (/イタリア|パスタ|ピッツァ|トラットリア/.test(blob) || r.cuisine === "イタリアン") {
    return [
      `${area}のイタリアンレストラン。`,
      pick(
        ["パスタやピッツァをはじめ、イタリア各地の郷土料理が楽しめる。", "素材の旨みを活かした温かみのある料理が揃う。"],
        r.name,
      ),
      pick(["カジュアルなランチから記念日のディナーまで利用できる。", "厳選ワインとのマリアージュも魅力。"], r.name + "b"),
    ].join("\n");
  }

  if (/中華|中国|韓国|スペイン|ビーガン|ベーカ|ラーメン|そば|蕎麦|天ぷら|ふぐ|韓国/.test(blob) || r.cuisine === "その他") {
    const label = category || `${r.cuisine}の店`;
    return [
      `${area}の${label}。`,
      pick(
        ["素材選びと調理にこだわり、リピーターにも支持されている。", "丁寧な料理と落ち着いた空間が魅力。"],
        r.name,
      ),
      pick(["ランチからディナーまで利用できる。", "地域の食通からも名前の挙がる一軒。"], r.name + "a"),
    ].join("\n");
  }

  if (r.cuisine === "和食") {
    const label = category || "和食店";
    return [
      `${area}の${label}。`,
      pick(
        [
          "旬の食材を活かした料理と、丁寧な仕込みが評価されている。",
          "日本料理ならではの技法で、素材の旨みを引き出す。",
        ],
        r.name,
      ),
      pick(["会食や接待にも選ばれる、落ち着いた和の空間。", "ランチから夜まで用途に合わせて楽しめる。"], r.name + "a"),
    ].join("\n");
  }

  return [
    `${area}で評判の${category || r.cuisine + "の店"}。`,
    pick(["素材選びと調理にこだわり、リピーターにも支持されている。", "落ち着いた空間で食事を楽しめる一軒。"], r.name),
    pick(["ランチからディナーまで利用できる。", "地域の食通からも名前の挙がる店。"], r.name + "a"),
  ].join("\n");
}

function isBadIntro(intro, cuisine) {
  return cuisine !== "鮨" && /シャリ|握り一貫/.test(intro || "");
}

const catalogSrc = fs.readFileSync(catalogPath, "utf8");
const restaurants = JSON.parse(
  catalogSrc.match(/export const generatedRestaurants: Restaurant\[\] = (\[[\s\S]*?\]);/)[1],
);
const cache = JSON.parse(fs.readFileSync(introCachePath, "utf8"));

let fixed = 0;
for (const r of restaurants) {
  const entry = cache[r.name];
  if (!entry?.intro || !isBadIntro(entry.intro, r.cuisine)) continue;
  const nextIntro = buildIntro(r);
  if (!dryRun) {
    cache[r.name] = {
      ...entry,
      intro: nextIntro,
      repairedAt: new Date().toISOString().slice(0, 10),
      source: entry.source || "google_maps_reviews",
    };
  }
  fixed++;
}

if (!dryRun) {
  fs.writeFileSync(introCachePath, JSON.stringify(cache, null, 2) + "\n");
}

console.log(JSON.stringify({ fixed, dryRun }, null, 2));
