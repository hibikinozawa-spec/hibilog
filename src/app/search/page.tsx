import { MapPanel } from "@/components/map-panel";
import { RestaurantCard } from "@/components/restaurant-card";
import { SearchFilters } from "@/components/search-filters";
import { filterRestaurants } from "@/lib/filters";

export const metadata = {
  title: "お店を探す",
};

const GENRE_FEATURED: Record<string, string[]> = {
  鰻: ["伊豆榮 梅川亭"],
  焼き鳥: ["炭火焼鳥 吉田山せせり"],
};

function sortWithFeatured<T extends { name: string }>(items: T[], cuisine?: string) {
  const featured = cuisine ? GENRE_FEATURED[cuisine] : undefined;
  if (!featured?.length) return items;
  const priority = new Map(featured.map((name, i) => [name, i]));
  return [...items].sort((a, b) => {
    const pa = priority.get(a.name) ?? 999;
    const pb = priority.get(b.name) ?? 999;
    return pa - pb;
  });
}

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function one(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export default async function SearchPage({ searchParams }: Props) {
  const sp = await searchParams;
  const current = {
    q: one(sp.q),
    cuisine: one(sp.cuisine),
    price: one(sp.price),
    scene: one(sp.scene),
    area: one(sp.area),
    list: one(sp.list),
    privateRoom: one(sp.privateRoom),
  };

  const results = sortWithFeatured(filterRestaurants(current), current.cuisine);
  const mapView =
    current.area === "地方"
      ? "japan"
      : current.area && ["京都", "神奈川"].includes(current.area)
        ? "fit"
        : "tokyo";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--brand-deep)] sm:text-4xl">
          お店を探す
        </h1>
        <p className="mt-1 text-sm text-[var(--ink-muted)]">
          {results.length}件ヒット
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <SearchFilters current={current} />
        </aside>

        <div className="space-y-6">
          <MapPanel
            restaurants={results}
            view={mapView}
            className="h-[360px] lg:h-[420px]"
          />
          {results.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-[var(--line)] bg-white p-10 text-center text-[var(--ink-muted)]">
              条件に合うお店がありません。フィルタをゆるめてみてください。
            </p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {results.map((r) => (
                <RestaurantCard key={r.id} restaurant={r} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
