import { NextResponse } from "next/server";
import { matchWithOptionalAI } from "@/lib/match";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const query = typeof body.query === "string" ? body.query.trim() : "";
    if (!query) {
      return NextResponse.json({ error: "クエリを入力してください" }, { status: 400 });
    }
    if (query.length > 500) {
      return NextResponse.json({ error: "クエリが長すぎます" }, { status: 400 });
    }

    const { results, engine } = await matchWithOptionalAI(query, 10);

    return NextResponse.json({
      engine,
      results: results.map((r) => ({
        score: r.score,
        reasons: r.reasons,
        restaurant: r.restaurant,
      })),
    });
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
