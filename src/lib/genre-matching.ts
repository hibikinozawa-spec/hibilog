import type { Restaurant } from "./types";

/** Browse genres shown on the home page (includes sub-genres beyond primary cuisine). */
export const browseGenres = [
  "和食",
  "鮨",
  "肉",
  "イタリアン",
  "フレンチ",
  "鰻",
  "焼き鳥",
  "蕎麦（麺）",
  "その他",
] as const;

export type BrowseGenre = (typeof browseGenres)[number];

function haystack(r: Restaurant) {
  return [r.name, r.description, r.tags.join(" "), r.listSource].join(" ");
}

/** 和食タブから除外する専門店（焼き鳥・麺・鰻は各ジャンルタブ専用） */
function isWashokuSubGenre(h: string): boolean {
  if (/(うなぎ|鰻|Unagi)/i.test(h)) return true;
  if (/(焼き鳥|焼鳥|やきとり|鳥料理|串焼き|せせり|yakitori)/i.test(h)) return true;
  if (/(そば|蕎麦|ラーメン|らーめん|麺|うどん|中華そば|沖縄そば|沖縄|Soba|soba|ramen)/i.test(h)) {
    return true;
  }
  return false;
}

export function matchesBrowseGenre(r: Restaurant, genre: string): boolean {
  const h = haystack(r);
  if (genre === "和食") {
    return r.cuisine === "和食" && !isWashokuSubGenre(h);
  }
  if (genre === "鰻") {
    return /(うなぎ|鰻|Unagi)/i.test(h);
  }
  if (genre === "焼き鳥") {
    return /(焼き鳥|焼鳥|やきとり|鳥料理|串焼き|せせり|yakitori)/i.test(h);
  }
  if (genre === "蕎麦（麺）") {
    return /(そば|蕎麦|ラーメン|らーめん|麺|うどん|中華そば|沖縄そば|沖縄|Soba|soba|ramen)/i.test(h);
  }
  return r.cuisine === genre;
}

export function countBrowseGenre(genre: BrowseGenre, restaurants: Restaurant[]) {
  return restaurants.filter((r) => matchesBrowseGenre(r, genre)).length;
}

/** Card/detail label: sub-genres (蕎麦/鰻/焼き鳥) when matched, else primary cuisine. */
export function displayBrowseGenre(r: Restaurant): string {
  for (const genre of ["蕎麦（麺）", "鰻", "焼き鳥"] as const) {
    if (matchesBrowseGenre(r, genre)) return genre;
  }
  return r.cuisine;
}
