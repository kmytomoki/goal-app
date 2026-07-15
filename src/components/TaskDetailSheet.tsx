import { useEffect, useState } from "react";
import type { Task } from "../lib/types";

interface TaskDetailSheetProps {
  task: Task | null;
  date: string;
  open: boolean;
  onClose: () => void;
  onSave: (payload: { taskId: string; text: string; priority: 1 | 2 | 3 | 4; date: string }) => Promise<void> | void;
  onDelete: (taskId: string) => Promise<void> | void;
}

const PRIORITY_OPTIONS: Array<{ value: 1 | 2 | 3 | 4; label: string; color: string }> = [
  { value: 1, label: "P1", color: "var(--color-priority-1)" },
  { value: 2, label: "P2", color: "var(--color-priority-2)" },
  { value: 3, label: "P3", color: "var(--color-priority-3)" },
  { value: 4, label: "P4", color: "var(--color-priority-4)" },
];

export default function TaskDetailSheet({
  task,
  date,
  open,
  onClose,
  onSave,
  onDelete,
}: TaskDetailSheetProps) {
  const [text, setText] = useState("");
  const [priority, setPriority] = useState<1 | 2 | 3 | 4>(4);
  const [nextDate, setNextDate] = useState(date);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!task) return;
    setText(task.text);
    setPriority(task.priority ?? 4);
    setNextDate(date);
  }, [task, date]);

  if (!open || !task) return null;

  return (
    <div className="fixed inset-0 z-40">
      <button className="absolute inset-0 bg-black/20" onClick={onClose} aria-label="閉じる" />
      <section className="absolute right-0 bottom-0 left-0 z-10 rounded-t-2xl border border-[var(--color-line)] bg-[var(--color-bg-page)] p-4 shadow-lg">
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-[var(--color-line)]" />
        <h2 className="text-base font-semibold text-[var(--color-text-main)]">タスク詳細</h2>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          className="mt-3 w-full resize-none rounded-xl border border-[var(--color-line)] px-3 py-2 text-sm text-[var(--color-text-main)]"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {PRIORITY_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setPriority(option.value)}
              className={`rounded-full border px-3 py-1 text-xs ${
                priority === option.value
                  ? "border-transparent text-white"
                  : "border-[var(--color-line)] text-[var(--color-text-secondary)]"
              }`}
              style={priority === option.value ? { background: option.color } : undefined}
            >
              {option.label}
            </button>
          ))}
        </div>
        <label className="mt-3 block text-xs text-[var(--color-text-secondary)]">
          日付
          <input
            type="date"
            value={nextDate}
            onChange={(e) => setNextDate(e.target.value)}
            className="mt-1 block w-full rounded-xl border border-[var(--color-line)] px-3 py-2 text-sm"
          />
        </label>
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => void onDelete(task.id)}
            className="rounded-xl border border-[var(--color-priority-1)] px-4 py-2 text-sm text-[var(--color-priority-1)]"
          >
            削除
          </button>
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-[var(--color-line)] py-2 text-sm text-[var(--color-text-secondary)]"
          >
            閉じる
          </button>
          <button
            onClick={async () => {
              if (!text.trim()) return;
              setSaving(true);
              try {
                await onSave({ taskId: task.id, text: text.trim(), priority, date: nextDate });
                onClose();
              } finally {
                setSaving(false);
              }
            }}
            disabled={!text.trim() || saving}
            className="btn-primary flex-1 rounded-xl py-2 text-sm font-semibold disabled:opacity-40"
          >
            保存
          </button>
        </div>
      </section>
    </div>
  );
}
