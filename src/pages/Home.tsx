import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import ScoreChart, { type DayScore } from "../components/ScoreChart";
import TaskList from "../components/TaskList";
import { emptyDailyLog, getDailyLog, getLastLogBefore, getRecentLogs, saveDailyLog } from "../lib/db";
import { addDays, dayCountSince, localDateKey } from "../lib/dates";
import { useApp } from "../lib/useApp";
import type { DailyLog } from "../lib/types";

export default function Home() {
  const { user, profile, ideal } = useApp();
  const navigate = useNavigate();
  const today = localDateKey();

  const [log, setLog] = useState<DailyLog | null>(null);
  const [recent, setRecent] = useState<DailyLog[]>([]);
  const [prevFirstTask, setPrevFirstTask] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const uid = user?.uid;

  const load = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    try {
      const [todayLog, logs, lastLog] = await Promise.all([
        getDailyLog(uid, today),
        getRecentLogs(uid, 8),
        getLastLogBefore(uid, today),
      ]);
      setLog(todayLog);
      setRecent(logs);
      setPrevFirstTask(lastLog?.tomorrowFirstTask ?? null);
    } finally {
      setLoading(false);
    }
  }, [uid, today]);

  useEffect(() => {
    void load();
  }, [load]);

  const days: DayScore[] = useMemo(() => {
    const byDate = new Map(recent.map((l) => [l.date, l]));
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(today, i - 6);
      return { date, scores: byDate.get(date)?.scores ?? null };
    });
  }, [recent, today]);

  const dayCount = profile ? dayCountSince(profile.createdAt) : 1;
  const morningDone = log?.morningDialogue?.completedAt != null;
  const eveningDone = log?.eveningDialogue?.completedAt != null;
  const isRestDay = log?.mode === "checkin_only";

  const toggleTask = async (index: number) => {
    if (!uid || !log) return;
    const tasks = log.tasks.map((t, i) => (i === index ? { ...t, done: !t.done } : t));
    setLog({ ...log, tasks });
    await saveDailyLog(uid, today, { tasks });
  };

  const startBusyDay = async () => {
    if (!uid) return;
    const base = log ?? emptyDailyLog(today);
    await saveDailyLog(uid, today, { ...base, mode: "minimal" });
    navigate("/morning");
  };

  const restToday = async () => {
    if (!uid) return;
    if (!window.confirm("今日は休むと記録します。連続日数は途切れません。よろしいですか？")) return;
    const base = log ?? emptyDailyLog(today);
    await saveDailyLog(uid, today, {
      ...base,
      mode: "checkin_only",
      eveningDialogue: { messages: [], completedAt: Date.now() },
    });
    await load();
  };

  const dateLabel = new Date().toLocaleDateString("ja-JP", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  if (loading) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <p className="font-display text-sm tracking-widest text-ink-400">今日の舞台を準備中…</p>
      </main>
    );
  }

  return (
    <main className="px-4 pb-12">
      <header className="flex items-start justify-between px-1 pt-6">
        <div>
          <p className="text-xs text-ink-600">{dateLabel}</p>
          <h1 className="font-display mt-1 text-xl text-ink-100">
            {ideal?.title ?? "理想の自分"}
            <span className="ml-2 text-sm text-gold-300">Day {dayCount}</span>
          </h1>
          {profile?.triggerHabit && (
            <p className="mt-1 text-xs text-ink-600">きっかけ: {profile.triggerHabit}</p>
          )}
        </div>
        <Link
          to="/settings"
          aria-label="設定"
          className="flex h-9 w-9 items-center justify-center rounded-full border hairline text-ink-400"
        >
          ⚙
        </Link>
      </header>

      {isRestDay ? (
        <section className="spotlight rise mt-6 rounded-2xl p-6 text-center">
          <p className="font-display text-base text-gold-300">今日は休演日</p>
          <p className="mt-2 text-sm leading-relaxed text-ink-400">
            休むと伝えられたことも、続いている証拠です。
            <br />
            記録は途切れていません。また明日。
          </p>
        </section>
      ) : (
        <>
          {/* 今日の最初の一歩（スポットライト） */}
          {!morningDone && (
            <section className="spotlight rise mt-6 rounded-2xl p-5">
              <p className="font-display text-[11px] tracking-[0.25em] text-gold-300">
                今日の最初の一歩
              </p>
              {prevFirstTask ? (
                <p className="mt-2 text-lg leading-snug text-ink-100">{prevFirstTask}</p>
              ) : (
                <p className="mt-2 text-sm leading-relaxed text-ink-400">
                  朝の対話で、今日の最初の一歩を決めましょう。
                </p>
              )}
              <button
                onClick={() => navigate("/morning")}
                className="mt-4 w-full rounded-xl bg-gold-400 py-3 font-bold text-night-950"
              >
                朝の対話をはじめる
              </button>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={startBusyDay}
                  className="flex-1 rounded-xl border hairline py-2.5 text-xs text-ink-400"
                >
                  今日は忙しい（5分だけ）
                </button>
                <button
                  onClick={restToday}
                  className="flex-1 rounded-xl border hairline py-2.5 text-xs text-ink-400"
                >
                  今日は休む
                </button>
              </div>
            </section>
          )}

          {/* 今日のタスク */}
          {(log?.tasks.length ?? 0) > 0 && (
            <section className="rise mt-6">
              <h2 className="font-display px-1 pb-2 text-sm tracking-widest text-ink-400">
                今日の演目
              </h2>
              <TaskList
                tasks={log!.tasks}
                onToggle={eveningDone ? undefined : toggleTask}
                minimal={log!.mode === "minimal"}
              />
              {morningDone && !eveningDone && (
                <button
                  onClick={() => navigate("/evening")}
                  className="mt-4 w-full rounded-xl border border-gold-400/40 bg-night-800 py-3 font-medium text-gold-300"
                >
                  夜の振り返りをはじめる
                </button>
              )}
              {eveningDone && (
                <p className="mt-4 rounded-xl border hairline bg-night-900 px-4 py-3 text-center text-sm text-ink-400">
                  今日の幕は下りました。おつかれさまでした。
                </p>
              )}
            </section>
          )}
        </>
      )}

      {/* スコア */}
      <section className="rise mt-8">
        <h2 className="font-display px-1 pb-2 text-sm tracking-widest text-ink-400">この7日間</h2>
        <div className="rounded-2xl border hairline bg-night-900 p-4">
          {log?.scores && (
            <div
              className="mb-4 grid grid-cols-3 gap-2 text-center"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {(
                [
                  ["なりきり", log.scores.narikiri, "var(--color-series-narikiri)"],
                  ["ペース", log.scores.pace, "var(--color-series-pace)"],
                  ["やる気", log.scores.motivation, "var(--color-series-motivation)"],
                ] as const
              ).map(([label, value, color]) => (
                <div key={label} className="rounded-xl bg-night-800 py-2.5">
                  <p className="text-[22px] font-bold text-ink-100">{value}</p>
                  <p className="mt-0.5 flex items-center justify-center gap-1 text-[11px] text-ink-400">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
                    {label}
                  </p>
                </div>
              ))}
            </div>
          )}
          <ScoreChart days={days} />
        </div>
      </section>

      <nav className="mt-8 flex gap-2 px-1">
        <Link
          to="/weekly"
          className="flex-1 rounded-xl border hairline bg-night-900 py-3 text-center text-sm text-ink-400"
        >
          週次振り返り
        </Link>
      </nav>
    </main>
  );
}
