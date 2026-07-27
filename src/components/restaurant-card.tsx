import Link from "next/link";
import { displayBrowseGenre } from "@/lib/genre-matching";
import { priceLabel } from "@/lib/restaurants";
import type { Restaurant } from "@/lib/types";

function displayDescription(description: string) {
  return description.replace(/Googleマップの「[^」]+」より。?/g, "").trim();
}

export function RestaurantCard({
  restaurant,
  matchScore,
  reasons,
  showGoogleLink = true,
  showDescription = true,
}: {
  restaurant: Restaurant;
  matchScore?: number;
  reasons?: string[];
  showGoogleLink?: boolean;
  showDescription?: boolean;
}) {
  const detailHref = `/restaurant/${encodeURIComponent(restaurant.id)}`;
  const containImage =
    restaurant.name === "すし 凱" ||
    restaurant.name === "長島" ||
    restaurant.image.includes("kai-sushi-handoff") ||
    restaurant.image.includes("nagashima-sushi-handoff");

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow)]">
      <Link href={detailHref} className="block flex-1">
        <div
          className={`relative aspect-[4/3] overflow-hidden bg-[var(--brand-soft)] ${
            containImage ? "flex items-center justify-center" : ""
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={restaurant.image}
            alt={restaurant.name}
            className={
              containImage
                ? "max-h-full max-w-full object-contain object-center"
                : "h-full w-full object-cover object-center transition duration-500 group-hover:scale-105"
            }
          />
          {typeof matchScore === "number" && (
            <div className="absolute left-3 top-3 rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-bold text-white shadow">
              マッチ度 {matchScore}
            </div>
          )}
          <div className="absolute bottom-3 left-3 rounded-full bg-black/55 px-2.5 py-1 text-xs text-white backdrop-blur">
            ★ {restaurant.rating.toFixed(1)}
          </div>
        </div>
        <div className="space-y-2 p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-base font-semibold leading-snug text-[var(--ink)]">
              {restaurant.name}
            </h3>
            <span className="shrink-0 rounded-md bg-[var(--brand-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--brand-deep)]">
              {priceLabel(restaurant.priceTier)}
            </span>
          </div>
          <p className="text-sm text-[var(--ink-muted)]">
            {displayBrowseGenre(restaurant)} ／ {restaurant.area} ／ {restaurant.priceDinner}
          </p>
          {showDescription && displayDescription(restaurant.description) && (
            <p className="line-clamp-2 text-sm leading-relaxed text-[var(--ink-muted)]">
              {displayDescription(restaurant.description)}
            </p>
          )}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {restaurant.scenes
              .filter((s) => !(s === "個室" && restaurant.privateRoom))
              .slice(0, 3)
              .map((s) => (
              <span
                key={s}
                className="rounded-full border border-[var(--line)] px-2 py-0.5 text-[11px] text-[var(--ink-muted)]"
              >
                {s}
              </span>
            ))}
            {restaurant.privateRoom && (
              <span className="rounded-full border border-[var(--line)] px-2 py-0.5 text-[11px] text-[var(--ink-muted)]">
                個室
              </span>
            )}
          </div>
          {reasons && reasons.length > 0 && (
            <p className="text-xs text-[var(--accent)]">{reasons.join(" · ")}</p>
          )}
        </div>
      </Link>
      <div className="mt-auto flex border-t border-[var(--line)]">
        {showGoogleLink && (
          <a
            href={restaurant.googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 px-4 py-2.5 text-center text-xs font-medium text-[var(--brand)] transition hover:bg-[var(--brand-soft)]"
          >
            Googleマップで開く
          </a>
        )}
        <Link
          href={detailHref}
          className={`${showGoogleLink ? "flex-1 border-l border-[var(--line)]" : "w-full"} px-4 py-2.5 text-center text-xs font-medium text-[var(--ink-muted)] transition hover:bg-[var(--bg)]`}
        >
          詳細を見る
        </Link>
      </div>
    </article>
  );
}
