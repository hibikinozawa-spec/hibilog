import type { PriceTier, Restaurant } from "./types";

const tierSortValue: Record<PriceTier, number> = {
  casual: 5000,
  middle: 10000,
  executive: 20000,
};

export type RestaurantSort = "featured" | "price-asc" | "price-desc" | "rating";

export const restaurantSortOptions: { id: RestaurantSort; label: string }[] = [
  { id: "featured", label: "おすすめ" },
  { id: "price-asc", label: "値段が安い順" },
  { id: "price-desc", label: "値段が高い順" },
  { id: "rating", label: "評価が高い順" },
];

export function priceSortKey(r: Restaurant): number {
  if (typeof r.priceMin === "number") return r.priceMin;
  return tierSortValue[r.priceTier];
}

export function sortRestaurants(
  items: Restaurant[],
  sort: RestaurantSort | undefined,
  featuredNames?: string[],
): Restaurant[] {
  if (featuredNames?.length && (!sort || sort === "featured")) {
    const priority = new Map(featuredNames.map((name, i) => [name, i]));
    return [...items].sort((a, b) => {
      const pa = priority.get(a.name) ?? 999;
      const pb = priority.get(b.name) ?? 999;
      if (pa !== pb) return pa - pb;
      return b.rating - a.rating;
    });
  }

  if (sort === "price-asc") {
    return [...items].sort((a, b) => {
      const diff = priceSortKey(a) - priceSortKey(b);
      if (diff !== 0) return diff;
      return b.rating - a.rating;
    });
  }

  if (sort === "price-desc") {
    return [...items].sort((a, b) => {
      const diff = priceSortKey(b) - priceSortKey(a);
      if (diff !== 0) return diff;
      return b.rating - a.rating;
    });
  }

  if (sort === "rating") {
    return [...items].sort((a, b) => b.rating - a.rating);
  }

  return [...items].sort((a, b) => b.rating - a.rating);
}
