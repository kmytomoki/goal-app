import { getAnthropic } from "@/lib/ai/client";
import { MODELS } from "@/lib/ai/models";
import { buildChatSystemPrompt } from "@/lib/ai/prompts";
import { withRetry } from "@/lib/ai/retry";
import { requireUid } from "@/lib/api/auth";
import { checkRateLimit } from "@/lib/api/rateLimit";
import type { ApiMessage, ConversationType, AiStyle } from "@/types";

export const runtime = "nodejs";

interface ChatRequestBody {
  type: ConversationType;
  aiStyle: AiStyle;
  messages: ApiMessage[];
  /** 追加の文脈（ゴール要約など）を system に足したい場合 */
  context?: string;
}

/**
 * 対話のストリーミング応答。
 * 使用モデル: dialogue(Sonnet, max_tokens=1024)。想定コスト: 1往復 ~$0.01-0.03。
 * 応答はプレーンテキストのチャンクをそのまま流す（クライアントで逐次表示）。
 */
export async function POST(request: Request) {
  const authd = await requireUid(request);
  if ("error" in authd) return authd.error;
  const limited = checkRateLimit({
    uid: authd.uid,
    endpoint: "chat",
    max: 24,
    windowMs: 60_000,
  });
  if (limited) return limited;

  let body: ChatRequestBody;
  try {
    body = (await request.json()) as ChatRequestBody;
  } catch {
    return new Response(JSON.stringify({ error: "不正なリクエストです。" }), {
      status: 400,
    });
  }

  const { type, aiStyle, messages, context } = body;
  if (!type || !aiStyle || !Array.isArray(messages)) {
    return new Response(
      JSON.stringify({ error: "type, aiStyle, messages は必須です。" }),
      { status: 400 }
    );
  }

  const baseSystem = buildChatSystemPrompt(type, aiStyle);
  const system = context ? `${baseSystem}\n\n参考情報:\n${context}` : baseSystem;
  const model = MODELS.dialogue;
  const client = getAnthropic();

  const encoder = new TextEncoder();

  try {
    // ストリーム開始（接続確立）部分のみリトライ対象にする
    const stream = await withRetry(async () =>
      client.messages.stream({
        model: model.name,
        max_tokens: model.maxTokens,
        system,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      })
    );

    const readable = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              controller.enqueue(encoder.encode(event.delta.text));
            }
          }
          controller.close();
        } catch (err) {
          // ストリーム途中のエラーは末尾にマーカーを流して通知
          controller.enqueue(
            encoder.encode("\n[[STREAM_ERROR]]")
          );
          controller.error(err);
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    const status =
      typeof (err as { status?: number })?.status === "number"
        ? (err as { status: number }).status
        : 500;
    return new Response(
      JSON.stringify({
        error: "AI応答の生成に失敗しました。時間をおいて再試行してください。",
      }),
      { status: status === 429 ? 429 : 502 }
    );
  }
}
