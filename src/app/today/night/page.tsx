"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import ChatWindow from "@/components/ChatWindow";
import EmptyState from "@/components/EmptyState";
import Spinner from "@/components/Spinner";
import StepIndicator from "@/components/StepIndicator";
import { useToast } from "@/components/Toast";
import { ArrowRightIcon, MoonIcon, SunriseIcon } from "@/components/icons";
import { useAuth } from "@/lib/auth/AuthContext";
import { useConversation } from "@/hooks/useConversation";
import { scoreDay } from "@/lib/api/client";
import { listDailyTasksByDate, setActualAmount } from "@/lib/db/dailyTasks";
import { listGoals } from "@/lib/db/goals";
import { addReflection, getReflectionByDate } from "@/lib/db/reflections";
import { buildGoalContext } from "@/lib/goals/context";
import { getLogicalDate } from "@/lib/time/dayBoundary";
import type { ApiMessage, DailyTaskDoc, GoalDoc, TaskResult } from "@/types";

type Stage = "reflect" | "record" | "saving";

const STEPS = ["振り返り対話", "実績の記録"];
const STAGE_STEP: Record<Stage, number> = { reflect: 0, record: 1, saving: 1 };

export default function NightPage() {
  return (
    <AppShell>
      <NightInner />
    </AppShell>
  );
}

function NightHeader() {
  return (
    <h1 className="font-display flex items-center gap-2.5 text-2xl font-semibold">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-night-soft text-night">
        <MoonIcon size={20} />
      </span>
      夜の振り返り
    </h1>
  );
}

function NightInner() {
  const { user, userDoc } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const tz = userDoc?.timezone ?? "Asia/Tokyo";
  const resetHour = userDoc?.dayResetHour ?? 4;
  const logicalDate = getLogicalDate(new Date(), tz, resetHour);

  const [stage, setStage] = useState<Stage>("reflect");
  const [tasks, setTasks] = useState<DailyTaskDoc[]>([]);
  const [goals, setGoals] = useState<GoalDoc[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [actuals, setActuals] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);

  const conv = useConversation({
    type: "night_reflection",
    aiStyle: userDoc?.aiStyle ?? "future_self",
    date: logicalDate,
    context: buildGoalContext(goals),
    resume: true,
  });

  const loadTasks = useCallback(async () => {
    if (!user) return;
    const [t, g] = await Promise.all([
      listDailyTasksByDate(user.uid, logicalDate),
      listGoals(user.uid),
    ]);
    setTasks(t);
    setGoals(g.filter((goal) => goal.status === "active"));
    setActuals(
      Object.fromEntries(t.map((task) => [task.id, task.actualAmount ?? 0]))
    );
    setLoadingTasks(false);
  }, [user, logicalDate]);

  useEffect(() => {
    // 非同期のデータ取得（state 更新は await 後に行う）
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadTasks();
  }, [loadTasks]);

  if (!userDoc || loadingTasks) return <Spinner label="今日の記録を確認中…" />;

  if (tasks.length === 0) {
    return (
      <div className="mx-auto w-full max-w-xl px-4 py-6">
        <NightHeader />
        <div className="mt-6">
          <EmptyState
            icon={<SunriseIcon size={22} />}
            title="今日のタスクがありません"
            description="先に朝のWOOPで今日の目標を設定してください。"
          />
        </div>
      </div>
    );
  }

  const handleFinalize = async () => {
    if (!user) return;
    setStage("saving");
    setError(null);
    try {
      const taskResults: TaskResult[] = tasks.map((t) => ({
        taskId: t.id,
        title: t.title,
        estimatedAmount: t.estimatedAmount,
        adjustedAmount: t.adjustedAmount,
        actualAmount: actuals[t.id] ?? 0,
      }));

      // 実績量をタスクに保存（見積もりvs実績の比較に使う）
      await Promise.all(
        taskResults.map((tr) =>
          setActualAmount(
            user.uid,
            tr.taskId,
            tr.actualAmount,
            tr.actualAmount >= tr.adjustedAmount
          )
        )
      );

      const convMessages: ApiMessage[] = conv.messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const result = await scoreDay(taskResults, convMessages);
      const existing = await getReflectionByDate(user.uid, logicalDate);
      if (existing) {
        toast("success", "本日の振り返りは既に保存済みです。");
        router.replace("/today");
        return;
      }

      await addReflection(user.uid, {
        date: logicalDate,
        score: result.score,
        achievementRateAdjusted: result.achievementRateAdjusted,
        achievementRateEstimated: result.achievementRateEstimated,
        summary: result.summary,
        taskResults,
        conversationId: conv.conversation?.id ?? "",
      });

      await conv.complete();
      toast("success", `今日のスコアは ${result.score} 点でした。おつかれさまでした！`);
      router.replace("/today");
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "スコアの保存に失敗しました。再試行してください。";
      setError(msg);
      toast("error", msg);
      setStage("record");
    }
  };

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-6">
      <div className="fade-up">
        <NightHeader />
        <p className="mt-2 text-sm leading-relaxed text-fg-muted">
          今日を振り返り、実際にできた量を記録します。
        </p>
      </div>

      <div className="fade-up mt-5">
        <StepIndicator steps={STEPS} current={STAGE_STEP[stage]} tone="night" />
      </div>

      <div className="mt-6">
        {stage === "reflect" && (
          <div className="space-y-4">
            {!conv.ready ? (
              <Spinner label="対話を準備中…" />
            ) : (
              <div className="fade-up flex h-[55vh] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
                <ChatWindow
                  messages={conv.messages}
                  streaming={conv.streaming}
                  streamingText={conv.streamingText}
                  error={conv.error}
                  onSend={conv.send}
                  onRetry={conv.retry}
                  placeholder="今日できたこと・できなかったことを話しましょう…"
                  footer={
                    <button
                      onClick={() => setStage("record")}
                      className="btn-night w-full"
                    >
                      実績を記録してスコアへ進む
                      <ArrowRightIcon size={16} />
                    </button>
                  }
                />
              </div>
            )}
          </div>
        )}

        {stage === "record" && (
          <div className="fade-up space-y-4">
            <p className="text-sm leading-relaxed text-fg-muted">
              各タスクの「実際にできた量」を入力してください。
            </p>
            <ul className="space-y-2">
              {tasks.map((t) => {
                const actual = actuals[t.id] ?? 0;
                const achieved = actual >= t.adjustedAmount;
                return (
                  <li key={t.id} className="card p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium">{t.title}</span>
                      <span className="shrink-0 text-xs text-fg-subtle tabular-nums">
                        目標 {t.adjustedAmount}
                        {t.unit ?? ""}
                      </span>
                    </div>
                    <div className="mt-2.5 flex items-center gap-2">
                      <label
                        htmlFor={`actual-${t.id}`}
                        className="text-sm text-fg-muted"
                      >
                        実績
                      </label>
                      <input
                        id={`actual-${t.id}`}
                        type="number"
                        min={0}
                        value={actual}
                        onChange={(e) =>
                          setActuals((prev) => ({
                            ...prev,
                            [t.id]: Number(e.target.value),
                          }))
                        }
                        className="input-base w-24 tabular-nums"
                      />
                      <span className="text-sm text-fg-subtle">
                        {t.unit ?? ""}
                      </span>
                      {achieved && (
                        <span className="chip ml-auto bg-accent-soft text-accent-strong">
                          目標達成
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => setStage("reflect")}
                className="btn-secondary flex-1"
              >
                対話に戻る
              </button>
              <button onClick={handleFinalize} className="btn-night flex-1">
                スコアを確定して保存
              </button>
            </div>
          </div>
        )}

        {stage === "saving" && <Spinner label="スコアを計算中…" />}
      </div>
    </div>
  );
}
