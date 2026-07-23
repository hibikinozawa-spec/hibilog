import Link from "next/link";
import { areas, cuisines, priceTiers, preferenceScenes } from "@/lib/restaurants";

function chipClass(active: boolean) {
  return active
    ? "rounded-full bg-[var(--brand)] px-3 py-1.5 text-xs font-medium text-white"
    : "rounded-full border border-[var(--line)] bg-white px-3 py-1.5 text-xs text-[var(--ink-muted)] transition hover:border-[var(--brand)] hover:text-[var(--brand)]";
}

export function SearchFilters({
  current,
}: {
  current: {
    cuisine?: string;
    price?: string;
    scene?: string;
    area?: string;
    privateRoom?: string;
    q?: string;
  };
}) {
  function href(patch: Record<string, string | undefined>) {
    const next = { ...current, ...patch };
    const params = new URLSearchParams();
    Object.entries(next).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    const s = params.toString();
    return s ? `/search?${s}` : "/search";
  }

  return (
    <div className="space-y-4 rounded-2xl border border-[var(--line)] bg-white p-4">
      <div>
        <p className="mb-2 text-xs font-semibold tracking-wide text-[var(--ink-muted)]">
          こだわり条件
        </p>
        <div className="flex flex-wrap gap-2">
          {priceTiers.map((p) => (
            <Link
              key={p.id}
              href={href({ price: current.price === p.id ? undefined : p.id })}
              className={chipClass(current.price === p.id)}
            >
              {p.label}
            </Link>
          ))}
          {preferenceScenes.map((s) => (
            <Link
              key={s.id}
              href={href({ scene: current.scene === s.id ? undefined : s.id })}
              className={chipClass(current.scene === s.id)}
            >
              {s.label}
            </Link>
          ))}
          <Link
            href={href({
              privateRoom: current.privateRoom === "1" ? undefined : "1",
            })}
            className={chipClass(current.privateRoom === "1")}
          >
            個室あり
          </Link>
        </div>
      </div>
      <div>
        <p className="mb-2 text-xs font-semibold tracking-wide text-[var(--ink-muted)]">
          ジャンル
        </p>
        <div className="flex flex-wrap gap-2">
          {cuisines.map((c) => (
            <Link
              key={c}
              href={href({ cuisine: current.cuisine === c ? undefined : c })}
              className={chipClass(current.cuisine === c)}
            >
              {c}
            </Link>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-xs font-semibold tracking-wide text-[var(--ink-muted)]">
          エリア
        </p>
        <div className="flex flex-wrap gap-2">
          {areas.map((a) => (
            <Link
              key={a}
              href={href({ area: current.area === a ? undefined : a })}
              className={chipClass(current.area === a)}
            >
              {a}
            </Link>
          ))}
        </div>
      </div>
      {(current.cuisine ||
        current.price ||
        current.scene ||
        current.area ||
        current.privateRoom ||
        current.q) && (
        <Link href="/search" className="inline-block text-sm text-[var(--accent)]">
          条件をクリア
        </Link>
      )}
    </div>
  );
}
