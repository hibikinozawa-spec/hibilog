import type { Restaurant } from "./types";
import { generatedRestaurants } from "./generated-restaurants";

/**
 * Real data imported from Hibiki's Google Maps saved lists.
 * Regenerate with: node scripts/build-catalog.mjs
 */
export const restaurants: Restaurant[] = generatedRestaurants;

export const cuisines = [
  "和食",
  "鮨",
  "肉",
  "イタリアン",
  "フレンチ",
  "その他",
] as const;

export const priceTiers = [
  { id: "casual" as const, label: "カジュアル", hint: "〜¥8,000" },
  { id: "middle" as const, label: "ミドル", hint: "¥8,000〜¥20,000" },
  { id: "executive" as const, label: "エグゼクティブ", hint: "¥20,000〜" },
];

export const scenes = [
  { id: "会食" as const, label: "会食", description: "ビジネス・お客様との食事" },
  { id: "個室" as const, label: "個室あり", description: "プライベートな空間" },
  { id: "カジュアル" as const, label: "カジュアル", description: "気軽に立ち寄れる" },
  { id: "とっておき" as const, label: "とっておき", description: "特別な一軒" },
  { id: "記念日" as const, label: "記念日", description: "お祝い・アニバーサリー" },
  { id: "コスパ" as const, label: "コスパ良し", description: "満足度の高い価格帯" },
  { id: "接待" as const, label: "接待", description: "フォーマルな接待" },
  { id: "デート" as const, label: "デート", description: "二人の食事に" },
];

export const areas = [
  "東京",
  "築地",
  "六本木",
  "銀座",
  "渋谷",
  "新宿",
  "京都",
  "地方",
  "神奈川",
  "ロサンゼルス",
] as const;

/** Build the list-source filter chips from the data that is actually present. */
export const listSources = [...new Set(restaurants.map((r) => r.listSource))]
  .flatMap((s) => s.split(" / "))
  .filter((s, i, arr) => arr.indexOf(s) === i)
  .map((name) => ({
    id: name,
    label: name.replace(/^東京レストラン_/, "東京_"),
    match: name,
  }));

export function getRestaurantById(id: string) {
  return restaurants.find((r) => r.id === id);
}

export function priceLabel(tier: Restaurant["priceTier"]) {
  return priceTiers.find((p) => p.id === tier)?.label ?? tier;
}
