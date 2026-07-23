import Link from "next/link";
import { CuisineGenreGrid } from "@/components/cuisine-genre-grid";
import { HeroSearch } from "@/components/hero-search";
import { RestaurantCard } from "@/components/restaurant-card";
import { MapPanel } from "@/components/map-panel";
import { preferenceScenes, restaurants } from "@/lib/restaurants";

const tokyoAreas = ["東京", "六本木", "銀座", "渋谷", "新宿"] as const;

const featured = restaurants
  .filter(
    (r) =>
      tokyoAreas.includes(r.area as (typeof tokyoAreas)[number]) &&
      !/^〒/.test(r.name) &&
      r.name !== "豚しゃぶ しくら" &&
      r.image.includes("googleusercontent.com") &&
      ["会食", "とっておき", "記念日"].some((s) =>
        r.scenes.includes(s as (typeof r.scenes)[number]),
      ),
  )
  .sort((a, b) => b.rating - a.rating)
  .slice(0, 6);

const tokyoPins = restaurants.filter((r) => tokyoAreas.includes(r.area as (typeof tokyoAreas)[number]));

export default function HomePage() {
  return (
    <div>
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 -z-10 bg-cover bg-center"
          style={{
            backgroundImage:
              "linear-gradient(120deg, rgba(13,92,176,0.9), rgba(22,32,46,0.58)), url(https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1600&q=80)",
          }}
        />
        <div className="mx-auto max-w-7xl px-4 pb-16 pt-16 sm:px-6 sm:pb-20 sm:pt-24">
          <p className="animate-rise font-[family-name:var(--font-display)] text-5xl text-white sm:text-6xl">
            ヒビログ
          </p>
          <p className="animate-rise-delay mt-4 max-w-xl text-base leading-relaxed text-white/90 sm:text-lg">
            とっておきの店だけを。ヒビログから。
          </p>
          <div className="mt-8">
            <HeroSearch />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-14 sm:px-6">
        <div className="mb-6">
          <h2 className="font-[family-name:var(--font-display)] text-3xl text-[var(--brand-deep)]">
            ジャンルで探す
          </h2>
        </div>
        <CuisineGenreGrid />
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-3xl text-[var(--brand-deep)]">
              利用シーンからさがす
            </h2>
          </div>
          <Link href="/ai" className="text-sm font-medium text-[var(--accent)]">
            AIで気分から探す →
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {preferenceScenes.map((s, i) => (
            <Link
              key={s.id}
              href={`/search?scene=${encodeURIComponent(s.id)}`}
              className="rounded-2xl border border-[var(--line)] bg-white p-5 transition hover:-translate-y-0.5 hover:border-[var(--brand)] hover:shadow-[var(--shadow)]"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <p className="font-semibold text-[var(--ink)]">{s.label}</p>
              <p className="mt-1 text-sm text-[var(--ink-muted)]">{s.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-3xl text-[var(--brand-deep)]">
              マップでみる（東京）
            </h2>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">
              Googleマップの保存ピンのような一覧。各店舗から公式マップも開けます。
            </p>
          </div>
          <Link
            href="/search?area=東京"
            className="text-sm font-medium text-[var(--brand)]"
          >
            すべて見る →
          </Link>
        </div>
          <MapPanel restaurants={tokyoPins} view="tokyo" className="h-[420px]" />
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
        <h2 className="mb-6 font-[family-name:var(--font-display)] text-3xl text-[var(--brand-deep)]">
          ピックアップ
        </h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((r) => (
            <RestaurantCard
              key={r.id}
              restaurant={r}
              showGoogleLink={false}
              showDescription={false}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
