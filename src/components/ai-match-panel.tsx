"use client";

import { FormEvent, useState } from "react";
import { RestaurantCard } from "./restaurant-card";
import type { MatchResult } from "@/lib/match";

const EXAMPLES = [
  "お客様とのミドル会食、個室希望",
  "記念日に使えるとっておきの鮨",
  "カジュアルでコスパの良い焼肉",
  "京都で特別な和食",
];

export function AiMatchPanel() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [engine, setEngine] = useState<"heuristic" | "openai" | null>(null);
  const [results, setResults] = useState<MatchResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function runMatch(text: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "マッチに失敗しました");
      setResults(data.results);
      setEngine(data.engine);
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    void runMatch(query.trim());
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={onSubmit}
        className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-[var(--shadow)]"
      >
        <label className="block">
          <span className="text-sm font-medium text-[var(--ink)]">
            利用シーンや気分を入力
          </span>
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            rows={3}
            placeholder="例）大事なクライアントとの会食。個室で、ミドル価格の和食がいい"
            className="mt-2 w-full resize-none rounded-xl border border-[var(--line)] bg-[var(--bg)] px-4 py-3 text-sm outline-none ring-[var(--brand)] focus:ring-2"
          />
        </label>
        <div className="mt-3 flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => {
                setQuery(ex);
                void runMatch(ex);
              }}
              className="rounded-full border border-[var(--line)] px-3 py-1.5 text-xs text-[var(--ink-muted)] transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
            >
              {ex}
            </button>
          ))}
        </div>
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="mt-4 rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-white transition hover:brightness-95 disabled:opacity-50"
        >
          {loading ? "マッチング中…" : "Top10を表示"}
        </button>
        {engine && (
          <p className="mt-2 text-xs text-[var(--ink-muted)]">
            エンジン: {engine === "openai" ? "OpenAI + カタログ" : "ヒビログ・シーンマッチ（ローカル）"}
          </p>
        )}
        {error && <p className="mt-2 text-sm text-[var(--accent)]">{error}</p>}
      </form>

      {results.length > 0 && (
        <div>
          <h2 className="mb-4 font-[family-name:var(--font-display)] text-2xl text-[var(--brand-deep)]">
            マッチ度 Top {results.length}
          </h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((r) => (
              <RestaurantCard
                key={r.restaurant.id}
                restaurant={r.restaurant}
                matchScore={r.score}
                reasons={r.reasons}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
