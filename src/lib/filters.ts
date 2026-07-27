import type { PriceTier, Restaurant, Scene } from "./types";
import { matchesBrowseGenre } from "./genre-matching";
import { restaurants } from "./restaurants";

export interface SearchParams {
  q?: string;
  cuisine?: string;
  price?: string;
  scene?: string;
  area?: string;
  list?: string;
  privateRoom?: string;
  sort?: string;
}

export function filterRestaurants(params: SearchParams): Restaurant[] {
  const q = params.q?.trim().toLowerCase();
  const cuisine = params.cuisine;
  const price = params.price as PriceTier | undefined;
  const scene = params.scene as Scene | undefined;
  const area = params.area;
  const list = params.list?.toLowerCase();
  const privateRoom = params.privateRoom === "1" || params.privateRoom === "true";

  return restaurants.filter((r) => {
    if (cuisine && !matchesBrowseGenre(r, cuisine)) return false;
    if (price && r.priceTier !== price) return false;
    if (scene && !r.scenes.includes(scene)) return false;
    if (area && r.area !== area) return false;
    if (privateRoom && !r.privateRoom) return false;
    if (list && !r.listSource.toLowerCase().includes(list)) return false;
    if (q) {
      const hay = [
        r.name,
        r.nameEn,
        r.cuisine,
        r.area,
        r.address,
        r.description,
        r.tags.join(" "),
        r.scenes.join(" "),
        r.listSource,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}
