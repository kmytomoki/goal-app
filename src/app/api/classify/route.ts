import { NextResponse } from "next/server";
import { completeJson } from "@/lib/ai/complete";
import { CLASSIFY_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { requireUid } from "@/lib/api/auth";
import { checkRateLimit } from "@/lib/api/rateLimit";
import type { TaskCategory } from "@/types";

export const runtime = "nodejs";

interface ClassifyRequestBody {
  /** 分類したいタスク一覧 */
  tasks: { id: string; title: string }[];
}

interface ClassifyResult {
  items: { id: string; title: string; category: TaskCategory }[];
}

/**
 * 「絶対やる(must) / できたらやる(optional)」分類。
 * 使用モデル: classify(Haiku, max_tokens=512)。想定コスト: 1回 < $0.001。
 */
export async function POST(request: Request) {
  const authd = await requireUid(request);
  if ("error" in authd) return authd.error;
  const limited = checkRateLimit({
    uid: authd.uid,
    endpoint: "classify",
    max: 30,
    windowMs: 60_000,
  });
  if (limited) return limited;

  let body: ClassifyRequestBody;
  try {
    body = (await request.json()) as ClassifyRequestBody;
  } catch {
    return NextResponse.json({ error: "不正なリクエストです。" }, { status: 400 });
  }

  if (
    !Array.isArray(body.tasks) ||
    body.tasks.length === 0 ||
    body.tasks.some((t) => !t.id || !t.title)
  ) {
    return NextResponse.json(
      { error: "tasks（配列）は必須です。" },
      { status: 400 }
    );
  }

  try {
    const result = await completeJson<ClassifyResult>("classify", CLASSIFY_SYSTEM_PROMPT, [
      {
        role: "user",
        content: `タスク一覧:\n${body.tasks
          .map((t) => `- id:${t.id} / title:${t.title}`)
          .join("\n")}`,
      },
    ]);

    // must は最大3つに制限（モデルが超えた場合の保険）
    let mustCount = 0;
    const sourceById = new Map(body.tasks.map((t) => [t.id, t.title]));
    const normalized = result.items
      .filter((it) => sourceById.has(it.id))
      .map((it) => ({ ...it, title: sourceById.get(it.id) ?? it.title }));
    const items = normalized.map((it) => {
      if (it.category === "must") {
        mustCount += 1;
        if (mustCount > 3) return { ...it, category: "optional" as TaskCategory };
      }
      return it;
    });

    return NextResponse.json({ items });
  } catch (e) {
    console.error("[api/classify] failed:", e);
    return NextResponse.json(
      { error: "分類に失敗しました。再試行してください。" },
      { status: 502 }
    );
  }
}
