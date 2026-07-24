import type { Restaurant } from "./types";
import introCacheData from "../../data/intro-cache.json";

type IntroCacheEntry = {
  intro: string;
  reviewCount?: number;
  source?: string;
};

const INTRO_CACHE: Record<string, IntroCacheEntry> = introCacheData as Record<
  string,
  IntroCacheEntry
>;

const INTRO_OVERRIDES: Record<string, string> = {
  瞬:
    "静岡の山あいに店を構える、鰻割烹の名店。\n" +
    "活鰻を厳選し、職人の技で蒸し・焼き・仕上げまで一貫して担う。\n" +
    "コースでは鰻の多彩な表情と、季節の一品が順に登場する。\n" +
    "非日常の空間で、鰻の奥深さを五感で味わえる一軒。",
  長島:
    "白金の鮨カウンターで、旬のネタと職人の所作が近い距離で楽しめる。\n" +
    "握り一貫ごとに温度と食感が整えられ、シャリとの一体感が際立つ。\n" +
    "会食や記念日にも選ばれる、落ち着いた空気の名店。",
  神泉いちのや:
    "渋谷・神泉に暖簾を掲げる、川越出身の老舗鰻店の暖簾分け。\n" +
    "生のうなぎを蒸してから焼く独自の技法で、ふっくらとした身と代々継承のタレが引き立つ。\n" +
    "うな重をはじめ、肝焼きやうまきなど一品料理も充実。\n" +
    "落ち着いた和の空間で、会食や祝いの席にも選ばれる一軒。",
  はせ川:
    "平和島の環七沿いに続く、炭火うなぎの老舗。\n" +
    "活鰻を関東風に蒸し、備長炭で香ばしく焼き上げる。\n" +
    "秘伝のタレが身に絡み、ふっくらとした食感が口の中でほどける。\n" +
    "うな重や蒲焼きを、気軽なランチから会食まで楽しめる。",
  駿河屋:
    "成田山新勝寺総門脇に佇む、江戸時代創業の鰻専門店。\n" +
    "秘伝のタレと紀州備長炭で、できたての蒲焼きを提供。\n" +
    "参拝のあとに立ち寄る、老舗ならではの落ち着いた味わい。",
};

function hash(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return h;
}

function pick<T>(items: T[], seed: string): T {
  return items[hash(seed) % items.length];
}

function cleanCategory(tags: string[], description: string): string {
  const fromTags = tags.find(
    (t) =>
      t.length >= 2 &&
      !/^[0-9.]+/.test(t) &&
      !/^\d/.test(t) &&
      !/閉業/.test(t),
  );
  if (fromTags) return fromTags.replace(/[。.]$/, "");
  const fromDesc = description.replace(/[。.]$/, "").trim();
  if (fromDesc.length >= 3 && fromDesc.length <= 24) return fromDesc;
  return "";
}

function areaLabel(area: Restaurant["area"], address: string): string {
  if (/渋谷/.test(address)) return "渋谷";
  if (/虎ノ門|虎の門/.test(address)) return "虎ノ門";
  if (/六本木|麻布|白金|赤坂|青山|表参道|西麻布/.test(address)) return "六本木・麻布";
  if (/銀座|日本橋|中央区/.test(address)) return "銀座";
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

function introForUnagi(r: Restaurant, category: string, area: string): string {
  const lines = [
    pick(
      [
        `${area}で評判の${category}。`,
        `${area}に店を構える、こだわりの${category}。`,
        `${area}エリアで愛される${category}。`,
      ],
      r.name,
    ),
    pick(
      [
        "活うなぎを丁寧に捌き、蒸し・焼き・仕上げまで一貫した調理で提供する。",
        "備長炭の香ばしさと、継ぎ足しのタレが身の旨みを引き立てる。",
        "ふっくらとした食感と、上品なタレのバランスが評価されている。",
        "注文を受けてから焼き上げるため、できたての香りと食感が楽しめる。",
      ],
      r.name + "a",
    ),
    pick(
      [
        "うな重や蒲焼きをはじめ、肝焼きやうまきなど一品料理も充実。",
        "うな重・白焼き・ひつまぶしなど、定番から贅沢な一皿まで揃う。",
        "ランチから会食まで、シーンに合わせて選べるメニューが魅力。",
      ],
      r.name + "b",
    ),
  ];
  if (r.privateRoom || r.scenes.includes("会食")) {
    lines.push(
      pick(
        [
          "落ち着いた和の空間で、接待や祝いの席にも選ばれる。",
          "個室や落ち着いた席配置があり、会食にも向く。",
        ],
        r.name + "c",
      ),
    );
  } else {
    lines.push(
      pick(
        [
          "落ち着いた店内で、鰻本来の味わいをじっくり楽しめる。",
          "地元の常連から観光客まで、幅広い層に支持されている。",
        ],
        r.name + "c",
      ),
    );
  }
  return lines.slice(0, 4).join("\n");
}

function introForSushi(r: Restaurant, category: string, area: string): string {
  const lines = [
    pick(
      [
        `${area}の${category}として、旬のネタと職人の技が評価されている。`,
        `${area}に店を構える${category}。カウンター越しに握りの所作が楽しめる。`,
      ],
      r.name,
    ),
    pick(
      [
        "握り一貫ごとに温度と食感が整えられ、シャリとの一体感が際立つ。",
        "厳選した魚介と、炊き上げたシャリのバランスが好評。",
        "旬のネタを活かした握りと、季節の一品が揃う。",
      ],
      r.name + "a",
    ),
    pick(
      [
        "会食や記念日にも選ばれる、落ち着いた空気の名店。",
        "カウンター席で職人との距離感を楽しめる、こだわりの一軒。",
        "ランチから夜の会席まで、用途に合わせて利用できる。",
      ],
      r.name + "b",
    ),
  ];
  if (r.priceTier === "executive" || r.scenes.includes("接待")) {
    lines.push("高級感のある空間で、接待や特別な日の食事に向く。");
  }
  return lines.slice(0, 4).join("\n");
}

function introForMeat(r: Restaurant, category: string, area: string): string {
  return [
    pick(
      [
        `${area}で人気の${category || "焼肉店"}。`,
        `${area}に店を構える、肉質にこだわる${category || "焼肉店"}。`,
      ],
      r.name,
    ),
    pick(
      [
        "厳選した部位を、炭火や鉄板で香ばしく焼き上げる。",
        "霜降りと赤身のバランスが良く、部位ごとの食べ比べが楽しめる。",
        "肉の旨みを引き出す焼き加減と、タレ・塩の組み合わせが好評。",
      ],
      r.name + "a",
    ),
    pick(
      [
        "会食からカジュアルな集まりまで、幅広いシーンで利用できる。",
        "落ち着いた店内で、肉を中心にした食事を存分に楽しめる。",
      ],
      r.name + "b",
    ),
    r.privateRoom ? "個室があり、接待やグループでの利用にも向く。" : "",
  ]
    .filter(Boolean)
    .slice(0, 4)
    .join("\n");
}

function introForFrench(r: Restaurant, area: string): string {
  return [
    `${area}のフレンチレストラン。`,
    pick(
      [
        "季節の素材を活かしたコース料理が評価されている。",
        "フランス料理の技法と、日本の食材が融合した一皿が魅力。",
        "ソースや仕込みに時間をかけた、丁寧な料理が揃う。",
      ],
      r.name,
    ),
    pick(
      [
        "ワインとのペアリングも楽しめる、落ち着いたダイニング。",
        "記念日や会食にも選ばれる、上質な空間。",
      ],
      r.name + "a",
    ),
    r.scenes.includes("記念日") ? "特別な日の食事にふさわしい、洗練された雰囲気。" : "",
  ]
    .filter(Boolean)
    .slice(0, 4)
    .join("\n");
}

function introForItalian(r: Restaurant, area: string): string {
  return [
    `${area}のイタリアンレストラン。`,
    pick(
      [
        "パスタやピッツァをはじめ、イタリア各地の郷土料理が楽しめる。",
        "シェフこだわりのパスタと、厳選ワインのマリアージュが魅力。",
        "素材の旨みを活かした、温かみのあるイタリア料理が揃う。",
      ],
      r.name,
    ),
    pick(
      [
        "カジュアルなランチから、記念日のディナーまで利用できる。",
        "開放的な店内で、イタリアの食文化を気軽に味わえる。",
      ],
      r.name + "b",
    ),
  ]
    .slice(0, 3)
    .join("\n");
}

function introForWashoku(r: Restaurant, category: string, area: string): string {
  const label = category || "和食店";
  return [
    `${area}の${label}。`,
    pick(
      [
        "旬の食材を活かした料理と、丁寧な仕込みが評価されている。",
        "日本料理ならではの技法で、素材の旨みを引き出す。",
        "季節感のある献立と、落ち着いた盛り付けが魅力。",
      ],
      r.name,
    ),
    pick(
      [
        "会食や接待にも選ばれる、落ち着いた和の空間。",
        "ランチから夜の会席まで、用途に合わせて楽しめる。",
      ],
      r.name + "a",
    ),
    r.privateRoom ? "個室があり、プライベートな食事にも向く。" : "",
  ]
    .filter(Boolean)
    .slice(0, 4)
    .join("\n");
}

function introGeneric(r: Restaurant, category: string, area: string): string {
  const label = category || `${r.cuisine}の店`;
  return [
    `${area}で評判の${label}。`,
    pick(
      [
        "素材選びと調理にこだわり、リピーターにも支持されている。",
        "シェフ・店主の想いが感じられる、丁寧な料理が揃う。",
        "落ち着いた空間で、食事そのものを楽しめる一軒。",
      ],
      r.name,
    ),
    pick(
      [
        "ランチからディナーまで、シーンに合わせて利用できる。",
        "地域の食通からも名前の挙がる、隠れた名店。",
      ],
      r.name + "a",
    ),
  ]
    .slice(0, 3)
    .join("\n");
}

function customIntroFromDescription(description: string): string | null {
  const text = description
    .replace(/Googleマップの「[^」]+」より。?/g, "")
    .replace(/[。.]$/, "")
    .trim();
  if (text.length < 12) return null;
  if (/^(うなぎ|寿司|焼肉|和食|フレンチ|イタリアン)/.test(text) && text.length < 20) {
    return null;
  }
  if (text.includes("。")) return text;
  return `${text}。`;
}

export function buildRestaurantIntro(r: Restaurant): string {
  const fromReviews = INTRO_CACHE[r.name]?.intro?.trim();
  if (fromReviews) return fromReviews;
  if (INTRO_OVERRIDES[r.name]) return INTRO_OVERRIDES[r.name];

  const fromDesc = customIntroFromDescription(r.description);
  if (fromDesc && fromDesc.split("\n").length >= 2) return fromDesc;
  if (fromDesc && fromDesc.length >= 40) return fromDesc;

  const category = cleanCategory(r.tags, r.description);
  const area = areaLabel(r.area, r.address);
  const blob = `${category} ${r.cuisine} ${r.listSource} ${r.name}`;

  let intro = "";
  if (/うなぎ|鰻|どじょう/.test(blob)) intro = introForUnagi(r, category || "うなぎ料理店", area);
  else if (/寿司|鮨|すし/.test(blob) || r.cuisine === "鮨") intro = introForSushi(r, category || "寿司店", area);
  else if (/焼肉|ステーキ|肉|ホルモン|鉄板/.test(blob) || r.cuisine === "肉")
    intro = introForMeat(r, category, area);
  else if (/フレンチ|フランス|ビストロ|ブラッスリー/.test(blob) || r.cuisine === "フレンチ")
    intro = introForFrench(r, area);
  else if (/イタリア|パスタ|ピッツァ|トラットリア/.test(blob) || r.cuisine === "イタリアン")
    intro = introForItalian(r, area);
  else if (r.cuisine === "和食") intro = introForWashoku(r, category, area);
  else intro = introGeneric(r, category, area);

  if (fromDesc && fromDesc.length >= 12) {
    intro = `${fromDesc}\n${intro.split("\n").slice(1).join("\n")}`.trim();
  }

  return intro;
}
