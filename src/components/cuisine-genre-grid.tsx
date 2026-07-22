import Link from "next/link";
import { cuisineGenres } from "@/lib/cuisine-genres";

export function CuisineGenreGrid() {
  return (
    <div className="grid grid-cols-3 gap-0.5 sm:grid-cols-6 sm:gap-1">
      {cuisineGenres.map(({ cuisine, count, image }) => (
        <Link
          key={cuisine}
          href={`/search?cuisine=${encodeURIComponent(cuisine)}`}
          className="group relative aspect-square overflow-hidden bg-neutral-100"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt={cuisine}
            className="absolute inset-0 h-full w-full object-cover brightness-110 saturate-110 transition duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 px-2 pb-3 pt-8 text-center text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
            <p className="text-sm font-bold leading-tight sm:text-[15px]">
              {cuisine}
            </p>
            <p className="mt-1 text-[11px] text-white/85">{count}件</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
