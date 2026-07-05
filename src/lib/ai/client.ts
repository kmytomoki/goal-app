import Anthropic from "@anthropic-ai/sdk";
import { assertModelIds } from "@/lib/ai/models";

/**
 * Anthropic クライアント（サーバー側専用）。
 * APIキーは環境変数からのみ読む。クライアントバンドルに含めてはならない。
 */
let cached: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (cached) return cached;
  assertModelIds();
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY が未設定です。.env.local を確認してください。");
  }
  cached = new Anthropic({
    apiKey,
    // 個々の呼び出し側でも制御するが、保険として既定タイムアウトを設定
    timeout: 60_000,
    maxRetries: 0, // リトライは withRetry で一元管理するため SDK 側は無効化
  });
  return cached;
}

/**
 * JSON を返す系のプロンプトから、最初の JSON オブジェクトを安全に抽出する。
 * モデルが前後に文を付けてしまった場合のフォールバック。
 */
export function extractJson<T>(text: string): T {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1)) as T;
    }
    throw new Error("AI応答からJSONを抽出できませんでした。");
  }
}
