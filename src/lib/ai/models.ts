/**
 * AI モデルの用途別定義。
 * コスト最適化のため対話系は Sonnet、軽量処理は Haiku を基本とする。
 * 各呼び出しには max_tokens の上限を設け、想定コストをコメントで明記する。
 *
 * ※ 単価はリリース時点で Anthropic の最新料金を再確認すること。
 *   下記コストは概算の目安（USD, 2025時点の一般的なオーダー感）。
 */
export const MODELS = {
  /**
   * 対話用（オンボーディング / 朝のWOOP / 夜の振り返り）。
   * maxTokens=1024。1往復の想定: 入力 ~1.5-3k tok + 出力 ~0.5-1k tok。
   * 概算コスト: 1往復あたり おおよそ $0.01-0.03 程度。
   */
  dialogue: {
    name: "claude-sonnet-4-6",
    maxTokens: 1024,
  },

  /**
   * 軽量な分類・タグ付け（絶対やる/できたらやるの仕分け）。
   * maxTokens=512。JSON を返させるため出力は短い。
   * 概算コスト: 1回あたり $0.001 未満を想定。
   */
  classify: {
    name: "claude-haiku-4-5-20251001",
    maxTokens: 512,
  },

  /**
   * 70%ルールによる目標量調整。
   * コスト優先で Haiku を基本にする（構造化された数値調整のため）。
   * maxTokens=768。
   * 概算コスト: 1回あたり $0.001 程度を想定。
   */
  adjust: {
    name: "claude-haiku-4-5-20251001",
    maxTokens: 768,
  },

  /**
   * 夜の自動スコアリング（達成率の算出補助・要約）。
   * 数値計算はサーバー側で行い、AI には要約生成のみ任せる。
   * Haiku で十分。maxTokens=512。
   * 概算コスト: 1回あたり $0.001 程度を想定。
   */
  score: {
    name: "claude-haiku-4-5-20251001",
    maxTokens: 512,
  },

  /**
   * 対話ログから目標/タスク候補を抽出する軽量処理。
   * maxTokens=768。概算コスト: 1回 ~$0.001。
   */
  extract: {
    name: "claude-haiku-4-5-20251001",
    maxTokens: 768,
  },
} as const;

export type ModelKey = keyof typeof MODELS;

const KNOWN_MODEL_PREFIXES = ["claude-sonnet-", "claude-haiku-"];

/** 実行時にモデルIDの形式を検証し、設定ミスを起動時に検出する */
export function assertModelIds(): void {
  for (const [key, value] of Object.entries(MODELS)) {
    const valid = KNOWN_MODEL_PREFIXES.some((prefix) => value.name.startsWith(prefix));
    if (!valid) {
      throw new Error(`Unknown model id for "${key}": ${value.name}`);
    }
  }
}
