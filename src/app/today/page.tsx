"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import ScoreRing from "@/components/ScoreRing";
import Spinner from "@/components/Spinner";
import {
  ArrowRightIcon,
  CheckIcon,
  FlagIcon,
  MoonIcon,
  SparklesIcon,
  SunIcon,
  SunriseIcon,
} from "@/components/icons";
import { useAuth } from "@/lib/auth/AuthContext";
import { listDailyTasksByDate, updateDailyTask } from "@/lib/db/dailyTasks";
import { listGoals } from "@/lib/db/goals";
import { getReflectionByDate, listReflections } from "@/lib/db/reflections";
import { getLogicalDate, getDayPhase } from "@/lib/time/dayBoundary";
import type { DailyTaskDoc, GoalDoc, ReflectionDoc } from "@/types";

export default function TodayPage() {
  return (
    <AppShell>
      <TodayInner />
    </AppShell>
  );
}

function formatDateJa(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(d);
}

const PHASE_UI = {
  morning: {
    greeting: "おはようございます",
    icon: SunriseIcon,
    iconClass: "bg-primary-soft text-secondary",
  },
  day: {
    greeting: "こんにちは",
    icon: SunIcon,
    iconClass: "bg-primary-soft text-secondary",
  },
  night: {
    greeting: "おつかれさまです",
    icon: MoonIcon,
    iconClass: "bg-night-soft text-night",
  },
} as const;

function TodayInner() {
  const { user, userDoc } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<DailyTaskDoc[]>([]);
  const [goals, setGoals] = useState<GoalDoc[]>([]);
  const [reflection, setReflection] = useState<ReflectionDoc | null>(null);
  const [hasHistory, setHasHistory] = useState(false);
  const [streak, setStreak] = useState(0);

  const tz = userDoc?.timezone ?? "Asia/Tokyo";
  const resetHour = userDoc?.dayResetHour ?? 4;
  const logicalDate = getLogicalDate(new Date(), tz, resetHour);
  const phase = getDayPhase(new Date(), tz, resetHour);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [t, r, hist, g] = await Promise.all([
      listDailyTasksByDate(user.uid, logicalDate),
      getReflectionByDate(user.uid, logicalDate),
      listReflections(user.uid, 30),
      listGoals(user.uid),
    ]);
    setTasks(t);
    setReflection(r);
    setHasHistory(hist.length > 0);
    setStreak(calcStreak(hist.map((item) => item.date)));
    setGoals(g.filter((goal) => goal.status === "active"));
    setLoading(false);
  }, [user, logicalDate]);

  useEffect(() => {
    // 非同期のデータ取得（state 更新は await 後に行う）
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  if (loading || !userDoc) return <Spinner label="今日の状況を確認中…" />;

  // 初回（Day1）判定: 履歴がなく、今日のタスクもまだ無い
  const isFirstDay = !hasHistory && tasks.length === 0 && !reflection;
  const mustTasks = tasks.filter((t) => t.category === "must");
  const optionalTasks = tasks.filter((t) => t.category === "optional");
  const doneCount = tasks.filter((t) => t.completed).length;
  const ui = PHASE_UI[phase] ?? PHASE_UI.day;
  const PhaseIcon = ui.icon;

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-6">
      <div className="fade-up mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium tracking-wide text-fg-subtle">
            {formatDateJa(logicalDate)}
          </p>
          <h1 className="font-display mt-1 text-[1.7rem] font-semibold leading-snug">
            {ui.greeting}
            {userDoc.displayName ? `、${userDoc.displayName}さん` : ""}
          </h1>
        </div>
        <span
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${ui.iconClass}`}
          aria-hidden
        >
          <PhaseIcon size={22} />
        </span>
      </div>

      {isFirstDay && (
        <div className="fade-up mb-6 flex items-start gap-3 rounded-2xl border border-primary/15 bg-gradient-to-br from-primary-soft to-amber-50 p-4 text-sm leading-relaxed text-primary-strong">
          <SparklesIcon size={18} className="mt-0.5 shrink-0 text-secondary" />
          <p>
            理想の自分への第一歩へようこそ。まずは「朝のWOOP」で今日の行動を決めましょう。
          </p>
        </div>
      )}

      {streak > 0 && (
        <div className="fade-up mb-4 rounded-xl border border-accent/25 bg-accent-soft p-3 text-sm text-accent-strong">
          連続 {streak} 日で振り返りを継続中です。今日も小さく積み上げましょう。
        </div>
      )}

      {userDoc.reminderEnabled === false && (
        <div className="fade-up mb-4 rounded-xl border border-border bg-muted p-3 text-sm text-fg-muted">
          リマインドがオフです。習慣化のため、設定から通知をオンにするのがおすすめです。
          <Link href="/settings" className="ml-2 underline underline-offset-2">
            設定へ
          </Link>
        </div>
      )}

      <GoalsCard goals={goals} />

      {/* 朝のWOOP / 1日の目標設定 */}
      {tasks.length === 0 ? (
        <MorningCta />
      ) : (
        <section className="fade-up space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-fg-muted">今日の目標</h2>
            <span className="chip bg-muted text-fg-muted">
              <CheckIcon size={12} className="text-accent" />
              {doneCount} / {tasks.length} 完了
            </span>
          </div>
          {tasks.length > 0 && (
            <div
              className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuenow={doneCount}
              aria-valuemin={0}
              aria-valuemax={tasks.length}
              aria-label="今日の達成状況"
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-secondary to-accent transition-all duration-500"
                style={{
                  width: `${tasks.length ? (doneCount / tasks.length) * 100 : 0}%`,
                }}
              />
            </div>
          )}
          <TaskGroup title="絶対やる" tasks={mustTasks} must onTaskChanged={load} />
          <TaskGroup title="できたらやる" tasks={optionalTasks} onTaskChanged={load} />
        </section>
      )}

      {/* 夜の振り返り */}
      {tasks.length > 0 && (
        <div className="mt-8">
          {reflection ? (
            <ReflectionCard reflection={reflection} />
          ) : (
            <Link
              href="/today/night"
              className="fade-up group flex items-center justify-between gap-4 rounded-2xl bg-gradient-to-br from-night to-night-strong p-5 text-white shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
            >
              <span className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15">
                  <MoonIcon size={18} />
                </span>
                <span>
                  <span className="block font-semibold">夜の振り返りをする</span>
                  <span className="mt-0.5 block text-xs text-indigo-100">
                    今日を言葉にして、スコアで締めくくりましょう
                  </span>
                </span>
              </span>
              <ArrowRightIcon
                size={18}
                className="shrink-0 transition-transform duration-200 group-hover:translate-x-1"
              />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function calcStreak(dates: string[]): number {
  if (!dates.length) return 0;
  const set = new Set(dates);
  const toDateKey = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };
  let streak = 0;
  let cursor = new Date();
  while (true) {
    if (!set.has(toDateKey(cursor))) break;
    streak += 1;
    cursor = new Date(cursor.getTime() - 24 * 60 * 60 * 1000);
  }
  return streak;
}

function MorningCta() {
  return (
    <div className="fade-up relative overflow-hidden rounded-3xl border border-primary/15 bg-gradient-to-b from-amber-50 via-primary-soft to-surface px-6 py-10 text-center shadow-sm">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-secondary text-white shadow-md">
        <SunriseIcon size={26} />
      </div>
      <h3 className="font-display mt-4 text-lg font-semibold text-foreground">
        今日の目標はまだありません
      </h3>
      <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-fg-muted">
        朝のWOOPで今日やることを決め、AIが現実的な量に調整します。
      </p>
      <Link href="/today/morning" className="btn-primary mt-6">
        朝のWOOPを始める
        <ArrowRightIcon size={16} />
      </Link>
    </div>
  );
}

const LAYER_LABEL: { layer: GoalDoc["layer"]; label: string }[] = [
  { layer: "vision_5y", label: "5年後の理想像" },
  { layer: "goal_3m", label: "3ヶ月目標" },
  { layer: "weekly", label: "今週のゴール" },
];

/** 5年後 → 3ヶ月 → 週次 を縦のはしご（タイムライン）で見せる */
function GoalsCard({ goals }: { goals: GoalDoc[] }) {
  if (goals.length === 0) return null;
  const rows = LAYER_LABEL.map(({ layer, label }) => ({
    label,
    layer,
    items: goals.filter((g) => g.layer === layer),
  })).filter((r) => r.items.length > 0);

  return (
    <div className="card fade-up mb-6 p-5">
      <h2 className="mb-4 flex items-center gap-1.5 text-sm font-semibold text-fg-muted">
        <FlagIcon size={14} className="text-secondary" />
        あなたの目標
      </h2>
      <ol className="relative space-y-4">
        {/* 各層をつなぐ縦ライン */}
        <span
          aria-hidden
          className="absolute bottom-2 left-[5px] top-2 w-px bg-border"
        />
        {rows.map(({ layer, label, items }, i) => (
          <li key={layer} className="relative flex items-start gap-3 pl-5">
            <span
              aria-hidden
              className={`absolute left-0 top-1.5 h-[11px] w-[11px] rounded-full border-2 ${
                i === 0
                  ? "border-secondary bg-amber-100"
                  : "border-border bg-surface"
              }`}
            />
            <span className="w-full">
              <span className="block text-[11px] font-medium tracking-wide text-fg-subtle">
                {label}
              </span>
              <span
                className={`mt-0.5 block leading-relaxed ${
                  layer === "vision_5y"
                    ? "font-display text-[15px] font-semibold text-foreground"
                    : "text-sm text-foreground"
                }`}
              >
                {items.map((g) => g.title).join(" / ")}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function TaskGroup({
  title,
  tasks,
  must = false,
  onTaskChanged,
}: {
  title: string;
  tasks: DailyTaskDoc[];
  must?: boolean;
  onTaskChanged: () => Promise<void>;
}) {
  const { user } = useAuth();
  if (tasks.length === 0) return null;

  const handleToggle = async (task: DailyTaskDoc) => {
    if (!user) return;
    await updateDailyTask(user.uid, task.id, {
      completed: !task.completed,
      actualAmount: !task.completed
        ? task.actualAmount ?? task.adjustedAmount
        : task.actualAmount ?? 0,
    });
    await onTaskChanged();
  };

  return (
    <div>
      <h3
        className={`mb-2 flex items-center gap-1.5 text-sm font-semibold ${
          must ? "text-primary" : "text-fg-subtle"
        }`}
      >
        {must && <FlagIcon size={13} />}
        {title}
      </h3>
      <ul className="space-y-2">
        {tasks.map((t) => (
          <li
            key={t.id}
            className="card flex items-center gap-3 px-4 py-3 text-sm"
          >
            <span
              aria-hidden
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                t.completed
                  ? "border-accent bg-accent text-white"
                  : "border-border bg-surface"
              }`}
            >
              {t.completed && <CheckIcon size={11} />}
            </span>
            <span
              className={`flex-1 ${
                t.completed ? "text-fg-subtle line-through" : "text-foreground"
              }`}
            >
              {t.title}
              {t.completed && <span className="sr-only">（完了）</span>}
            </span>
            <span className="shrink-0 text-xs text-fg-subtle">
              目標 {t.adjustedAmount}
              {t.unit ?? ""}
              {t.actualAmount != null && (
                <>
                  {" "}
                  ／ 実績{" "}
                  <span
                    className={
                      t.actualAmount >= t.adjustedAmount
                        ? "font-semibold text-accent"
                        : ""
                    }
                  >
                    {t.actualAmount}
                    {t.unit ?? ""}
                  </span>
                </>
              )}
            </span>
            <button
              onClick={() => void handleToggle(t)}
              className={`chip ml-2 shrink-0 ${
                t.completed
                  ? "bg-accent-soft text-accent-strong"
                  : "bg-muted text-fg-muted"
              }`}
            >
              {t.completed ? "未完了に戻す" : "完了"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RateBar({ label, rate }: { label: string; rate: number }) {
  const pct = Math.round(rate * 100);
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-fg-subtle">{label}</span>
        <span className="font-semibold text-fg-muted tabular-nums">{pct}%</span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-gradient-to-r from-secondary to-accent"
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
    </div>
  );
}

function ReflectionCard({ reflection }: { reflection: ReflectionDoc }) {
  return (
    <div className="card fade-up p-5">
      <div className="flex items-center gap-4">
        <ScoreRing score={reflection.score} />
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">今日の振り返り</h2>
          <p className="mt-1 text-sm leading-relaxed text-fg-muted">
            {reflection.summary}
          </p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4">
        <RateBar
          label="達成率（調整後）"
          rate={reflection.achievementRateAdjusted}
        />
        <RateBar
          label="達成率（見積もり）"
          rate={reflection.achievementRateEstimated}
        />
      </div>
    </div>
  );
}
