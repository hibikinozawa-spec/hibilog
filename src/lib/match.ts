import type { Restaurant } from "./types";
import { restaurants } from "./restaurants";

export interface MatchResult {
  restaurant: Restaurant;
  score: number;
  reasons: string[];
}

const KEYWORD_WEIGHTS: { keys: string[]; weight: number; sceneBoost?: string; field?: "scenes" | "tags" | "cuisine" | "price" | "private" }[] = [
  { keys: ["会食", "ビジネス", "商談", "クライアント", "お客様"], weight: 28, sceneBoost: "会食" },
  { keys: ["接待", "フォーマル", "重要"], weight: 30, sceneBoost: "接待" },
  { keys: ["個室", "プライベート", "秘密", "静か"], weight: 26, sceneBoost: "個室" },
  { keys: ["カジュアル", "気軽", "ラフ", "チーム", "飲み"], weight: 24, sceneBoost: "カジュアル" },
  { keys: ["とっておき", "特別", "スペシャル", "一軒"], weight: 28, sceneBoost: "とっておき" },
  { keys: ["記念日", "アニバーサリー", "お祝い", "誕生日"], weight: 30, sceneBoost: "記念日" },
  { keys: ["コスパ", "安い", "お得", "リーズナブル"], weight: 26, sceneBoost: "コスパ" },
  { keys: ["デート", "二人", "ロマンチック"], weight: 24, sceneBoost: "デート" },
  { keys: ["鮨", "寿司", "すし", "オマカセ"], weight: 22 },
  { keys: ["和食", "懐石", "日本料理"], weight: 20 },
  { keys: ["肉", "焼肉", "ステーキ", "和牛"], weight: 20 },
  { keys: ["イタリアン", "パスタ", "ピザ"], weight: 18 },
  { keys: ["フレンチ", "フランス"], weight: 18 },
  { keys: ["ミドル", "中価格", "中くらい"], weight: 18 },
  { keys: ["エグゼクティブ", "高級", "ハイクラス", "贅沢"], weight: 22 },
  { keys: ["カジュアル価格", "安い店"], weight: 16 },
  { keys: ["銀座"], weight: 12 },
  { keys: ["六本木", "麻布"], weight: 12 },
  { keys: ["築地"], weight: 12 },
  { keys: ["渋谷", "恵比寿"], weight: 10 },
  { keys: ["新宿"], weight: 10 },
  { keys: ["京都", "祇園"], weight: 14 },
  { keys: ["ロサンゼルス", "LA", "エルエー"], weight: 14 },
];

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

export function matchRestaurants(query: string, limit = 10): MatchResult[] {
  const q = query.trim();
  if (!q) return [];

  const lower = q.toLowerCase();
  const results: MatchResult[] = restaurants.map((restaurant) => {
    let score = 35;
    const reasons: string[] = [];

    for (const rule of KEYWORD_WEIGHTS) {
      const hit = rule.keys.some((k) => lower.includes(k.toLowerCase()));
      if (!hit) continue;

      score += rule.weight * 0.35;

      if (rule.sceneBoost && restaurant.scenes.includes(rule.sceneBoost as Restaurant["scenes"][number])) {
        score += rule.weight * 0.55;
        reasons.push(`${rule.sceneBoost}に適合`);
      }

      if (rule.keys.some((k) => ["鮨", "寿司", "すし"].includes(k)) && restaurant.cuisine === "鮨") {
        score += 18;
        reasons.push("鮨カテゴリ一致");
      }
      if (rule.keys.some((k) => ["和食", "懐石"].includes(k)) && restaurant.cuisine === "和食") {
        score += 16;
        reasons.push("和食カテゴリ一致");
      }
      if (rule.keys.some((k) => ["肉", "焼肉", "ステーキ"].includes(k)) && restaurant.cuisine === "肉") {
        score += 16;
        reasons.push("肉カテゴリ一致");
      }
      if (rule.keys.some((k) => k.includes("イタリアン")) && restaurant.cuisine === "イタリアン") {
        score += 14;
        reasons.push("イタリアン一致");
      }
      if (rule.keys.some((k) => k.includes("フレンチ")) && restaurant.cuisine === "フレンチ") {
        score += 14;
        reasons.push("フレンチ一致");
      }
      if (rule.keys.some((k) => ["ミドル", "中価格"].includes(k)) && restaurant.priceTier === "middle") {
        score += 14;
        reasons.push("ミドル価格帯");
      }
      if (
        rule.keys.some((k) => ["エグゼクティブ", "高級", "ハイクラス"].includes(k)) &&
        restaurant.priceTier === "executive"
      ) {
        score += 16;
        reasons.push("エグゼクティブ価格帯");
      }
      if (rule.keys.some((k) => ["コスパ", "安い", "お得"].includes(k)) && restaurant.priceTier === "casual") {
        score += 14;
        reasons.push("カジュアル価格帯");
      }
      if (rule.keys.some((k) => ["個室", "プライベート"].includes(k)) && restaurant.privateRoom) {
        score += 12;
        reasons.push("個室あり");
      }
      if (rule.keys.some((k) => restaurant.area.includes(k) || restaurant.address.includes(k))) {
        score += 10;
        reasons.push(`${restaurant.area}エリア`);
      }
    }

    // Soft boost by rating
    score += (restaurant.rating - 4) * 8;

    // Deduplicate reasons
    const uniqueReasons = [...new Set(reasons)].slice(0, 3);
    if (uniqueReasons.length === 0) {
      uniqueReasons.push(`${restaurant.cuisine} / ${restaurant.priceTier}`);
    }

    return {
      restaurant,
      score: Math.round(clamp(score)),
      reasons: uniqueReasons,
    };
  });

  return results
    .sort((a, b) => b.score - a.score || b.restaurant.rating - a.restaurant.rating)
    .slice(0, limit);
}

export async function matchWithOptionalAI(query: string, limit = 10): Promise<{
  results: MatchResult[];
  engine: "heuristic" | "openai";
}> {
  const heuristic = matchRestaurants(query, limit);
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return { results: heuristic, engine: "heuristic" };
  }

  try {
    const catalog = restaurants.map((r) => ({
      id: r.id,
      name: r.name,
      cuisine: r.cuisine,
      priceTier: r.priceTier,
      scenes: r.scenes,
      area: r.area,
      privateRoom: r.privateRoom,
      tags: r.tags,
      description: r.description,
    }));

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "あなたは飲食店レコメンドAIです。ユーザーの利用シーン・気分に合いそうな店をカタログから選び、score(0-100)とreasons(短い日本語配列)を付けてJSONで返してください。形式: {\"matches\":[{\"id\":\"...\",\"score\":90,\"reasons\":[\"...\"]}]} 最大10件。",
          },
          {
            role: "user",
            content: JSON.stringify({ query, catalog }),
          },
        ],
      }),
    });

    if (!res.ok) {
      return { results: heuristic, engine: "heuristic" };
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    const parsed = JSON.parse(content) as {
      matches: { id: string; score: number; reasons: string[] }[];
    };

    const byId = new Map(restaurants.map((r) => [r.id, r]));
    const results: MatchResult[] = (parsed.matches || [])
      .map((m) => {
        const restaurant = byId.get(m.id);
        if (!restaurant) return null;
        return {
          restaurant,
          score: Math.round(clamp(Number(m.score) || 0)),
          reasons: (m.reasons || []).slice(0, 3),
        };
      })
      .filter(Boolean)
      .slice(0, limit) as MatchResult[];

    if (results.length === 0) {
      return { results: heuristic, engine: "heuristic" };
    }

    return { results, engine: "openai" };
  } catch {
    return { results: heuristic, engine: "heuristic" };
  }
}
