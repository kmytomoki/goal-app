import { getAnthropic, extractJson } from "@/lib/ai/client";
import { MODELS, type ModelKey } from "@/lib/ai/models";
import { withRetry } from "@/lib/ai/retry";
import type { ApiMessage } from "@/types";

/**
 * 非ストリーミングのテキスト生成。classify / adjust / score で使う。
 * リトライ（指数バックオフ）込み。max_tokens はモデル定義から適用。
 */
export async function completeText(
  modelKey: ModelKey,
  system: string,
  messages: ApiMessage[]
): Promise<string> {
  const model = MODELS[modelKey];
  const client = getAnthropic();

  const res = await withRetry(() =>
    client.messages.create({
      model: model.name,
      max_tokens: model.maxTokens,
      system,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    })
  );

  const text = res.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("");
  return text;
}

/** JSON を返す系プロンプトの結果をパースして返す */
export async function completeJson<T>(
  modelKey: ModelKey,
  system: string,
  messages: ApiMessage[]
): Promise<T> {
  const text = await completeText(modelKey, system, messages);
  return extractJson<T>(text);
}
