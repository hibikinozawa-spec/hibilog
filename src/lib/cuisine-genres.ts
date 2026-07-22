import { cuisines, restaurants } from "./restaurants";

/** Tabelog-style food hero shots per genre (not shop interior photos). */
const cuisineFoodImages: Record<(typeof cuisines)[number], string> = {
  和食:
    "https://images.unsplash.com/photo-1569058242567-93de6f36f8eb?w=640&q=85",
  鮨: "https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=640&q=85",
  肉: "https://images.unsplash.com/photo-1558030006-450675393462?w=640&q=85",
  イタリアン:
    "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=640&q=85",
  フレンチ:
    "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=640&q=85",
  その他:
    "https://images.unsplash.com/photo-1569718212165-3a8278ecf5aa?w=640&q=85",
};

export const cuisineGenres = cuisines.map((cuisine) => ({
  cuisine,
  count: restaurants.filter((r) => r.cuisine === cuisine).length,
  image: cuisineFoodImages[cuisine],
}));
