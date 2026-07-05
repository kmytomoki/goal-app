"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Timestamp } from "firebase/firestore";
import AppShell from "@/components/AppShell";
import ChatWindow from "@/components/ChatWindow";
import Spinner from "@/components/Spinner";
import StepIndicator from "@/components/StepIndicator";
import { useToast } from "@/components/Toast";
import {
  ArrowRightIcon,
  FlagIcon,
  PlusIcon,
  SparklesIcon,
  SunriseIcon,
  TrashIcon,
} from "@/components/icons";
import { useAuth } from "@/lib/auth/AuthContext";
import { useConversation } from "@/hooks/useConversation";
import {
  adjustTasks,
  classifyTasks,
  extractTasksFromWoop,
  type AdjustResponse,
} from "@/lib/api/client";
import { addDailyTask, findDailyTaskByDateAndTitle } from "@/lib/db/dailyTasks";
import { listGoals } from "@/lib/db/goals";
import { buildGoalContext, pickDailyGoalId } from "@/lib/goals/context";
import { getLogicalDate } from "@/lib/time/dayBoundary";
import type { GoalDoc, TaskCategory } from "@/types";

type Stage = "woop" | "input" | "review" | "saving";

const STEPS = ["WOOP対話", "目標の入力", "AI調整の確認"];
const STAGE_STEP: Record<Stage, number> = {
  woop: 0,
  input: 1,
  review: 2,
  saving: 2,
};

interface TaskRow {
  id: string;
  title: string;
  estimatedAmount: number;
  unit: string;
}

interface ReviewItem {
  id: string;
  title: string;
  estimatedAmount: number;
  adjustedAmount: number;
  ratio: number;
  reason: string;
  unit: string;
  category: TaskCategory;
}

const rowId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export default function MorningPage() {
  return (
    <AppShell>
      <MorningInner />
    </AppShell>
  );
}

function MorningInner() {
  const { user, userDoc } = useAuth();
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("woop");
  const [goalContext, setGoalContext] = useState("目標情報なし");
  const [seedRows, setSeedRows] = useState<TaskRow[]>([]);

  const tz = userDoc?.timezone ?? "Asia/Tokyo";
  const resetHour = userDoc?.dayResetHour ?? 4;
  const logicalDate = getLogicalDate(new Date(), tz, resetHour);

  if (!userDoc) return <Spinner />;

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-6">
      <div className="fade-up flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display flex items-center gap-2.5 text-2xl font-semibold">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft text-secondary">
              <SunriseIcon size={20} />
            </span>
            朝のWOOP
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-fg-muted">
            Wish → Outcome → Obstacle → Plan で今日の行動を決めます。
          </p>
        </div>
      </div>

      <div className="fade-up mt-5">
        <StepIndicator steps={STEPS} current={STAGE_STEP[stage]} />
      </div>

      <div className="mt-6">
        {stage === "woop" && (
          <WoopStage
            uid={user!.uid}
            logicalDate={logicalDate}
            aiStyle={userDoc.aiStyle}
            goalContext={goalContext}
            onGoalContextReady={setGoalContext}
            onProceed={(rows) => {
              setSeedRows(rows);
              setStage("input");
            }}
          />
        )}
        {(stage === "input" || stage === "review" || stage === "saving") && (
          <TaskStage
            stage={stage}
            setStage={setStage}
            logicalDate={logicalDate}
            uid={user!.uid}
            goalContext={goalContext}
            initialRows={seedRows}
            onDone={() => router.replace("/today")}
          />
        )}
      </div>
    </div>
  );
}

function WoopStage({
  uid,
  logicalDate,
  aiStyle,
  goalContext,
  onGoalContextReady,
  onProceed,
}: {
  uid: string;
  logicalDate: string;
  aiStyle: "future_self" | "coach";
  goalContext: string;
  onGoalContextReady: (context: string) => void;
  onProceed: (rows: TaskRow[]) => void;
}) {
  const { toast } = useToast();
  const [extracting, setExtracting] = useState(false);
  const conv = useConversation({
    type: "morning_woop",
    aiStyle,
    date: logicalDate,
    context: goalContext,
    resume: true,
  });
  useEffect(() => {
    void (async () => {
      const goals = await listGoals(uid);
      onGoalContextReady(buildGoalContext(goals));
    })();
  }, [uid, onGoalContextReady]);
  if (!conv.ready) return <Spinner label="WOOPを準備中…" />;
  return (
    <div className="fade-up flex h-[60vh] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <ChatWindow
        messages={conv.messages}
        streaming={conv.streaming}
        streamingText={conv.streamingText}
        error={conv.error}
        onSend={conv.send}
        onRetry={conv.retry}
        placeholder="今日の願い・成果・障害・計画を話してみましょう…"
        footer={
          <button
            onClick={async () => {
              await conv.complete();
              setExtracting(true);
              let nextRows: TaskRow[] = [];
              try {
                const res = await extractTasksFromWoop(
                  conv.messages.map((m) => ({ role: m.role, content: m.content }))
                );
                nextRows = res.items.map((it) => ({
                  id: rowId(),
                  title: it.title,
                  estimatedAmount: it.estimatedAmount || 1,
                  unit: it.unit || "",
                }));
              } catch (e) {
                toast(
                  "error",
                  e instanceof Error
                    ? e.message
                    : "WOOPからタスク抽出に失敗しました。手入力で進めてください。"
                );
              } finally {
                setExtracting(false);
              }
              onProceed(nextRows);
            }}
            className="btn-outline w-full"
            disabled={extracting}
          >
            {extracting ? "WOOPをタスク化中…" : "WOOP完了 → 今日の目標を設定する"}
            <ArrowRightIcon size={16} />
          </button>
        }
      />
    </div>
  );
}

function TaskStage({
  stage,
  setStage,
  logicalDate,
  uid,
  goalContext,
  initialRows,
  onDone,
}: {
  stage: Stage;
  setStage: (s: Stage) => void;
  logicalDate: string;
  uid: string;
  goalContext: string;
  initialRows: TaskRow[];
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [rows, setRows] = useState<TaskRow[]>(
    initialRows.length
      ? initialRows
      : [{ id: rowId(), title: "", estimatedAmount: 1, unit: "" }]
  );
  const [adjusting, setAdjusting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewMessage, setReviewMessage] = useState("");
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [goals, setGoals] = useState<GoalDoc[]>([]);

  useEffect(() => {
    void (async () => {
      setGoals((await listGoals(uid)).filter((g) => g.status === "active"));
    })();
  }, [uid]);

  const updateRow = (i: number, patch: Partial<TaskRow>) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const addRow = () =>
    setRows((prev) => [...prev, { id: rowId(), title: "", estimatedAmount: 1, unit: "" }]);
  const removeRow = (i: number) =>
    setRows((prev) => prev.filter((_, idx) => idx !== i));

  const handleAdjust = async () => {
    const valid = rows.filter((r) => r.title.trim());
    if (valid.length === 0) {
      setError("少なくとも1つタスクを入力してください。");
      return;
    }
    setError(null);
    setAdjusting(true);
    try {
      // 70%調整(adjust) と 絶対/できたら分類(classify) を並行実行
      const [adjust, classify] = await Promise.all([
        adjustTasks(
          valid.map((r) => ({
            id: r.id,
            title: r.title.trim(),
            estimatedAmount: Number(r.estimatedAmount) || 0,
            unit: r.unit || undefined,
          }))
        ) as Promise<AdjustResponse>,
        classifyTasks(valid.map((r) => ({ id: r.id, title: r.title.trim() }))),
      ]);

      const catById = new Map(classify.items.map((it) => [it.id, it.category]));
      const adjById = new Map(adjust.items.map((it) => [it.id, it]));

      const items: ReviewItem[] = valid.map((r) => {
        const adj = adjById.get(r.id);
        const est = Number(r.estimatedAmount) || 0;
        return {
          id: r.id,
          title: r.title.trim(),
          estimatedAmount: est,
          adjustedAmount: adj?.adjustedAmount ?? Math.round(est * 0.7),
          ratio: adj?.ratio ?? 0.7,
          reason: adj?.reason ?? "少し余裕を持たせました。",
          unit: r.unit,
          category: catById.get(r.id) ?? "optional",
        };
      });

      setReviewMessage(
        `${adjust.message}\n\n（目標コンテキスト）\n${goalContext}`
      );
      setReviewItems(items);
      setStage("review");
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "調整に失敗しました。再試行してください。";
      setError(msg);
      toast("error", msg);
    } finally {
      setAdjusting(false);
    }
  };

  const handleSave = async () => {
    setStage("saving");
    setError(null);
    try {
      const defaultGoalId = pickDailyGoalId(goals);
      for (const it of reviewItems) {
        const dup = await findDailyTaskByDateAndTitle(uid, logicalDate, it.title);
        if (dup) continue;
        await addDailyTask(uid, {
          date: logicalDate,
          title: it.title,
          category: it.category,
          estimatedAmount: it.estimatedAmount, // ユーザー見積もり（保持）
          adjustedAmount: it.adjustedAmount, // AI調整後
          actualAmount: null,
          unit: it.unit || undefined,
          bufferHistory: [
            {
              at: Timestamp.now(),
              before: it.estimatedAmount,
              after: it.adjustedAmount,
              ratio: it.ratio,
              reason: it.reason,
            },
          ],
          completed: false,
          goalId: defaultGoalId,
          source: "form",
        });
      }
      toast("success", "今日の目標を保存しました");
      onDone();
    } catch {
      setError("保存に失敗しました。もう一度お試しください。");
      toast("error", "保存に失敗しました。もう一度お試しください。");
      setStage("review");
    }
  };

  if (stage === "review") {
    return (
      <div className="fade-up space-y-4">
        <div className="flex items-start gap-3 rounded-2xl border border-primary/15 bg-gradient-to-br from-primary-soft to-amber-50 p-4 text-sm text-primary-strong">
          <SparklesIcon size={18} className="mt-0.5 shrink-0 text-secondary" />
          <div>
            <p className="font-semibold">AIからの調整提案（70%ルール）</p>
            <p className="mt-1 leading-relaxed">{reviewMessage}</p>
          </div>
        </div>
        <ul className="space-y-2">
          {reviewItems.map((it, i) => (
            <li key={i} className="card p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium">{it.title}</span>
                <span
                  className={`chip shrink-0 ${
                    it.category === "must"
                      ? "bg-primary-soft text-primary"
                      : "bg-muted text-fg-muted"
                  }`}
                >
                  {it.category === "must" && <FlagIcon size={11} />}
                  {it.category === "must" ? "絶対やる" : "できたらやる"}
                </span>
              </div>
              <div className="mt-2.5 flex items-center gap-2 text-sm">
                <span className="text-fg-subtle line-through decoration-fg-subtle/50 tabular-nums">
                  {it.estimatedAmount}
                  {it.unit}
                </span>
                <ArrowRightIcon size={14} className="text-secondary" />
                <span className="font-semibold text-primary tabular-nums">
                  目標 {it.adjustedAmount}
                  {it.unit}
                </span>
                <span className="chip ml-auto bg-muted text-fg-subtle tabular-nums">
                  ×{it.ratio.toFixed(1)}
                </span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-fg-subtle">
                {it.reason}
              </p>
            </li>
          ))}
        </ul>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <button onClick={() => setStage("input")} className="btn-secondary flex-1">
            入力に戻る
          </button>
          <button onClick={handleSave} className="btn-primary flex-1">
            この内容で確定する
          </button>
        </div>
      </div>
    );
  }

  if (stage === "saving") return <Spinner label="保存中…" />;

  // stage === "input"
  return (
    <div className="fade-up space-y-4">
      <p className="text-sm leading-relaxed text-fg-muted">
        今日やりたいことと、その量（見積もり）を入力してください。AIが現実的な量に調整します。
      </p>
      <ul className="space-y-3">
        {rows.map((r, i) => (
          <li key={i} className="card p-4">
            <label className="sr-only" htmlFor={`task-title-${i}`}>
              やること
            </label>
            <input
              id={`task-title-${i}`}
              placeholder="やること（例: 英単語を覚える）"
              value={r.title}
              onChange={(e) => updateRow(i, { title: e.target.value })}
              className="input-base"
            />
            <div className="mt-2 flex items-center gap-2">
              <label className="sr-only" htmlFor={`task-amount-${i}`}>
                量の見積もり
              </label>
              <input
                id={`task-amount-${i}`}
                type="number"
                min={0}
                value={r.estimatedAmount}
                onChange={(e) =>
                  updateRow(i, { estimatedAmount: Number(e.target.value) })
                }
                className="input-base w-24 tabular-nums"
              />
              <label className="sr-only" htmlFor={`task-unit-${i}`}>
                単位
              </label>
              <input
                id={`task-unit-${i}`}
                placeholder="単位（個/分/ページ）"
                value={r.unit}
                onChange={(e) => updateRow(i, { unit: e.target.value })}
                className="input-base flex-1"
              />
              {rows.length > 1 && (
                <button
                  onClick={() => removeRow(i)}
                  aria-label={`「${r.title || `タスク${i + 1}`}」を削除`}
                  className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-fg-subtle transition-colors hover:bg-destructive-soft hover:text-destructive"
                >
                  <TrashIcon size={16} />
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
      <button onClick={addRow} className="btn-ghost -ml-2 text-primary hover:bg-primary-soft hover:text-primary">
        <PlusIcon size={16} />
        タスクを追加
      </button>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <button
        onClick={handleAdjust}
        disabled={adjusting}
        className="btn-primary w-full"
      >
        {adjusting ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            AIが調整中…
          </>
        ) : (
          <>
            <SparklesIcon size={16} />
            AIに調整してもらう
          </>
        )}
      </button>
    </div>
  );
}
