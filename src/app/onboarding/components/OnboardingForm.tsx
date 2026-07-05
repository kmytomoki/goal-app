"use client";

import { useState } from "react";
import type { EntrySource } from "@/types";

export interface GoalDraft {
  vision5y: string;
  goal3m: string;
  weekly: string;
}

const FIELDS = [
  {
    key: "vision5y" as const,
    label: "5年後の理想像",
    required: true,
    rows: 3,
    placeholder: "例: 自分の専門性で人の役に立ち、心身ともに健やかに生きている",
  },
  {
    key: "goal3m" as const,
    label: "3ヶ月目標",
    required: true,
    rows: 2,
    placeholder: "例: 基礎スキルを身につけ、小さな成果物を1つ完成させる",
  },
  {
    key: "weekly" as const,
    label: "今週のゴール",
    required: false,
    rows: 2,
    placeholder: "例: 毎日30分、教材を進める",
  },
];

/**
 * 各層を直接入力するフォーム。
 * - フォームモードの入力
 * - 対話後の最終確認（対話で固まった内容を確定する）
 * の両方で使う。
 */
export default function OnboardingForm({
  initial,
  source,
  onSave,
  saving,
}: {
  initial?: Partial<GoalDraft>;
  source: EntrySource;
  onSave: (draft: GoalDraft) => void;
  saving: boolean;
}) {
  const [draft, setDraft] = useState<GoalDraft>({
    vision5y: initial?.vision5y ?? "",
    goal3m: initial?.goal3m ?? "",
    weekly: initial?.weekly ?? "",
  });
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.vision5y.trim() || !draft.goal3m.trim()) {
      setError("5年後の理想像と3ヶ月目標は必須です。");
      return;
    }
    setError(null);
    onSave({
      vision5y: draft.vision5y.trim(),
      goal3m: draft.goal3m.trim(),
      weekly: draft.weekly.trim(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {source === "dialogue" && (
        <p className="text-sm leading-relaxed text-fg-muted">
          対話で見えてきた内容を、ここで確定しましょう。あとから編集できます。
        </p>
      )}

      {FIELDS.map((f) => (
        <div key={f.key}>
          <label
            htmlFor={`goal-${f.key}`}
            className="mb-1 block text-sm font-medium text-fg-muted"
          >
            {f.label}{" "}
            {f.required ? (
              <span aria-hidden className="text-destructive">
                *
              </span>
            ) : (
              <span className="text-xs font-normal text-fg-subtle">
                （任意）
              </span>
            )}
          </label>
          <textarea
            id={`goal-${f.key}`}
            value={draft[f.key]}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, [f.key]: e.target.value }))
            }
            rows={f.rows}
            placeholder={f.placeholder}
            aria-required={f.required}
            className="input-base"
          />
        </div>
      ))}

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <button type="submit" disabled={saving} className="btn-primary w-full">
        {saving ? "保存中…" : "保存して始める"}
      </button>
    </form>
  );
}
