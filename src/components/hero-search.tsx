"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { areas, priceTiers, scenes } from "@/lib/restaurants";

export function HeroSearch() {
  const router = useRouter();
  const [area, setArea] = useState("");
  const [scene, setScene] = useState("");
  const [price, setPrice] = useState("");
  const [q, setQ] = useState("");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (area) params.set("area", area);
    if (scene) params.set("scene", scene);
    if (price) params.set("price", price);
    if (q.trim()) params.set("q", q.trim());
    router.push(`/search?${params.toString()}`);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="animate-rise-delay mx-auto w-full max-w-4xl rounded-2xl border border-white/60 bg-white/95 p-3 shadow-[var(--shadow)] backdrop-blur sm:p-4"
    >
      <div className="grid gap-2 sm:grid-cols-4">
        <label className="flex flex-col gap-1 rounded-xl bg-[var(--bg)] px-3 py-2">
          <span className="text-[11px] font-medium tracking-wide text-[var(--ink-muted)]">
            エリア
          </span>
          <select
            value={area}
            onChange={(e) => setArea(e.target.value)}
            className="bg-transparent text-sm outline-none"
          >
            <option value="">指定なし</option>
            {areas.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 rounded-xl bg-[var(--bg)] px-3 py-2">
          <span className="text-[11px] font-medium tracking-wide text-[var(--ink-muted)]">
            利用シーン
          </span>
          <select
            value={scene}
            onChange={(e) => setScene(e.target.value)}
            className="bg-transparent text-sm outline-none"
          >
            <option value="">例）会食、記念日</option>
            {scenes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 rounded-xl bg-[var(--bg)] px-3 py-2">
          <span className="text-[11px] font-medium tracking-wide text-[var(--ink-muted)]">
            値段帯
          </span>
          <select
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="bg-transparent text-sm outline-none"
          >
            <option value="">指定なし</option>
            {priceTiers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 rounded-xl bg-[var(--bg)] px-3 py-2 sm:col-span-1">
          <span className="text-[11px] font-medium tracking-wide text-[var(--ink-muted)]">
            キーワード
          </span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="個室、鮨…"
            className="bg-transparent text-sm outline-none placeholder:text-[var(--ink-muted)]/70"
          />
        </label>
      </div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-[var(--ink-muted)]">
          食べログの「利用シーンから探す」感覚で、ヒビキのおすすめ店を絞り込めます。
        </p>
        <button
          type="submit"
          className="rounded-full bg-[var(--brand)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[var(--brand-deep)]"
        >
          検索する
        </button>
      </div>
    </form>
  );
}
