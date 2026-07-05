// 日次リセットはユーザーのローカル日付基準で行う。

export function localDateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(key: string, delta: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d + delta);
  return localDateKey(date);
}

export function diffDays(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  const da = new Date(ay, am - 1, ad).getTime();
  const dbb = new Date(by, bm - 1, bd).getTime();
  return Math.round((da - dbb) / 86_400_000);
}

// ISO 週番号キー（yyyy-Www）
export function weekKey(d: Date = new Date()): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

// 継続日数（登録日から数えて Day N）
export function dayCountSince(createdAt: number): number {
  const start = localDateKey(new Date(createdAt));
  return diffDays(localDateKey(), start) + 1;
}

export function woopStageForDay(day: number): "wo" | "woo" | "woop" {
  if (day <= 7) return "wo";
  if (day <= 30) return "woo";
  return "woop";
}
