import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Chat, { START_MARKER } from "../components/Chat";
import PageHeader from "../components/PageHeader";
import TaskList from "../components/TaskList";
import { scoreEvening, suggestFirstTasks } from "../lib/api";
import { emptyDailyLog, getDailyLog, getRecentLogs, saveDailyLog } from "../lib/db";
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
  const [quickMood, setQuickMood] = useState<string>("まあまあ");
  const [quickCandidates, setQuickCandidates] = useState<string[]>([]);
  const [quickFirstTask, setQuickFirstTask] = useState("");
  const [loadingQuick, setLoadingQuick] = useState(false);
  const logRef = useRef<DailyLog | null>(null);
  const recentRef = useRef<DailyLog[]>([]);

  useEffect(() => {
    if (!uid) return;
    void (async () => {
      const [todayLog, recentLogs] = await Promise.all([getDailyLog(uid, today), getRecentLogs(uid, 4)]);
      logRef.current = todayLog;
      setLog(todayLog ?? emptyDailyLog(today));
      recentRef.current = recentLogs.filter((entry) => entry.date < today).slice(0, 3);
      setLoading(false);
    })();
  }, [uid, today]);

  const context: ChatContext | null = useMemo(() => {
    if (!profile || !log) return null;
    return {
      aiStyle: "labeling",
      idealSelf: ideal
        ? { title: ideal.title, description: ideal.description, habits: ideal.habits }
        : null,
      minimalRule: profile.minimalRule,
      mode: log.mode,
      todayTasks: log.tasks,
      recentDays: recentRef.current.map((entry) => ({
        date: entry.date,
        doneTasks: entry.tasks.filter((t) => t.done).map((t) => t.text),
        undoneTasks: entry.tasks.filter((t) => !t.done).map((t) => t.text),
        note: entry.eveningNote ?? null,
      })),
    };
  }, [profile, ideal, log]);

  const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));

  const loadQuickCandidates = async (mood: string) => {
    if (!log || loadingQuick) return;
    setLoadingQuick(true);
    try {
      const result = await suggestFirstTasks({
        tasks: log.tasks,
        idealHabits: ideal?.habits ?? [],
        mood,
      });
      const candidates = result.candidates.filter((text) => text.trim()).slice(0, 3);
      setQuickCandidates(candidates);
      if (!quickFirstTask.trim() && candidates[0]) {
        setQuickFirstTask(candidates[0]);
      }
    } catch {
      setNotice("明日の一歩候補の生成に失敗しました。少し待って再試行してください。");
    } finally {
      setLoadingQuick(false);
    }
  };

  const toggleTask = async (taskId: string) => {
    if (!uid || !log) return;
    const tasks = log.tasks.map((task) =>
      task.id === taskId ? { ...task, done: !task.done } : task,
    );
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
      await saveDailyLog(uid, today, {
        scores: {
          narikiri: clamp(result.narikiri),
          pace: clamp(result.pace),
          motivation: clamp(result.motivation),
          narikiriReason: result.narikiriReason,
          paceReason: result.paceReason,
          motivationReason: result.motivationReason,
        },
        tomorrowFirstTask: result.tomorrowFirstTask.trim(),
        eveningDialogue: { ...log.eveningDialogue, completedAt: Date.now() },
        eveningNote: null,
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

  const finishQuick = async () => {
    if (!uid || !log) return;
    const firstTask = quickFirstTask.trim();
    if (!firstTask) {
      setNotice("明日の最初の1タスクを選ぶか入力してください。");
      return;
    }
    setFinishing(true);
    setNotice(null);
    try {
      const done = log.tasks.filter((t) => t.done).length;
      const pace = log.tasks.length ? Math.round((done / log.tasks.length) * 100) : 0;
      const moodAdjustments: Record<string, { n: number; m: number }> = {
        よくできた: { n: 10, m: 15 },
        まあまあ: { n: 0, m: 5 },
        うまくいかなかった: { n: -10, m: -10 },
        忙しくて手つかず: { n: -15, m: -20 },
      };
      const moodAdj = moodAdjustments[quickMood] ?? moodAdjustments["まあまあ"];
      const narikiri = clamp(pace * 0.7 + (ideal ? 15 : 5) + moodAdj.n);
      const motivation = clamp(pace * 0.6 + 25 + moodAdj.m);
      await saveDailyLog(uid, today, {
        scores: {
          narikiri,
          pace,
          motivation,
          narikiriReason: `完了タスクと理想像の習慣への一致度をもとに算出。`,
          paceReason: `${log.tasks.length}タスク中${done}完了（完了率${pace}%）`,
          motivationReason: `自己評価「${quickMood}」と達成状況をもとに算出。`,
        },
        tomorrowFirstTask: firstTask,
        eveningDialogue: {
          messages: [{ role: "assistant", content: "クイック振り返りで記録しました。" }],
          completedAt: Date.now(),
        },
        eveningNote: quickMood,
        estimation: {
          planned: log.estimation?.planned ?? log.tasks.length,
          completed: done,
        },
      });
      navigate("/", { replace: true });
    } catch {
      setNotice("クイック振り返りの保存に失敗しました。もう一度お試しください。");
      setFinishing(false);
    }
  };

  if (loading || !context) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <p className="text-sm font-semibold tracking-widest text-[var(--color-text-secondary)]">夜の振り返りを準備中…</p>
      </main>
    );
  }

  if (log?.eveningDialogue?.completedAt) {
    return (
      <main className="px-4 lg:px-8">
        <div className="mx-auto max-w-2xl">
        <PageHeader eyebrow="NIGHT" title="夜の振り返り" />
        <p className="card mt-6 px-4 py-6 text-center text-sm text-[var(--color-text-secondary)]">
          今日の振り返りは完了しています。おつかれさまでした。
        </p>
        </div>
      </main>
    );
  }

  return (
    <main className="px-4 pb-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <PageHeader eyebrow="NIGHT" title="今日を振り返る" />
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-6">
          <div className="flex min-h-[60vh] flex-col">
            {log && log.tasks.length > 0 && (
              <details className="mb-1 px-1" open={!log.tasks.some((t) => t.done)}>
                <summary className="cursor-pointer py-1 text-xs text-[var(--color-text-secondary)]">
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
                  <p className="mb-2 rounded-xl border border-[var(--color-brand-500)]/30 bg-[color-mix(in_srgb,var(--color-brand-500)_10%,white)] px-3 py-2 text-sm text-[var(--color-brand-600)]">
                    {notice}
                  </p>
                )}
                <button
                  onClick={finish}
                  disabled={finishing}
                  className="btn-primary w-full rounded-2xl py-3.5 font-bold disabled:opacity-50"
                >
                  {finishing ? "今日を記録しています…" : "振り返りを終える"}
                </button>
              </div>
            )}
          </div>

          <section className="card mx-1 mt-3 h-fit p-3 lg:mx-0 lg:mt-0">
            <p className="text-xs text-[var(--color-text-secondary)]">サッと終える（対話なし）</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {["よくできた", "まあまあ", "うまくいかなかった", "忙しくて手つかず"].map((mood) => (
                <button
                  key={mood}
                  onClick={() => {
                    setQuickMood(mood);
                    void loadQuickCandidates(mood);
                  }}
                  className={`rounded-xl border px-2 py-2 text-xs ${
                    quickMood === mood
                      ? "border-[var(--color-brand-500)]/60 bg-[color-mix(in_srgb,var(--color-brand-500)_10%,white)] text-[var(--color-brand-600)]"
                      : "border-[var(--color-line)] bg-[var(--color-bg-muted)] text-[var(--color-text-secondary)]"
                  }`}
                >
                  {mood}
                </button>
              ))}
            </div>
            <div className="mt-3 space-y-2">
              <button
                onClick={() => void loadQuickCandidates(quickMood)}
                disabled={loadingQuick}
                className="w-full rounded-xl border border-[var(--color-brand-500)]/40 bg-[var(--color-bg-page)] py-2 text-xs text-[var(--color-brand-600)] disabled:opacity-50"
              >
                {loadingQuick ? "候補を作成中…" : "明日の最初の1タスク候補を作る"}
              </button>
              {quickCandidates.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {quickCandidates.map((candidate) => (
                    <button
                      key={candidate}
                      onClick={() => setQuickFirstTask(candidate)}
                      className={`rounded-full border px-3 py-1 text-xs ${
                        quickFirstTask === candidate
                          ? "border-[var(--color-brand-500)]/60 bg-[color-mix(in_srgb,var(--color-brand-500)_10%,white)] text-[var(--color-brand-600)]"
                          : "border-[var(--color-line)] bg-[var(--color-bg-muted)] text-[var(--color-text-secondary)]"
                      }`}
                    >
                      {candidate}
                    </button>
                  ))}
                </div>
              )}
              <input
                value={quickFirstTask}
                onChange={(e) => setQuickFirstTask(e.target.value)}
                placeholder="明日の最初の1タスク（自由入力可）"
                className="w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-bg-page)] px-3 py-2 text-sm text-[var(--color-text-main)] placeholder:text-[var(--color-text-faint)]"
              />
              <button
                onClick={finishQuick}
                disabled={finishing}
                className="btn-primary w-full rounded-xl py-2.5 text-sm font-bold disabled:opacity-50"
              >
                サッと終える
              </button>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
