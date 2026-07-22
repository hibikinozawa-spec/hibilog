import { cuisines, restaurants } from "./restaurants";

const fallbackImages: Record<(typeof cuisines)[number], string> = {
  和食:
    "https://images.unsplash.com/photo-1580822184713-fc5400e7fe10?w=640&q=85",
  鮨: "https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=640&q=85",
  肉: "https://images.unsplash.com/photo-1558030006-450675393462?w=640&q=85",
  イタリアン:
    "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=640&q=85",
  フレンチ:
    "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=640&q=85",
  その他:
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=640&q=85",
};

function pickRepresentativeImage(cuisine: (typeof cuisines)[number]) {
  const best = restaurants
    .filter(
      (r) =>
        r.cuisine === cuisine && r.image.includes("googleusercontent.com"),
    )
    .sort((a, b) => b.rating - a.rating)[0];

  return best?.image ?? fallbackImages[cuisine];
}

export const cuisineGenres = cuisines.map((cuisine) => ({
  cuisine,
  count: restaurants.filter((r) => r.cuisine === cuisine).length,
  image: pickRepresentativeImage(cuisine),
}));
