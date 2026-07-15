import { useMemo, useState } from "react";
import { addDays, localDateKey } from "../lib/dates";

interface QuickAddSheetProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: {
    text: string;
    isFirstTask: boolean;
    priority: 1 | 2 | 3 | 4;
    date: string;
  }) => Promise<void> | void;
  initialDate: string;
}

const PRIORITIES: Array<{ value: 1 | 2 | 3 | 4; label: string; color: string }> = [
  { value: 1, label: "P1", color: "var(--color-priority-1)" },
  { value: 2, label: "P2", color: "var(--color-priority-2)" },
  { value: 3, label: "P3", color: "var(--color-priority-3)" },
  { value: 4, label: "P4", color: "var(--color-priority-4)" },
];

export default function QuickAddSheet({ open, onClose, onSubmit, initialDate }: QuickAddSheetProps) {
  const [text, setText] = useState("");
  const [isFirstTask, setIsFirstTask] = useState(false);
  const [priority, setPriority] = useState<1 | 2 | 3 | 4>(4);
  const [date, setDate] = useState(initialDate);
  const [saving, setSaving] = useState(false);

  const today = useMemo(() => localDateKey(), []);
  const tomorrow = useMemo(() => addDays(today, 1), [today]);

  if (!open) return null;

  const submit = async () => {
    const trimmed = text.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    try {
      await onSubmit({ text: trimmed, isFirstTask, priority, date });
      setText("");
      setIsFirstTask(false);
      setPriority(4);
      setDate(initialDate);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40">
      <button
        className="absolute inset-0 bg-black/20"
        onClick={onClose}
        aria-label="閉じる"
      />
      <section className="absolute right-0 bottom-0 left-0 z-10 rounded-t-2xl border border-[var(--color-line)] bg-[var(--color-bg-page)] p-4 shadow-lg">
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-[var(--color-line)]" />
        <h2 className="text-base font-semibold text-[var(--color-text-main)]">クイック追加</h2>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="タスクを入力"
          rows={2}
          className="mt-3 w-full resize-none rounded-xl border border-[var(--color-line)] bg-[var(--color-bg-page)] px-3 py-2 text-sm text-[var(--color-text-main)]"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => setDate(today)}
            className={`rounded-full border px-3 py-1 text-xs ${
              date === today
                ? "border-[var(--color-brand-500)] bg-[color-mix(in_srgb,var(--color-brand-500)_12%,white)] text-[var(--color-brand-600)]"
                : "border-[var(--color-line)] text-[var(--color-text-secondary)]"
            }`}
          >
            今日
          </button>
          <button
            onClick={() => setDate(tomorrow)}
            className={`rounded-full border px-3 py-1 text-xs ${
              date === tomorrow
                ? "border-[var(--color-brand-500)] bg-[color-mix(in_srgb,var(--color-brand-500)_12%,white)] text-[var(--color-brand-600)]"
                : "border-[var(--color-line)] text-[var(--color-text-secondary)]"
            }`}
          >
            明日
          </button>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-full border border-[var(--color-line)] px-3 py-1 text-xs text-[var(--color-text-secondary)]"
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {PRIORITIES.map((item) => (
            <button
              key={item.value}
              onClick={() => setPriority(item.value)}
              className={`rounded-full border px-3 py-1 text-xs ${
                priority === item.value
                  ? "border-transparent text-white"
                  : "border-[var(--color-line)] text-[var(--color-text-secondary)]"
              }`}
              style={priority === item.value ? { background: item.color } : undefined}
            >
              {item.label}
            </button>
          ))}
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
          <input
            type="checkbox"
            checked={isFirstTask}
            onChange={(e) => setIsFirstTask(e.target.checked)}
          />
          最初の一歩にする
        </label>
        <div className="mt-4 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-[var(--color-line)] py-2 text-sm text-[var(--color-text-secondary)]"
          >
            キャンセル
          </button>
          <button
            onClick={submit}
            disabled={!text.trim() || saving}
            className="btn-primary flex-1 rounded-xl py-2 text-sm font-semibold disabled:opacity-40"
          >
            追加
          </button>
        </div>
      </section>
    </div>
  );
}
