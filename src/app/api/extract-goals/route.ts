import { NextResponse } from "next/server";
import { completeJson } from "@/lib/ai/complete";
import {
  EXTRACT_GOALS_SYSTEM_PROMPT,
  EXTRACT_TASKS_FROM_WOOP_SYSTEM_PROMPT,
} from "@/lib/ai/prompts";
import { requireUid } from "@/lib/api/auth";
import { checkRateLimit } from "@/lib/api/rateLimit";
import type { ApiMessage } from "@/types";

export const runtime = "nodejs";

type ExtractMode = "onboarding_goals" | "woop_tasks";

interface ExtractBody {
  mode: ExtractMode;
  messages: ApiMessage[];
}

interface GoalsExtractResult {
  vision5y: string;
  goal3m: string;
  weekly: string;
}

interface WoopTasksExtractResult {
  items: Array<{ title: string; estimatedAmount: number; unit?: string }>;
}

/**
 * 会話履歴から
 * - オンボ目標（5y/3m/weekly）
 * - WOOPから今日のタスク候補
 * を抽出する。
 */
export async function POST(request: Request) {
  const authd = await requireUid(request);
  if ("error" in authd) return authd.error;
  const limited = checkRateLimit({
    uid: authd.uid,
    endpoint: "extract-goals",
    max: 15,
    windowMs: 60_000,
  });
  if (limited) return limited;

  let body: ExtractBody;
  try {
    body = (await request.json()) as ExtractBody;
  } catch {
    return NextResponse.json({ error: "不正なリクエストです。" }, { status: 400 });
  }
  if (!body.mode || !Array.isArray(body.messages) || body.messages.length === 0) {
    return NextResponse.json(
      { error: "mode と messages は必須です。" },
      { status: 400 }
    );
  }

  const transcript = body.messages
    .map((m) => `${m.role === "assistant" ? "AI" : "ユーザー"}: ${m.content}`)
    .join("\n");

  try {
    if (body.mode === "onboarding_goals") {
      const result = await completeJson<GoalsExtractResult>(
        "extract",
        EXTRACT_GOALS_SYSTEM_PROMPT,
        [{ role: "user", content: transcript }]
      );
      return NextResponse.json({
        vision5y: result.vision5y ?? "",
        goal3m: result.goal3m ?? "",
        weekly: result.weekly ?? "",
      });
    }
    const result = await completeJson<WoopTasksExtractResult>(
      "extract",
      EXTRACT_TASKS_FROM_WOOP_SYSTEM_PROMPT,
      [{ role: "user", content: transcript }]
    );
    const items = (result.items ?? [])
      .filter((it) => it.title?.trim())
      .slice(0, 5)
      .map((it) => ({
        title: it.title.trim(),
        estimatedAmount: Number(it.estimatedAmount) > 0 ? Number(it.estimatedAmount) : 1,
        unit: it.unit?.trim() || "",
      }));
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json(
      { error: "抽出に失敗しました。会話をもう少し進めて再試行してください。" },
      { status: 502 }
    );
  }
}
