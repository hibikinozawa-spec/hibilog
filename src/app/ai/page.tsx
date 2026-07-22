import { AiMatchPanel } from "@/components/ai-match-panel";

export const metadata = {
  title: "AIマッチ",
};

export default function AiPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--brand-deep)] sm:text-4xl">
        AIマッチ Top10
      </h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--ink-muted)]">
        会食・個室・記念日など、シーンや気分を短く書くと、ヒビログの保存店からマッチ度の高い順に最大10件を提案します。
        <code className="mx-1 rounded bg-[var(--brand-soft)] px-1">OPENAI_API_KEY</code>
        があればより高精度、なくてもローカルスコアで動作します。
      </p>
      <div className="mt-8">
        <AiMatchPanel />
      </div>
    </div>
  );
}
