"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import Spinner from "@/components/Spinner";
import { useToast } from "@/components/Toast";
import { CompassIcon, FlagIcon, TargetIcon } from "@/components/icons";
import { useAuth } from "@/lib/auth/AuthContext";
import { listGoals, updateGoal } from "@/lib/db/goals";
import { listReflections } from "@/lib/db/reflections";
import type { GoalDoc } from "@/types";

const LAYERS: Array<{ layer: GoalDoc["layer"]; label: string }> = [
  { layer: "vision_5y", label: "5年後の理想像" },
  { layer: "goal_3m", label: "3ヶ月目標" },
  { layer: "weekly", label: "今週のゴール" },
];

export default function GoalsPage() {
  return (
    <AppShell>
      <GoalsInner />
    </AppShell>
  );
}

function GoalsInner() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [goals, setGoals] = useState<GoalDoc[]>([]);
  const [draftWeekly, setDraftWeekly] = useState("");
  const [saving, setSaving] = useState(false);
  const [streak, setStreak] = useState(0);

  const weekly = useMemo(
    () => goals.find((g) => g.layer === "weekly" && g.status === "active") ?? null,
    [goals]
  );

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [g, reflections] = await Promise.all([
      listGoals(user.uid),
      listReflections(user.uid, 60),
    ]);
    const active = g.filter((item) => item.status === "active");
    setGoals(active);
    setDraftWeekly(active.find((item) => item.layer === "weekly")?.title ?? "");
    setStreak(calcStreak(reflections.map((r) => r.date)));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  if (loading) return <Spinner label="目標を読み込み中…" />;

  const handleSaveWeekly = async () => {
    if (!user || !weekly) return;
    if (!draftWeekly.trim()) {
      toast("error", "今週のゴールを入力してください。");
      return;
    }
    setSaving(true);
    try {
      await updateGoal(user.uid, weekly.id, { title: draftWeekly.trim() });
      toast("success", "今週のゴールを更新しました。");
      await load();
    } catch {
      toast("error", "更新に失敗しました。");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-6 space-y-6">
      <section className="card p-5">
        <h1 className="font-display text-2xl font-semibold flex items-center gap-2">
          <TargetIcon size={22} />
          目標レビュー
        </h1>
        <p className="mt-2 text-sm text-fg-muted leading-relaxed">
          5年後の理想像から今週の行動まで、週次で見直してズレを小さくします。
        </p>
      </section>

      <section className="card p-5">
        <h2 className="font-semibold flex items-center gap-2">
          <CompassIcon size={18} />
          現在の目標
        </h2>
        <ul className="mt-3 space-y-3">
          {LAYERS.map(({ layer, label }) => {
            const item = goals.find((g) => g.layer === layer);
            if (!item) return null;
            return (
              <li key={layer} className="rounded-xl border border-border p-3">
                <p className="text-xs text-fg-subtle">{label}</p>
                <p className="mt-1 text-sm leading-relaxed">{item.title}</p>
              </li>
            );
          })}
        </ul>
      </section>

      {weekly && (
        <section className="card p-5">
          <h2 className="font-semibold flex items-center gap-2">
            <FlagIcon size={17} />
            今週のゴールを更新
          </h2>
          <textarea
            value={draftWeekly}
            onChange={(e) => setDraftWeekly(e.target.value)}
            rows={3}
            className="input-base mt-3"
            placeholder="今週のゴールを入力"
          />
          <button
            onClick={handleSaveWeekly}
            disabled={saving}
            className="btn-primary mt-3 w-full"
          >
            {saving ? "保存中…" : "更新する"}
          </button>
        </section>
      )}

      <section className="card p-5">
        <h2 className="font-semibold">継続状況</h2>
        <p className="mt-2 text-sm text-fg-muted">
          連続で振り返りを記録した日数:{" "}
          <span className="font-semibold text-primary">{streak}日</span>
        </p>
      </section>
    </div>
  );
}

function calcStreak(dates: string[]): number {
  if (!dates.length) return 0;
  const set = new Set(dates);
  let streak = 0;
  let cursor = new Date();
  while (true) {
    const key = cursor.toISOString().slice(0, 10);
    if (!set.has(key)) break;
    streak += 1;
    cursor = new Date(cursor.getTime() - 24 * 60 * 60 * 1000);
  }
  return streak;
}
