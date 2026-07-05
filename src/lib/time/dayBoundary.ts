/**
 * 1日の境界（タイムゾーン + リセット時刻）に関するユーティリティ。
 *
 * ユーザーごとに timezone(IANA) と dayResetHour(0-23) を持ち、
 * 「論理日付(logical date)」を基準に朝/夜の対話やスコア集計を行う。
 *
 * 例: dayResetHour=4 のとき、現地時間 0:00〜3:59 は「前日」として扱う。
 * これにより深夜帯の作業が前日の1日に含まれる。
 *
 * 外部ライブラリに依存せず Intl API のみで実装する。
 */

export interface ZonedParts {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  hour: number; // 0-23
  minute: number;
  second: number;
}

/** 指定タイムゾーンでの壁時計の各要素を取得する */
export function getZonedParts(date: Date, timeZone: string): ZonedParts {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(date);
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? "0");
  // Intl は 24:00 を返す場合があるので 0 に正規化
  let hour = get("hour");
  if (hour === 24) hour = 0;
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour,
    minute: get("minute"),
    second: get("second"),
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** ZonedParts から "YYYY-MM-DD" を作る */
function toDateString(p: { year: number; month: number; day: number }): string {
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/**
 * 論理日付 "YYYY-MM-DD" を返す。
 * 現地時間の hour が resetHour 未満なら前日に繰り下げる。
 */
export function getLogicalDate(
  now: Date,
  timeZone: string,
  dayResetHour: number
): string {
  const z = getZonedParts(now, timeZone);
  if (z.hour >= dayResetHour) {
    return toDateString(z);
  }
  // 前日へ繰り下げ。UTCベースで日付計算してからローカル年月日を取り直す。
  const shifted = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const zPrev = getZonedParts(shifted, timeZone);
  return toDateString(zPrev);
}

export type DayPhase = "morning" | "day" | "night";

/**
 * 現在が「朝」「日中」「夜」のどれかをざっくり判定する（UI出し分け用）。
 * リセット時刻からの経過で判断する。
 *   - reset 〜 reset+6h: morning
 *   - それ以降〜 reset+16h: day
 *   - それ以降: night
 */
export function getDayPhase(
  now: Date,
  timeZone: string,
  dayResetHour: number
): DayPhase {
  const z = getZonedParts(now, timeZone);
  const hoursSinceReset = (z.hour - dayResetHour + 24) % 24;
  if (hoursSinceReset < 6) return "morning";
  if (hoursSinceReset < 16) return "day";
  return "night";
}

/** 既定値（オンボーディング初期値） */
export const DEFAULT_TIMEZONE = "Asia/Tokyo";
export const DEFAULT_DAY_RESET_HOUR = 4;

/** ブラウザのタイムゾーンを推測する（クライアント側で利用） */
export function guessTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TIMEZONE;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}
