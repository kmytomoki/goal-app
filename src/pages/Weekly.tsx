import { useCallback, useEffect, useMemo, useState } from "react";
import PageHeader from "../components/PageHeader";
import { generateWeeklyReview } from "../lib/api";
import { getRecentLogs, getWeeklyReview, saveWeeklyReview } from "../lib/db";
import { addDays, localDateKey, weekKey } from "../lib/dates";
import { useApp } from "../lib/useApp";
import type { DailyLog, WeeklyReview } from "../lib/types";

export default function Weekly() {
  const { user, ideal } = useApp();
  const uid = user?.uid;
  const week = weekKey();
  const today = localDateKey();

  const [review, setReview] = useState<WeeklyReview | null>(null);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) return;
    void (async () => {
      const [saved, recent] = await Promise.all([
        getWeeklyReview(uid, week),
        getRecentLogs(uid, 8),
      ]);
      setReview(saved);
      const weekDates = new Set(Array.from({ length: 7 }, (_, i) => addDays(today, -i)));
      setLogs(recent.filter((l) => weekDates.has(l.date)));
      setLoading(false);
    })();
  }, [uid, week, today]);

  const stats = useMemo(() => {
    const planned = logs.reduce((s, l) => s + l.tasks.length, 0);
    const done = logs.reduce((s, l) => s + l.tasks.filter((t) => t.done).length, 0);
    return { planned, done, rate: planned ? done / planned : 0 };
  }, [logs]);

  const generate = useCallback(async () => {
    if (!uid) return;
    setGenerating(true);
    setError(null);
    try {
      const result = await generateWeeklyReview({
        days: logs
          .slice()
          .sort((a, b) => (a.date < b.date ? -1 : 1))
          .map((l) => ({
            date: l.date,
            taskCount: l.tasks.length,
            doneCount: l.tasks.filter((t) => t.done).length,
            mode: l.mode,
            scores: l.scores,
          })),
        idealTitle: ideal?.title ?? "理想の自分",
      });
      const next: WeeklyReview = {
        week,
        summary: result.summary,
        stuckPatterns: result.stuckPatterns,
        adjustments: result.adjustments,
        completionRate: stats.rate,
        createdAt: Date.now(),
      };
      await saveWeeklyReview(uid, next);
      setReview(next);
    } catch {
      setError("振り返りの生成に失敗しました。もう一度お試しください。");
    } finally {
      setGenerating(false);
    }
  }, [uid, logs, ideal, week, stats.rate]);

  if (loading) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <p className="text-sm font-semibold tracking-widest text-[var(--color-text-secondary)]">1週間を集計中…</p>
      </main>
    );
  }

  return (
    <main className="px-4 pb-12">
      <PageHeader eyebrow="WEEKLY ・ マネージャー時間" title="今週の楽屋ミーティング" />
      <p className="px-1 text-xs leading-relaxed text-[var(--color-text-faint)]">
        計画の見直しはここでだけ。日々の対話は実行に集中するための場所です。
      </p>

      <section
        className="card mt-6 p-5"
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        <p className="text-xs text-[var(--color-text-secondary)]">今週のタスク完了率（直近7日）</p>
        <p className="mt-1 text-4xl font-semibold text-[var(--color-text-main)]">
          {Math.round(stats.rate * 100)}
          <span className="ml-1 text-base text-[var(--color-text-secondary)]">%</span>
        </p>
        <p className="mt-1 text-xs text-[var(--color-text-faint)]">
          {stats.planned}タスク中 {stats.done}完了 ・ 記録{logs.length}日
        </p>
      </section>

      {review ? (
        <section className="rise mt-6 space-y-4">
          <div className="spotlight rounded-2xl p-5">
            <p className="text-[11px] font-semibold tracking-[0.25em] text-[var(--color-brand-500)]">AIの観察</p>
            <p className="mt-2 text-[15px] leading-relaxed text-[var(--color-text-main)]">{review.summary}</p>
          </div>
          {review.stuckPatterns.length > 0 && (
            <div className="card p-5">
              <p className="text-[11px] font-semibold tracking-[0.25em] text-[var(--color-text-secondary)]">
                詰まったパターン
              </p>
              <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-[var(--color-text-main)]">
                {review.stuckPatterns.map((p, i) => (
                  <li key={i}>・{p}</li>
                ))}
              </ul>
            </div>
          )}
          {review.adjustments.length > 0 && (
            <div className="card p-5">
              <p className="text-[11px] font-semibold tracking-[0.25em] text-[var(--color-text-secondary)]">
                来週の調整提案
              </p>
              <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-[var(--color-text-main)]">
                {review.adjustments.map((a, i) => (
                  <li key={i}>・{a}</li>
                ))}
              </ul>
            </div>
          )}
          <button
            onClick={generate}
            disabled={generating}
            className="w-full rounded-xl border border-[var(--color-line)] py-3 text-sm text-[var(--color-text-secondary)] disabled:opacity-50"
          >
            {generating ? "生成中…" : "もう一度生成する"}
          </button>
        </section>
      ) : (
        <div className="mt-6">
          {logs.length === 0 ? (
            <p className="card px-4 py-6 text-center text-sm text-[var(--color-text-secondary)]">
              今週の記録がまだありません。まずは今日の対話から始めましょう。
            </p>
          ) : (
            <>
              {error && <p className="mb-2 text-sm text-red-300">{error}</p>}
              <button
                onClick={generate}
                disabled={generating}
                className="btn-primary w-full rounded-2xl py-3.5 font-bold disabled:opacity-50"
              >
                {generating ? "1週間を観察しています…" : "今週の振り返りを生成する"}
              </button>
            </>
          )}
        </div>
      )}
    </main>
  );
}
