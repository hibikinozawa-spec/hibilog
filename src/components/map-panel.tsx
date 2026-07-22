"use client";

import dynamic from "next/dynamic";
import type { Restaurant } from "@/lib/types";

const RestaurantMap = dynamic(
  () => import("./restaurant-map").then((m) => m.RestaurantMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-[var(--line)] bg-[var(--brand-soft)] text-sm text-[var(--ink-muted)]">
        マップを読み込み中…
      </div>
    ),
  },
);

export function MapPanel({
  restaurants,
  className,
}: {
  restaurants: Restaurant[];
  className?: string;
}) {
  return <RestaurantMap restaurants={restaurants} className={className} />;
}
