import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-[var(--line)] bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="font-[family-name:var(--font-display)] text-xl text-[var(--brand-deep)]">
            ヒビログ
          </p>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            野沢ヒビキのおすすめレストランを、社員・友人と共有する場。
          </p>
        </div>
        <div className="flex gap-4 text-sm text-[var(--ink-muted)]">
          <Link href="/search" className="hover:text-[var(--brand)]">
            検索
          </Link>
          <Link href="/ai" className="hover:text-[var(--brand)]">
            AIマッチ
          </Link>
          <a
            href="https://www.spacemarket.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[var(--brand)]"
          >
            Design ref
          </a>
        </div>
      </div>
    </footer>
  );
}
