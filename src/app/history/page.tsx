"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import EmptyState from "@/components/EmptyState";
import ScoreRing from "@/components/ScoreRing";
import Spinner from "@/components/Spinner";
import { ChartIcon } from "@/components/icons";
import { useAuth } from "@/lib/auth/AuthContext";
import { listReflections } from "@/lib/db/reflections";
import type { ReflectionDoc } from "@/types";

export default function HistoryPage() {
  return (
    <AppShell>
      <HistoryInner />
    </AppShell>
  );
}

function formatDateShort(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).format(d);
}

/** 直近スコアの推移を棒グラフで俯瞰する（古い→新しいの順に左から） */
function ScoreTrend({ items }: { items: ReflectionDoc[] }) {
  if (items.length < 2) return null;
  const recent = items.slice(0, 14).reverse();
  const avg = Math.round(
    recent.reduce((sum, r) => sum + r.score, 0) / recent.length
  );

  return (
    <div className="card fade-up mb-6 p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-fg-muted">
          スコアの推移（直近{recent.length}日）
        </h2>
        <p className="text-xs text-fg-subtle">
          平均{" "}
          <span className="text-base font-bold text-primary tabular-nums">
            {avg}
          </span>{" "}
          点
        </p>
      </div>
      <div
        className="mt-3 flex h-24 items-end gap-1.5"
        role="img"
        aria-label={`直近${recent.length}日のスコア推移。平均${avg}点。`}
      >
        {recent.map((r) => (
          <div
            key={r.id}
            className="group relative flex-1 rounded-t-md bg-gradient-to-t from-secondary/70 to-amber-400/80 transition-colors hover:from-secondary hover:to-amber-400"
            style={{ height: `${Math.max(6, r.score)}%` }}
            title={`${formatDateShort(r.date)}: ${r.score}点`}
          />
        ))}
      </div>
    </div>
  );
}

function HistoryInner() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ReflectionDoc[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setItems(await listReflections(user.uid, 60));
      setLoading(false);
    })();
  }, [user]);

  if (loading) return <Spinner label="履歴を読み込み中…" />;

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-6">
      <h1 className="font-display fade-up mb-6 text-2xl font-semibold">履歴</h1>

      {items.length === 0 ? (
        <EmptyState
          icon={<ChartIcon size={22} />}
          title="まだ振り返りがありません"
          description="夜の振り返りを終えると、ここにスコアの履歴が並びます。"
          action={
            <Link href="/today" className="btn-primary">
              今日のページへ
            </Link>
          }
        />
      ) : (
        <>
          <ScoreTrend items={items} />
          <ul className="space-y-3">
            {items.map((r) => (
              <li key={r.id} className="card fade-up flex gap-4 p-4">
                <div className="shrink-0">
                  <ScoreRing score={r.score} size={56} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-fg-subtle">
                    {formatDateShort(r.date)}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-fg-muted">
                    {r.summary}
                  </p>
                  <p className="mt-2 text-xs text-fg-subtle tabular-nums">
                    達成率（調整後）{Math.round(r.achievementRateAdjusted * 100)}%
                    ／ （見積もり）
                    {Math.round(r.achievementRateEstimated * 100)}%
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
