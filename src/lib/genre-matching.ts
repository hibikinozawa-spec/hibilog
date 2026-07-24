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

export function matchesBrowseGenre(r: Restaurant, genre: string): boolean {
  const h = haystack(r);
  if (genre === "鰻") {
    return /(うなぎ|鰻|Unagi)/i.test(h);
  }
  if (genre === "焼き鳥") {
    return /(焼き鳥|焼鳥|やきとり|鳥料理|せせり|yakitori)/i.test(h);
  }
  if (genre === "蕎麦（麺）") {
    return /(そば|蕎麦|ラーメン|らーめん|麺|うどん|中華そば)/.test(h);
  }
  return r.cuisine === genre;
}

export function countBrowseGenre(genre: BrowseGenre, restaurants: Restaurant[]) {
  return restaurants.filter((r) => matchesBrowseGenre(r, genre)).length;
}
