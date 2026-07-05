import Anthropic from "@anthropic-ai/sdk";

// モデル方針（コスト最適化）:
// - 対話生成（オンボーディング / 朝 / 夜 / 週次）: claude-sonnet-4-6
// - 軽量タスク（抽出・スコア算出）: claude-haiku-4-5
export const MODEL_DIALOGUE = "claude-sonnet-4-6";
export const MODEL_LIGHT = "claude-haiku-4-5";

let client: Anthropic | null = null;

// SDK は 429 / 5xx / 接続エラーを exponential backoff で自動リトライする。
// 仕様（最大3回リトライ）に合わせて maxRetries を 3 に設定。
export function getAnthropic(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not set");
    }
    client = new Anthropic({ apiKey, maxRetries: 3 });
  }
  return client;
}
