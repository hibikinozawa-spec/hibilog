import Link from "next/link";

const links = [
  { href: "/search", label: "お店を探す" },
  { href: "/ai", label: "AIマッチ" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line)]/80 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="group flex items-baseline gap-2">
          <span className="font-[family-name:var(--font-display)] text-xl text-[var(--brand-deep)] transition-colors group-hover:text-[var(--brand)]">
            ヒビログ
          </span>
          <span className="hidden text-xs text-[var(--ink-muted)] sm:inline">
            Hibilog
          </span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full px-3 py-2 text-sm text-[var(--ink-muted)] transition hover:bg-[var(--brand-soft)] hover:text-[var(--brand-deep)]"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
