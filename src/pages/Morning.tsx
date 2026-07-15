import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Chat, { START_MARKER } from "../components/Chat";
import PageHeader from "../components/PageHeader";
import { extractTasks } from "../lib/api";
import { emptyDailyLog, getDailyLog, getLastLogBefore, getRecentLogs, saveDailyLog } from "../lib/db";
import { dayCountSince, diffDays, localDateKey, woopStageForDay } from "../lib/dates";
import { createTask } from "../lib/tasks";
import { useApp } from "../lib/useApp";
import type { ChatContext, ChatMessage, DailyLog, Task } from "../lib/types";

export default function Morning() {
  const { user, profile, ideal } = useApp();
  const navigate = useNavigate();
  const today = localDateKey();
  const uid = user?.uid;

  const [log, setLog] = useState<DailyLog | null>(null);
  const [context, setContext] = useState<ChatContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const logRef = useRef<DailyLog | null>(null);

  const dayCount = profile ? dayCountSince(profile.createdAt) : 1;
  const woopStage = woopStageForDay(dayCount);

  useEffect(() => {
    if (!uid || !profile) return;
    void (async () => {
      const [todayLog, lastLog, recentRaw] = await Promise.all([
        getDailyLog(uid, today),
        getLastLogBefore(uid, today),
        getRecentLogs(uid, 4),
      ]);
      const recentLogs = recentRaw.filter((entry) => entry.date < today).slice(0, 3);
      const base = todayLog ?? emptyDailyLog(today);
      logRef.current = base;
      setLog(base);

      const gapDays = lastLog ? Math.max(0, diffDays(today, lastLog.date) - 1) : 0;
      const yesterday =
        lastLog && lastLog.tasks.length > 0
          ? {
              taskCount: lastLog.tasks.length,
              doneCount: lastLog.tasks.filter((t) => t.done).length,
              completionRate:
                lastLog.tasks.filter((t) => t.done).length / lastLog.tasks.length,
            }
          : null;

      setContext({
        aiStyle: "labeling",
        idealSelf: ideal
          ? { title: ideal.title, description: ideal.description, habits: ideal.habits }
          : null,
        triggerHabit: profile.triggerHabit,
        minimalRule: profile.minimalRule,
        dayCount,
        woopStage,
        gapDays,
        mode: base.mode,
        yesterday,
        tomorrowFirstTask: lastLog?.tomorrowFirstTask ?? null,
        recentDays: recentLogs.map((entry) => ({
          date: entry.date,
          doneTasks: entry.tasks.filter((t) => t.done).map((t) => t.text),
          undoneTasks: entry.tasks.filter((t) => !t.done).map((t) => t.text),
          note: entry.eveningNote ?? null,
        })),
      });
      setLoading(false);
    })();
  }, [uid, profile, ideal, today, dayCount, woopStage]);

  // 途中離脱しても再開できるよう、メッセージごとに永続化する
  const onMessagesChange = useCallback(
    (messages: ChatMessage[]) => {
      if (!uid) return;
      const base = logRef.current ?? emptyDailyLog(today);
      const next: DailyLog = {
        ...base,
        morningDialogue: { messages, completedAt: null, woopStage },
      };
      logRef.current = next;
      setLog(next);
      void saveDailyLog(uid, today, next);
    },
    [uid, today, woopStage],
  );

  const userTurns = useMemo(
    () =>
      (log?.morningDialogue?.messages ?? []).filter(
        (m) => m.role === "user" && m.content !== START_MARKER,
      ).length,
    [log],
  );

  const minimal = log?.mode === "minimal";

  const finish = async () => {
    if (!uid || !log?.morningDialogue) return;
    setFinishing(true);
    setError(null);
    try {
      const { tasks } = await extractTasks({
        messages: log.morningDialogue.messages,
        firstTask: context?.tomorrowFirstTask ?? null,
        minimal: minimal ?? false,
      });
      let firstSeen = false;
      const list: Task[] = tasks.map((t, i) => {
        const isFirst = !firstSeen && (t.isFirstTask || i === 0);
        if (isFirst) firstSeen = true;
        return createTask({ text: t.text, done: false, isFirstTask: isFirst, priority: 4 });
      });
      await saveDailyLog(uid, today, {
        tasks: list,
        morningDialogue: { ...log.morningDialogue, completedAt: Date.now() },
        estimation: { planned: list.length, completed: 0 },
      });
      navigate("/", { replace: true });
    } catch {
      setError("タスクの生成に失敗しました。もう一度お試しください。");
      setFinishing(false);
    }
  };

  if (loading || !context) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <p className="text-sm font-semibold tracking-widest text-[var(--color-text-secondary)]">朝の対話を準備中…</p>
      </main>
    );
  }

  if (log?.morningDialogue?.completedAt) {
    return (
      <main className="px-4">
        <PageHeader eyebrow="MORNING" title="朝の対話" />
        <p className="card mt-6 px-4 py-6 text-center text-sm text-[var(--color-text-secondary)]">
          今日の朝の対話は完了しています。
        </p>
      </main>
    );
  }

  return (
    <main className="flex h-dvh flex-col px-4">
      <PageHeader
        eyebrow={minimal ? "MORNING ・ 5分だけモード" : "MORNING"}
        title={minimal ? "最初の一歩だけ決める" : "今日をどう進めるか"}
      />

      <Chat
        mode="morning"
        context={context}
        messages={log?.morningDialogue?.messages ?? []}
        onMessagesChange={onMessagesChange}
        aiStarts
        disabled={finishing}
      />

      {userTurns >= (minimal ? 1 : 2) && (
        <div className="px-1 pb-4">
          {error && <p className="mb-2 text-sm text-red-300">{error}</p>}
          <button
            onClick={finish}
            disabled={finishing}
            className="btn-primary w-full rounded-2xl py-3.5 font-bold disabled:opacity-50"
          >
            {finishing ? "チェックリストを作成中…" : "今日のタスクを作る"}
          </button>
        </div>
      )}
    </main>
  );
}
