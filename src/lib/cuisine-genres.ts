import { browseGenres, countBrowseGenre } from "./genre-matching";
import { restaurants } from "./restaurants";

/** Hero shots per genre — verified URLs or curated restaurant photos. */
const cuisineFoodImages: Record<(typeof browseGenres)[number], string> = {
  和食:
    "https://images.unsplash.com/photo-1766582931800-fd79665257fa?w=640&q=85",
  鮨: "https://images.unsplash.com/photo-1763627719076-3e71ddff7cb4?w=640&q=85",
  肉: "https://images.unsplash.com/photo-1558030006-450675393462?w=640&q=85",
  イタリアン:
    "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=640&q=85",
  フレンチ:
    "https://images.unsplash.com/photo-1646296586390-723f37ba380a?w=640&q=85",
  鰻: "/media/unagi-unaju.jpg",
  焼き鳥: "/media/yakitori.jpg",
  "蕎麦（麺）": "/media/soba-genre.jpg",
  その他:
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=640&q=85",
};

export const cuisineGenres = browseGenres.map((cuisine) => ({
  cuisine,
  count: countBrowseGenre(cuisine, restaurants),
  image: cuisineFoodImages[cuisine],
}));
