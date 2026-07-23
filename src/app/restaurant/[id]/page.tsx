import Link from "next/link";
import { notFound } from "next/navigation";
import { GoogleMapEmbed } from "@/components/google-map-embed";
import { getRestaurantById, priceLabel } from "@/lib/restaurants";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const r = getRestaurantById(id);
  return { title: r?.name ?? "店舗" };
}

export default async function RestaurantPage({ params }: Props) {
  const { id } = await params;
  const r = getRestaurantById(id);
  if (!r) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Link href="/search" className="text-sm text-[var(--brand)]">
        ← 検索に戻る
      </Link>

      <div className="mt-4 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <div className="overflow-hidden rounded-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={r.image}
              alt={r.name}
              className="aspect-[16/10] w-full object-cover"
            />
          </div>
          <h1 className="mt-6 font-[family-name:var(--font-display)] text-4xl text-[var(--brand-deep)]">
            {r.name}
          </h1>
          {r.nameEn && (
            <p className="mt-1 text-sm text-[var(--ink-muted)]">{r.nameEn}</p>
          )}
          <p className="mt-4 leading-relaxed text-[var(--ink-muted)]">
            {r.description.replace(/Googleマップの「[^」]+」より。?/g, "").trim()}
          </p>

          <dl className="mt-6 grid gap-3 rounded-2xl border border-[var(--line)] bg-white p-5 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-[var(--ink-muted)]">ジャンル</dt>
              <dd className="font-medium">{r.cuisine}</dd>
            </div>
            <div>
              <dt className="text-[var(--ink-muted)]">値段帯</dt>
              <dd className="font-medium">
                {priceLabel(r.priceTier)}（夜 {r.priceDinner}）
              </dd>
            </div>
            <div>
              <dt className="text-[var(--ink-muted)]">エリア</dt>
              <dd className="font-medium">{r.area}</dd>
            </div>
            <div>
              <dt className="text-[var(--ink-muted)]">最寄駅</dt>
              <dd className="font-medium">{r.nearestStation || "—"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-[var(--ink-muted)]">住所</dt>
              <dd className="font-medium">{r.address}</dd>
            </div>
          </dl>

          <div className="mt-4 flex flex-wrap gap-2">
            {r.scenes.map((s) => (
              <Link
                key={s}
                href={`/search?scene=${encodeURIComponent(s)}`}
                className="rounded-full bg-[var(--brand-soft)] px-3 py-1 text-xs text-[var(--brand-deep)]"
              >
                {s}
              </Link>
            ))}
            {r.tags.map((t) => (
              <span
                key={t}
                className="rounded-full border border-[var(--line)] px-3 py-1 text-xs text-[var(--ink-muted)]"
              >
                {t}
              </span>
            ))}
          </div>

          <div className="mt-6">
            <Link
              href="/ai"
              className="inline-flex rounded-full border border-[var(--line)] bg-white px-5 py-3 text-sm font-medium text-[var(--ink)] hover:border-[var(--brand)]"
            >
              AIで似たシーンを探す
            </Link>
          </div>
        </div>

        <div>
          <GoogleMapEmbed
            name={r.name}
            googleMapsUrl={r.googleMapsUrl}
            lat={r.lat}
            lng={r.lng}
            query={r.googlePlaceQuery}
            className="h-[420px]"
          />
        </div>
      </div>
    </div>
  );
}
