import { NextResponse } from "next/server";
import { completeJson } from "@/lib/ai/complete";
import { SCORE_SUMMARY_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { requireUid } from "@/lib/api/auth";
import { checkRateLimit } from "@/lib/api/rateLimit";
import type { ApiMessage, TaskResult } from "@/types";

export const runtime = "nodejs";

interface ScoreRequestBody {
  taskResults: TaskResult[];
  /** 夜の振り返り対話（要約生成の文脈に使う） */
  conversation?: ApiMessage[];
}

interface SummaryResult {
  summary: string;
}

/**
 * 夜の自動スコアリング。
 * 達成率の「数値計算はサーバー側」で行い（再現性・コスト削減）、
 * AI には要約生成のみ任せる。
 * 使用モデル: score(Haiku, max_tokens=512)。想定コスト: 1回 ~$0.001。
 *
 * - 調整後ベース達成率 = 各タスクの min(actual/adjusted,1) の平均
 * - 見積もりベース達成率 = 各タスクの min(actual/estimated,1) の平均（併記）
 * - score = 調整後ベース達成率 を 0-100 に丸めたもの
 */
export async function POST(request: Request) {
  const authd = await requireUid(request);
  if ("error" in authd) return authd.error;
  const limited = checkRateLimit({
    uid: authd.uid,
    endpoint: "score",
    max: 10,
    windowMs: 60_000,
  });
  if (limited) return limited;

  let body: ScoreRequestBody;
  try {
    body = (await request.json()) as ScoreRequestBody;
  } catch {
    return NextResponse.json({ error: "不正なリクエストです。" }, { status: 400 });
  }

  const results = body.taskResults ?? [];
  if (!Array.isArray(results) || results.length === 0) {
    return NextResponse.json(
      { error: "taskResults（配列）は必須です。" },
      { status: 400 }
    );
  }

  const perTaskAdjustedRates = results.map((t) =>
    t.adjustedAmount > 0 ? Math.min(t.actualAmount / t.adjustedAmount, 1) : 0
  );
  const perTaskEstimatedRates = results.map((t) =>
    t.estimatedAmount > 0 ? Math.min(t.actualAmount / t.estimatedAmount, 1) : 0
  );
  const avg = (arr: number[]) =>
    arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  const achievementRateAdjusted = avg(perTaskAdjustedRates);
  const achievementRateEstimated = avg(perTaskEstimatedRates);
  const score = Math.round(achievementRateAdjusted * 100);

  // AI には要約のみ依頼（失敗してもスコアは返せるようにする）
  let summary = "";
  try {
    const ctx = [
      `達成データ:`,
      ...results.map(
        (t) =>
          `- ${t.title}: 見積もり${t.estimatedAmount} / 調整後${t.adjustedAmount} / 実績${t.actualAmount}`
      ),
      ``,
      `調整後ベース達成率: ${Math.round(achievementRateAdjusted * 100)}%`,
      `見積もりベース達成率: ${Math.round(achievementRateEstimated * 100)}%`,
    ].join("\n");

    const convText =
      body.conversation && body.conversation.length
        ? `\n\n振り返り対話の抜粋:\n${body.conversation
            .map((m) => `${m.role}: ${m.content}`)
            .join("\n")}`
        : "";

    const res = await completeJson<SummaryResult>(
      "score",
      SCORE_SUMMARY_SYSTEM_PROMPT,
      [{ role: "user", content: ctx + convText }]
    );
    summary = res.summary ?? "";
  } catch {
    summary = "今日もお疲れさまでした。記録は残せています。明日もできるところから。";
  }

  return NextResponse.json({
    score,
    achievementRateAdjusted,
    achievementRateEstimated,
    summary,
  });
}
