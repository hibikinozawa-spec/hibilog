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
  { id: "executive" as const, label: "High", hint: "¥20,000〜" },
];

export const preferenceScenes = [
  { id: "会食" as const, label: "会食", description: "ビジネス・お客様との食事" },
  { id: "カジュアル" as const, label: "カジュアル", description: "気軽に立ち寄れる" },
  { id: "とっておき" as const, label: "とっておき", description: "特別な一軒" },
  { id: "記念日" as const, label: "記念日", description: "お祝い・アニバーサリー" },
  { id: "コスパ" as const, label: "コスパ良し", description: "満足度の高い価格帯" },
  { id: "接待" as const, label: "接待", description: "フォーマルな接待" },
] as const;

/** @deprecated use preferenceScenes */
export const scenes = preferenceScenes;

export const areas = [
  "東京",
  "六本木",
  "虎ノ門",
  "銀座",
  "渋谷",
  "新宿",
  "京都",
  "地方",
  "神奈川",
] as const;

export function getRestaurantById(id: string) {
  const decoded = decodeURIComponent(id);
  return restaurants.find((r) => r.id === id || r.id === decoded);
}

export function priceLabel(tier: Restaurant["priceTier"]) {
  return priceTiers.find((p) => p.id === tier)?.label ?? tier;
}
