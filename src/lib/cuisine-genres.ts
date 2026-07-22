import { cuisines, restaurants } from "./restaurants";

/** Tabelog-style food hero shots per genre (verified Unsplash URLs). */
const cuisineFoodImages: Record<(typeof cuisines)[number], string> = {
  和食:
    "https://images.unsplash.com/photo-1766582931800-fd79665257fa?w=640&q=85",
  鮨: "https://images.unsplash.com/photo-1763627719076-3e71ddff7cb4?w=640&q=85",
  肉: "https://images.unsplash.com/photo-1558030006-450675393462?w=640&q=85",
  イタリアン:
    "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=640&q=85",
  フレンチ:
    "https://images.unsplash.com/photo-1646296586390-723f37ba380a?w=640&q=85",
  その他:
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=640&q=85",
};

export const cuisineGenres = cuisines.map((cuisine) => ({
  cuisine,
  count: restaurants.filter((r) => r.cuisine === cuisine).length,
  image: cuisineFoodImages[cuisine],
}));
