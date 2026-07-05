import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { onRequest, onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import { getAnthropic, MODEL_DIALOGUE, MODEL_LIGHT } from "./anthropic.js";
import { buildSystemPrompt, ChatContext, ChatMode } from "./prompts.js";

initializeApp();

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const CHAT_MODES: ChatMode[] = ["onboarding", "morning", "evening"];

/**
 * 対話ストリーミング（SSE）。
 * POST body: { mode, messages, context }
 * ヘッダ: Authorization: Bearer <Firebase ID token>
 * レスポンス: `data: {"text": "..."}` の SSE。終端は `data: [DONE]`。
 */
export const chat = onRequest(
  { cors: true, timeoutSeconds: 300, memory: "256MiB" },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "method not allowed" });
      return;
    }

    // 認証（クライアントから直接 Anthropic を叩かせないためのプロキシ）
    const authHeader = req.headers.authorization ?? "";
    const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!idToken) {
      res.status(401).json({ error: "missing auth token" });
      return;
    }
    try {
      await getAuth().verifyIdToken(idToken);
    } catch {
      res.status(401).json({ error: "invalid auth token" });
      return;
    }

    const { mode, messages, context } = req.body as {
      mode?: ChatMode;
      messages?: ChatMessage[];
      context?: ChatContext;
    };
    if (!mode || !CHAT_MODES.includes(mode) || !Array.isArray(messages) || !context) {
      res.status(400).json({ error: "invalid request body" });
      return;
    }

    const system = buildSystemPrompt(mode, context);

    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    try {
      const stream = getAnthropic().messages.stream({
        model: MODEL_DIALOGUE,
        max_tokens: 1024,
        system,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      });

      stream.on("text", (text) => {
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      });

      await stream.finalMessage();
      res.write("data: [DONE]\n\n");
    } catch (err) {
      logger.error("chat stream failed", err);
      res.write(`data: ${JSON.stringify({ error: "AIの応答に失敗しました。少し待って再試行してください。" })}\n\n`);
    } finally {
      res.end();
    }
  },
);

// ---- 軽量タスク（Haiku / 構造化出力） ----

type AssistTask = "extract_ideal_self" | "extract_tasks" | "score_evening" | "weekly_review";

interface AssistRequest {
  task: AssistTask;
  payload: Record<string, unknown>;
}

async function runStructured(
  model: string,
  system: string,
  userContent: string,
  schema: Record<string, unknown>,
  maxTokens = 1024,
): Promise<unknown> {
  const response = await getAnthropic().messages.create({
    model,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: userContent }],
    output_config: { format: { type: "json_schema", schema } },
  });
  const block = response.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") {
    throw new HttpsError("internal", "empty model response");
  }
  return JSON.parse(block.text);
}

function conversationText(messages: ChatMessage[]): string {
  return messages
    .map((m) => `${m.role === "user" ? "ユーザー" : "AI"}: ${m.content}`)
    .join("\n");
}

export const assist = onCall({ cors: true, timeoutSeconds: 120 }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "sign in required");
  }
  const { task, payload } = (request.data ?? {}) as AssistRequest;
  if (!task || !payload) {
    throw new HttpsError("invalid-argument", "task and payload are required");
  }

  switch (task) {
    case "extract_ideal_self": {
      const messages = payload.messages as ChatMessage[];
      return runStructured(
        MODEL_LIGHT,
        `オンボーディング会話から以下を抽出する。
- title: 理想像の短い呼び名（例:「未来の医師」「人を動かすエンジニア」）。10文字前後。
- description: 理想像の説明（1〜2文）。
- habits: 理想像の習慣リスト（3項目程度、それぞれ短く）。
- triggerHabit: 毎日の開始条件（例:「朝食後に机に座ったら」）。会話に無ければ「朝起きたら」。
- minimalRule: 忙しい日の最低ライン（例:「5分だけでもOK」）。会話に無ければ「5分だけでもOK」。
JSONのみを返す。`,
        conversationText(messages),
        {
          type: "object",
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            habits: { type: "array", items: { type: "string" } },
            triggerHabit: { type: "string" },
            minimalRule: { type: "string" },
          },
          required: ["title", "description", "habits", "triggerHabit", "minimalRule"],
          additionalProperties: false,
        },
      );
    }

    case "extract_tasks": {
      const messages = payload.messages as ChatMessage[];
      const firstTask = (payload.firstTask as string | null) ?? null;
      const minimal = payload.minimal === true;
      return runStructured(
        MODEL_LIGHT,
        `朝の対話から今日のタスクリストを抽出する。
- 各タスクは量ベースで完了条件を明記（「二次関数の例題3問」「英単語20個」など）。曖昧なら会話内容から具体化する。
- ${minimal ? "5分だけモード: タスクは1個だけ。" : "タスクは2〜4個。見積もりの70%程度に抑え、詰め込まない。"}
- ${firstTask ? `「${firstTask}」を必ず先頭のタスクにし、isFirstTask を true にする。` : "先頭のタスクの isFirstTask を true にする。"}
JSONのみを返す。`,
        conversationText(messages),
        {
          type: "object",
          properties: {
            tasks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  text: { type: "string" },
                  isFirstTask: { type: "boolean" },
                },
                required: ["text", "isFirstTask"],
                additionalProperties: false,
              },
            },
          },
          required: ["tasks"],
          additionalProperties: false,
        },
      );
    }

    case "score_evening": {
      const messages = payload.messages as ChatMessage[];
      const tasks = (payload.tasks ?? []) as { text: string; done: boolean }[];
      const habits = (payload.idealHabits ?? []) as string[];
      const done = tasks.filter((t) => t.done).length;
      const rate = tasks.length ? done / tasks.length : 0;
      return runStructured(
        MODEL_LIGHT,
        `夜の振り返り会話と実績から3つのスコア（0〜100の整数）を算出し、会話で決まった「明日の最初の1タスク」を抽出する。
- narikiri（なりきり度）: 今日の行動が理想像の習慣（${habits.join(" / ") || "未設定"}）とどれだけ一致していたか。
- pace（達成ペース）: タスク完了率ベース。今日は${tasks.length}タスク中${done}完了（${Math.round(rate * 100)}%）。完了率を基準に±10の範囲で調整。
- motivation（モチベーション）: MVPではタスク達成度を主基準に、会話の前向きさで±10調整。
- tomorrowFirstTask: 会話で決まった明日の最初の1タスク（量ベース・完了条件つき）。決まっていなければ空文字。
JSONのみを返す。`,
        conversationText(messages),
        {
          type: "object",
          properties: {
            narikiri: { type: "integer" },
            pace: { type: "integer" },
            motivation: { type: "integer" },
            tomorrowFirstTask: { type: "string" },
          },
          required: ["narikiri", "pace", "motivation", "tomorrowFirstTask"],
          additionalProperties: false,
        },
      );
    }

    case "weekly_review": {
      const days = (payload.days ?? []) as {
        date: string;
        taskCount: number;
        doneCount: number;
        mode?: string;
        scores?: { narikiri: number; pace: number; motivation: number } | null;
      }[];
      const idealTitle = (payload.idealTitle as string) ?? "理想の自分";
      const summaryInput = days
        .map(
          (d) =>
            `${d.date}: ${d.taskCount}タスク中${d.doneCount}完了` +
            (d.mode && d.mode !== "normal" ? `（${d.mode === "checkin_only" ? "チェックインのみ" : "5分だけモード"}）` : "") +
            (d.scores ? ` なりきり${d.scores.narikiri}/ペース${d.scores.pace}/やる気${d.scores.motivation}` : ""),
        )
        .join("\n");
      return runStructured(
        MODEL_DIALOGUE,
        `あなたは週次振り返り（マネージャー時間）の観察AI。1週間のデータを見て、責めずに、次の3点だけを日本語で簡潔に出す。
- summary: 今週のタスク完了率と全体傾向（2文以内。ユーザーは「${idealTitle}」を目指している）。
- stuckPatterns: 詰まったパターンの観察（1〜2項目。例:「水曜以降タスク量が多すぎた」）。
- adjustments: 来週の調整提案（1〜3項目。タスク量・タイミング・最低ラインの調整など、仕組みの提案のみ。根性論は禁止）。
JSONのみを返す。`,
        `今週のデータ:\n${summaryInput || "記録なし"}`,
        {
          type: "object",
          properties: {
            summary: { type: "string" },
            stuckPatterns: { type: "array", items: { type: "string" } },
            adjustments: { type: "array", items: { type: "string" } },
          },
          required: ["summary", "stuckPatterns", "adjustments"],
          additionalProperties: false,
        },
        1500,
      );
    }

    default:
      throw new HttpsError("invalid-argument", `unknown task: ${task satisfies never}`);
  }
});
