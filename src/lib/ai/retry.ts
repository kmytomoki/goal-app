/**
 * 指数バックオフによるリトライ。
 * タイムアウト・レート制限(429)・一時的なAPIエラー(5xx)に対応する。
 * 最大3回（初回 + リトライ2回）を既定とする。
 */

export interface RetryOptions {
  /** 最大試行回数（初回を含む）。既定 3 */
  maxAttempts?: number;
  /** 初回バックオフ(ms)。既定 500 */
  baseDelayMs?: number;
  /** バックオフ上限(ms)。既定 8000 */
  maxDelayMs?: number;
}

/** リトライすべきエラーか判定する */
function isRetryable(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { status?: number; name?: string; code?: string };
  // Anthropic SDK は status を持つ
  if (e.status === 429) return true;
  if (typeof e.status === "number" && e.status >= 500) return true;
  // タイムアウト/中断/ネットワーク系
  if (e.name === "AbortError") return true;
  if (e.code === "ETIMEDOUT" || e.code === "ECONNRESET") return true;
  return false;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { maxAttempts = 3, baseDelayMs = 500, maxDelayMs = 8000 } = options;

  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt >= maxAttempts || !isRetryable(err)) break;
      // 指数バックオフ + ジッター
      const backoff = Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs);
      const jitter = Math.random() * (backoff * 0.25);
      await sleep(backoff + jitter);
    }
  }
  throw lastErr;
}
