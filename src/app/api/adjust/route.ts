import { NextResponse } from "next/server";
import { completeJson } from "@/lib/ai/complete";
import { ADJUST_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { requireUid } from "@/lib/api/auth";
import { checkRateLimit } from "@/lib/api/rateLimit";

export const runtime = "nodejs";

interface AdjustRequestItem {
  id: string;
  title: string;
  estimatedAmount: number;
  unit?: string;
}

interface AdjustRequestBody {
  items: AdjustRequestItem[];
}

interface AdjustResult {
  items: {
    id: string;
    title: string;
    estimatedAmount: number;
    adjustedAmount: number;
    ratio: number;
    reason: string;
  }[];
  /** A案: ユーザーに明示する全体メッセージ */
  message: string;
}

/**
 * 70%ルールによる目標量調整（A案: 明示）。
 * 使用モデル: adjust(Haiku, max_tokens=768)。想定コスト: 1回 ~$0.001。
 * ※見積もり(estimatedAmount)はそのまま返し、呼び出し側で両方保存する。
 */
export async function POST(request: Request) {
  const authd = await requireUid(request);
  if ("error" in authd) return authd.error;
  const limited = checkRateLimit({
    uid: authd.uid,
    endpoint: "adjust",
    max: 20,
    windowMs: 60_000,
  });
  if (limited) return limited;

  let body: AdjustRequestBody;
  try {
    body = (await request.json()) as AdjustRequestBody;
  } catch {
    return NextResponse.json({ error: "不正なリクエストです。" }, { status: 400 });
  }

  if (
    !Array.isArray(body.items) ||
    body.items.length === 0 ||
    body.items.some((it) => !it.id || !it.title)
  ) {
    return NextResponse.json(
      { error: "items（配列）は必須です。" },
      { status: 400 }
    );
  }

  try {
    const payload = body.items
      .map(
        (it) =>
          `- id:${it.id} / ${it.title}: 見積もり ${it.estimatedAmount}${it.unit ?? ""}`
      )
      .join("\n");

    const result = await completeJson<AdjustResult>("extract", ADJUST_SYSTEM_PROMPT, [
      { role: "user", content: `タスクと見積もり量:\n${payload}` },
    ]);
    const sourceById = new Map(body.items.map((it) => [it.id, it]));
    const items = result.items
      .filter((it) => sourceById.has(it.id))
      .map((it) => {
        const src = sourceById.get(it.id)!;
        return {
          ...it,
          title: src.title,
          estimatedAmount: src.estimatedAmount,
          adjustedAmount:
            typeof it.adjustedAmount === "number"
              ? Math.max(0, Math.round(it.adjustedAmount))
              : Math.max(0, Math.round(src.estimatedAmount * 0.7)),
          ratio:
            typeof it.ratio === "number" && it.ratio > 0
              ? Math.min(Math.max(it.ratio, 0.5), 1)
              : 0.7,
          reason: it.reason || "少し余裕を持たせて、確実に進められる量にしました。",
        };
      });
    return NextResponse.json({
      items,
      message: result.message || "今日は少し余裕を持たせて、これを優先にしよう。",
    });
  } catch {
    return NextResponse.json(
      { error: "調整に失敗しました。再試行してください。" },
      { status: 502 }
    );
  }
}
