import Link from "next/link";
import { restaurantSortOptions } from "@/lib/sort-restaurants";

export function SearchSortBar({
  current,
}: {
  current: {
    q?: string;
    cuisine?: string;
    price?: string;
    scene?: string;
    area?: string;
    list?: string;
    privateRoom?: string;
    sort?: string;
  };
}) {
  const active = current.sort || "featured";

  function href(sort: string | undefined) {
    const next = { ...current, sort: sort === "featured" ? undefined : sort };
    const params = new URLSearchParams();
    Object.entries(next).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    const s = params.toString();
    return s ? `/search?${s}` : "/search";
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[var(--line)] bg-white px-4 py-3">
      <span className="text-xs font-semibold tracking-wide text-[var(--ink-muted)]">
        並び替え
      </span>
      {restaurantSortOptions.map((option) => (
        <Link
          key={option.id}
          href={href(option.id)}
          className={
            active === option.id
              ? "rounded-full bg-[var(--brand)] px-3 py-1.5 text-xs font-medium text-white"
              : "rounded-full border border-[var(--line)] bg-white px-3 py-1.5 text-xs text-[var(--ink-muted)] transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
          }
        >
          {option.label}
        </Link>
      ))}
    </div>
  );
}
