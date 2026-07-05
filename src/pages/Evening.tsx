import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Chat, { START_MARKER } from "../components/Chat";
import PageHeader from "../components/PageHeader";
import TaskList from "../components/TaskList";
import { scoreEvening } from "../lib/api";
import { emptyDailyLog, getDailyLog, saveDailyLog } from "../lib/db";
import { localDateKey } from "../lib/dates";
import { useApp } from "../lib/useApp";
import type { ChatContext, ChatMessage, DailyLog } from "../lib/types";

export default function Evening() {
  const { user, profile, ideal } = useApp();
  const navigate = useNavigate();
  const today = localDateKey();
  const uid = user?.uid;

  const [log, setLog] = useState<DailyLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [finishing, setFinishing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const logRef = useRef<DailyLog | null>(null);

  useEffect(() => {
    if (!uid) return;
    void (async () => {
      const todayLog = (await getDailyLog(uid, today)) ?? emptyDailyLog(today);
      logRef.current = todayLog;
      setLog(todayLog);
      setLoading(false);
    })();
  }, [uid, today]);

  const context: ChatContext | null = useMemo(() => {
    if (!profile || !log) return null;
    return {
      aiStyle: profile.aiStyle,
      idealSelf: ideal
        ? { title: ideal.title, description: ideal.description, habits: ideal.habits }
        : null,
      minimalRule: profile.minimalRule,
      mode: log.mode,
      todayTasks: log.tasks,
    };
  }, [profile, ideal, log]);

  const toggleTask = async (index: number) => {
    if (!uid || !log) return;
    const tasks = log.tasks.map((t, i) => (i === index ? { ...t, done: !t.done } : t));
    const next = { ...log, tasks };
    logRef.current = next;
    setLog(next);
    await saveDailyLog(uid, today, { tasks });
  };

  // メッセージごとに永続化（途中離脱しても再開できる）
  const onMessagesChange = useCallback(
    (messages: ChatMessage[]) => {
      if (!uid) return;
      const base = logRef.current ?? emptyDailyLog(today);
      const next: DailyLog = {
        ...base,
        eveningDialogue: { messages, completedAt: null },
      };
      logRef.current = next;
      setLog(next);
      void saveDailyLog(uid, today, next);
    },
    [uid, today],
  );

  const userTurns = useMemo(
    () =>
      (log?.eveningDialogue?.messages ?? []).filter(
        (m) => m.role === "user" && m.content !== START_MARKER,
      ).length,
    [log],
  );

  const finish = async () => {
    if (!uid || !log?.eveningDialogue) return;
    setFinishing(true);
    setNotice(null);
    try {
      const result = await scoreEvening({
        messages: log.eveningDialogue.messages,
        tasks: log.tasks,
        idealHabits: ideal?.habits ?? [],
      });
      if (!result.tomorrowFirstTask.trim()) {
        setNotice(
          "明日の「最初の1タスク」がまだ決まっていないようです。AIともう一言だけ話して、明日の一歩を決めてから終えましょう。",
        );
        setFinishing(false);
        return;
      }
      const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));
      await saveDailyLog(uid, today, {
        scores: {
          narikiri: clamp(result.narikiri),
          pace: clamp(result.pace),
          motivation: clamp(result.motivation),
        },
        tomorrowFirstTask: result.tomorrowFirstTask.trim(),
        eveningDialogue: { ...log.eveningDialogue, completedAt: Date.now() },
        estimation: {
          planned: log.estimation?.planned ?? log.tasks.length,
          completed: log.tasks.filter((t) => t.done).length,
        },
      });
      navigate("/", { replace: true });
    } catch {
      setNotice("スコアの算出に失敗しました。もう一度お試しください。");
      setFinishing(false);
    }
  };

  if (loading || !context) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <p className="font-display text-sm tracking-widest text-ink-400">夜の振り返りを準備中…</p>
      </main>
    );
  }

  if (log?.eveningDialogue?.completedAt) {
    return (
      <main className="px-4">
        <PageHeader eyebrow="NIGHT" title="夜の振り返り" />
        <p className="mt-6 rounded-xl border hairline bg-night-900 px-4 py-6 text-center text-sm text-ink-400">
          今日の振り返りは完了しています。おつかれさまでした。
        </p>
      </main>
    );
  }

  return (
    <main className="flex h-dvh flex-col px-4">
      <PageHeader eyebrow="NIGHT" title="今日の幕を下ろす" />

      {log && log.tasks.length > 0 && (
        <details className="mb-1 px-1" open={!log.tasks.some((t) => t.done)}>
          <summary className="cursor-pointer py-1 text-xs text-ink-400">
            できたものにチェックしてから話しましょう
          </summary>
          <div className="pt-2">
            <TaskList tasks={log.tasks} onToggle={toggleTask} />
          </div>
        </details>
      )}

      <Chat
        mode="evening"
        context={context}
        messages={log?.eveningDialogue?.messages ?? []}
        onMessagesChange={onMessagesChange}
        aiStarts
        disabled={finishing}
      />

      {userTurns >= 2 && (
        <div className="px-1 pb-4">
          {notice && (
            <p className="mb-2 rounded-xl border border-gold-400/30 bg-gold-400/10 px-3 py-2 text-sm text-gold-300">
              {notice}
            </p>
          )}
          <button
            onClick={finish}
            disabled={finishing}
            className="w-full rounded-2xl bg-gold-400 py-3.5 font-bold text-night-950 disabled:opacity-50"
          >
            {finishing ? "今日を記録しています…" : "振り返りを終える"}
          </button>
        </div>
      )}
    </main>
  );
}
