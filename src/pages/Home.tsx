import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ScoreChart, { type DayScore } from "../components/ScoreChart";
import TaskList from "../components/TaskList";
import ConfirmDialog from "../components/ConfirmDialog";
import TaskDetailSheet from "../components/TaskDetailSheet";
import { emptyDailyLog, getDailyLog, getLastLogBefore, getRecentLogs, saveDailyLog } from "../lib/db";
import { addDays, dayCountSince, localDateKey, woopStageForDay } from "../lib/dates";
import { createTask, insertTask, removeTask, restoreTask, updateTask } from "../lib/tasks";
import { useApp } from "../lib/useApp";
import type { DailyLog, Task } from "../lib/types";

export default function Home() {
  const { user, profile, ideal } = useApp();
  const navigate = useNavigate();
  const today = localDateKey();

  const [log, setLog] = useState<DailyLog | null>(null);
  const [recent, setRecent] = useState<DailyLog[]>([]);
  const [prevFirstTask, setPrevFirstTask] = useState<string | null>(null);
  const [prevUndoneTasks, setPrevUndoneTasks] = useState<string[]>([]);
  const [quickStarting, setQuickStarting] = useState(false);
  const [openReason, setOpenReason] = useState<"narikiri" | "pace" | "motivation" | null>(null);
  const [showRestConfirm, setShowRestConfirm] = useState(false);
  const [deleted, setDeleted] = useState<{ task: Task; index: number } | null>(null);
  const [detailTask, setDetailTask] = useState<Task | null>(null);
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
      setPrevUndoneTasks((lastLog?.tasks ?? []).filter((t) => !t.done).map((t) => t.text));
    } finally {
      setLoading(false);
    }
  }, [uid, today]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const listener = () => void load();
    window.addEventListener("tasks:updated", listener);
    return () => window.removeEventListener("tasks:updated", listener);
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

  const quickStartToday = async () => {
    if (!uid || quickStarting) return;
    setQuickStarting(true);
    try {
      const base = log ?? emptyDailyLog(today);
      const candidates: string[] = [];
      const addUnique = (text: string) => {
        const normalized = text.trim();
        if (!normalized) return;
        if (candidates.some((c) => c.toLowerCase() === normalized.toLowerCase())) return;
        candidates.push(normalized);
      };
      addUnique(prevFirstTask ?? "");
      const carryLimit = Math.max(1, Math.min(2, Math.ceil(prevUndoneTasks.length / 2)));
      prevUndoneTasks.slice(0, carryLimit).forEach(addUnique);
      if (candidates.length === 0) {
        addUnique(ideal?.habits?.[0] ? `${ideal.habits[0]}を5分だけ` : "今日やる最初の1タスクを5分だけ");
      }

      const tasks: Task[] = candidates.map((text, index) => ({
        ...createTask({ text, done: false, isFirstTask: index === 0, priority: 4 }),
      }));
      await saveDailyLog(uid, today, {
        ...base,
        mode: "normal",
        tasks,
        morningDialogue: {
          messages: [{ role: "assistant", content: "クイックスタートでタスクを作成しました。" }],
          completedAt: Date.now(),
          woopStage: woopStageForDay(dayCount),
        },
        estimation: { planned: tasks.length, completed: 0 },
      });
      await load();
    } finally {
      setQuickStarting(false);
    }
  };

  const toggleTask = async (taskId: string) => {
    if (!uid || !log) return;
    const tasks = log.tasks.map((task) =>
      task.id === taskId ? { ...task, done: !task.done } : task,
    );
    setLog({ ...log, tasks });
    await saveDailyLog(uid, today, { tasks });
  };

  const editTaskText = async (taskId: string, text: string) => {
    if (!uid || !log) return;
    const tasks = updateTask(log.tasks, taskId, { text });
    setLog({ ...log, tasks });
    await saveDailyLog(uid, today, { tasks });
  };

  const deleteTask = async (taskId: string) => {
    if (!uid || !log) return;
    const result = removeTask(log.tasks, taskId);
    if (!result.removed) return;
    setLog({ ...log, tasks: result.tasks });
    setDeleted({ task: result.removed, index: result.index });
    setTimeout(() => setDeleted((prev) => (prev?.task.id === result.removed?.id ? null : prev)), 5000);
    await saveDailyLog(uid, today, { tasks: result.tasks });
  };

  const undoDelete = async () => {
    if (!uid || !log || !deleted) return;
    const tasks = restoreTask(log.tasks, deleted.task, deleted.index);
    setLog({ ...log, tasks });
    setDeleted(null);
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
        <p className="text-sm font-semibold tracking-widest text-[var(--color-text-secondary)]">今日の舞台を準備中…</p>
      </main>
    );
  }

  return (
    <main className="px-4 pb-12">
      <header className="flex items-start justify-between px-1 pt-6">
        <div>
          <p className="text-xs text-[var(--color-text-faint)]">{dateLabel}</p>
          <h1 className="mt-1 text-xl font-semibold text-[var(--color-text-main)]">
            {ideal?.title ?? "理想の自分"}
            <span className="ml-2 text-sm text-[var(--color-brand-500)]">Day {dayCount}</span>
          </h1>
          {profile?.triggerHabit && (
            <p className="mt-1 text-xs text-[var(--color-text-faint)]">きっかけ: {profile.triggerHabit}</p>
          )}
        </div>
      </header>

      {isRestDay ? (
        <section className="spotlight rise mt-6 rounded-2xl p-6 text-center">
          <p className="text-base font-semibold text-[var(--color-brand-500)]">今日は休演日</p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
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
              <p className="text-[11px] font-semibold tracking-[0.25em] text-[var(--color-brand-500)]">
                今日の最初の一歩
              </p>
              {prevFirstTask ? (
                <p className="mt-2 text-lg leading-snug text-[var(--color-text-main)]">{prevFirstTask}</p>
              ) : (
                <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                  朝の対話で、今日の最初の一歩を決めましょう。
                </p>
              )}
              <button
                onClick={quickStartToday}
                className="btn-primary mt-4 w-full rounded-xl py-3 font-bold"
                disabled={quickStarting}
              >
                {quickStarting ? "タスクを準備中…" : "タップで開始"}
              </button>
              <button
                onClick={() => navigate("/morning")}
                className="mt-2 w-full rounded-xl border border-[var(--color-brand-500)]/40 bg-[var(--color-bg-page)] py-3 font-medium text-[var(--color-brand-600)]"
              >
                AIと話して決める
              </button>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={startBusyDay}
                  className="flex-1 rounded-xl border border-[var(--color-line)] py-2.5 text-xs text-[var(--color-text-secondary)]"
                >
                  今日は忙しい（5分だけ）
                </button>
                <button
                  onClick={() => setShowRestConfirm(true)}
                  className="flex-1 rounded-xl border border-[var(--color-line)] py-2.5 text-xs text-[var(--color-text-secondary)]"
                >
                  今日は休む
                </button>
              </div>
            </section>
          )}

          {/* 今日のタスク */}
          {(log?.tasks.length ?? 0) > 0 && (
            <section className="rise mt-6">
              <h2 className="px-1 pb-2 text-sm font-semibold tracking-wide text-[var(--color-text-secondary)]">
                今日の演目
              </h2>
              <TaskList
                tasks={log!.tasks}
                onToggle={eveningDone ? undefined : toggleTask}
                onEditText={eveningDone ? undefined : editTaskText}
                onDelete={eveningDone ? undefined : deleteTask}
                onOpenDetail={(task) => setDetailTask(task)}
                minimal={log!.mode === "minimal"}
              />
              {morningDone && !eveningDone && (
                <button
                  onClick={() => navigate("/evening")}
                  className="mt-4 w-full rounded-xl border border-[var(--color-brand-500)]/40 bg-[var(--color-bg-page)] py-3 font-medium text-[var(--color-brand-600)]"
                >
                  夜の振り返りをはじめる
                </button>
              )}
              {eveningDone && (
                <p className="card mt-4 px-4 py-3 text-center text-sm text-[var(--color-text-secondary)]">
                  今日の幕は下りました。おつかれさまでした。
                </p>
              )}
            </section>
          )}
        </>
      )}

      {/* スコア */}
      <section className="rise mt-8">
        <h2 className="px-1 pb-2 text-sm font-semibold tracking-wide text-[var(--color-text-secondary)]">この7日間</h2>
        <div className="card p-4">
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
                <button
                  key={label}
                  onClick={() =>
                    setOpenReason((current) =>
                      current ===
                      (label === "なりきり"
                        ? "narikiri"
                        : label === "ペース"
                          ? "pace"
                          : "motivation")
                        ? null
                        : label === "なりきり"
                          ? "narikiri"
                          : label === "ペース"
                            ? "pace"
                            : "motivation",
                    )
                  }
                  className="rounded-xl bg-[var(--color-bg-muted)] py-2.5 text-center"
                >
                  <p className="text-[22px] font-bold text-[var(--color-text-main)]">{value}</p>
                  <p className="mt-0.5 flex items-center justify-center gap-1 text-[11px] text-[var(--color-text-secondary)]">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
                    {label}
                  </p>
                </button>
              ))}
            </div>
          )}
          {log?.scores && openReason && (
            <p className="mb-4 rounded-xl border border-[var(--color-line)] bg-[var(--color-bg-muted)] px-3 py-2 text-xs leading-relaxed text-[var(--color-text-secondary)]">
              {openReason === "narikiri"
                ? log.scores.narikiriReason ?? "今日の行動と理想像の一致度から算出。"
                : openReason === "pace"
                  ? log.scores.paceReason ?? "タスク完了率から算出。"
                  : log.scores.motivationReason ?? "達成状況と会話内容から算出。"}
            </p>
          )}
          <ScoreChart days={days} />
        </div>
      </section>

      {deleted && (
        <div className="fixed right-4 bottom-24 left-4 z-30 mx-auto max-w-md rounded-xl border border-[var(--color-line)] bg-[var(--color-bg-page)] px-3 py-2 text-sm text-[var(--color-text-main)] shadow">
          タスクを削除しました
          <button onClick={() => void undoDelete()} className="ml-3 font-semibold text-[var(--color-brand-500)]">
            元に戻す
          </button>
        </div>
      )}
      <ConfirmDialog
        open={showRestConfirm}
        title="今日は休む"
        description="今日は休むと記録します。連続日数は途切れません。"
        confirmLabel="休む"
        cancelLabel="戻る"
        onCancel={() => setShowRestConfirm(false)}
        onConfirm={() => {
          setShowRestConfirm(false);
          void restToday();
        }}
      />
      <TaskDetailSheet
        open={Boolean(detailTask)}
        task={detailTask}
        date={today}
        onClose={() => setDetailTask(null)}
        onDelete={async (taskId) => {
          await deleteTask(taskId);
          setDetailTask(null);
        }}
        onSave={async ({ taskId, text, priority, date }) => {
          if (!uid || !log) return;
          if (date === today) {
            const tasks = updateTask(log.tasks, taskId, { text, priority });
            setLog({ ...log, tasks });
            await saveDailyLog(uid, today, { tasks });
            return;
          }
          const sourceRemoved = removeTask(log.tasks, taskId);
          if (!sourceRemoved.removed) return;
          const destination = (await getDailyLog(uid, date)) ?? emptyDailyLog(date);
          const destinationTasks = insertTask(destination.tasks, {
            ...sourceRemoved.removed,
            text,
            priority,
          });
          await Promise.all([
            saveDailyLog(uid, today, { tasks: sourceRemoved.tasks }),
            saveDailyLog(uid, date, { ...destination, tasks: destinationTasks }),
          ]);
          setDetailTask(null);
          await load();
        }}
      />
    </main>
  );
}
