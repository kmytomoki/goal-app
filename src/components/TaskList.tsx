import type { Task } from "../lib/types";

interface TaskListProps {
  tasks: Task[];
  onToggle?: (index: number) => void;
  minimal?: boolean; // 5分だけモード: 最初の1タスクのみ表示
}

export default function TaskList({ tasks, onToggle, minimal = false }: TaskListProps) {
  const shown = minimal ? tasks.filter((t) => t.isFirstTask).slice(0, 1) : tasks;
  if (shown.length === 0) {
    return (
      <p className="rounded-xl border hairline bg-night-900 px-4 py-6 text-center text-sm text-ink-400">
        今日のタスクはまだありません。朝の対話で決めましょう。
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {shown.map((task) => {
        const index = tasks.indexOf(task);
        return (
          <li key={`${index}-${task.text}`}>
            <button
              onClick={() => onToggle?.(index)}
              disabled={!onToggle}
              className={`flex w-full items-start gap-3 rounded-xl px-4 py-3 text-left transition-colors ${
                task.isFirstTask
                  ? "spotlight rounded-xl"
                  : "border hairline bg-night-900"
              } ${onToggle ? "active:bg-night-700" : ""}`}
            >
              <span
                aria-hidden
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold ${
                  task.done
                    ? "border-gold-400 bg-gold-400 text-night-950"
                    : "border-ink-600 text-transparent"
                }`}
              >
                ✓
              </span>
              <span className="min-w-0">
                {task.isFirstTask && (
                  <span className="mb-0.5 block font-display text-[11px] tracking-[0.2em] text-gold-300">
                    最初の一歩
                  </span>
                )}
                <span
                  className={`block text-[15px] leading-snug ${
                    task.done ? "text-ink-600 line-through" : "text-ink-100"
                  }`}
                >
                  {task.text}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
