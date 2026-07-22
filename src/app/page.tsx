import Link from "next/link";
import { HeroSearch } from "@/components/hero-search";
import { RestaurantCard } from "@/components/restaurant-card";
import { MapPanel } from "@/components/map-panel";
import {
  cuisines,
  listSources,
  priceTiers,
  restaurants,
  scenes,
} from "@/lib/restaurants";

const cuisineMeta: Record<string, { emoji: string; hint: string }> = {
  和食: { emoji: "🍶", hint: "懐石・天ぷら・炉端" },
  鮨: { emoji: "🍣", hint: "カウンター・オマカセ" },
  肉: { emoji: "🥩", hint: "焼肉・ステーキ・和牛" },
  イタリアン: { emoji: "🍝", hint: "パスタ・ワイン" },
  フレンチ: { emoji: "🍷", hint: "コース・記念日" },
  その他: { emoji: "🥢", hint: "中華・多国籍" },
};

const featured = restaurants.filter((r) =>
  ["会食", "とっておき", "記念日"].some((s) =>
    r.scenes.includes(s as (typeof r.scenes)[number]),
  ),
).slice(0, 6);

const tokyoPins = restaurants.filter((r) =>
  ["東京", "築地", "六本木", "銀座", "渋谷", "新宿"].includes(r.area),
);

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
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {cuisines.map((c) => (
            <Link
              key={c}
              href={`/search?cuisine=${encodeURIComponent(c)}`}
              className="group flex flex-col items-center gap-2 rounded-2xl border border-[var(--line)] bg-white px-3 py-6 text-center transition hover:-translate-y-0.5 hover:border-[var(--brand)] hover:shadow-[var(--shadow)]"
            >
              <span className="text-3xl transition group-hover:scale-110">
                {cuisineMeta[c]?.emoji ?? "🍽"}
              </span>
              <span className="font-semibold text-[var(--ink)]">{c}</span>
              <span className="text-xs text-[var(--ink-muted)]">
                {cuisineMeta[c]?.hint}
              </span>
            </Link>
          ))}
        </div>
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
          {scenes.map((s, i) => (
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

      <section className="border-y border-[var(--line)] bg-white/70 py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="font-[family-name:var(--font-display)] text-3xl text-[var(--brand-deep)]">
            値段帯・こだわり
          </h2>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            カジュアル / ミドル / エグゼクティブで分類。
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {priceTiers.map((p) => (
              <Link
                key={p.id}
                href={`/search?price=${p.id}`}
                className="rounded-2xl bg-[var(--brand-deep)] px-5 py-6 text-white transition hover:brightness-110"
              >
                <p className="text-xl font-semibold">{p.label}</p>
                <p className="mt-1 text-sm text-white/75">{p.hint}</p>
              </Link>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {listSources.map((l) => (
              <Link
                key={l.id}
                href={`/search?list=${encodeURIComponent(l.match)}`}
                className="rounded-full border border-[var(--line)] bg-[var(--bg)] px-3 py-1.5 text-xs text-[var(--ink-muted)] transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
              >
                {l.label}
              </Link>
            ))}
          </div>
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
        <MapPanel restaurants={tokyoPins} className="h-[420px]" />
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
        <h2 className="mb-6 font-[family-name:var(--font-display)] text-3xl text-[var(--brand-deep)]">
          ピックアップ
        </h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((r) => (
            <RestaurantCard key={r.id} restaurant={r} />
          ))}
        </div>
      </section>
    </div>
  );
}
