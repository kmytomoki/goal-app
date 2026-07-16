import type { Task } from "../lib/types";
import { useState } from "react";

interface TaskListProps {
  tasks: Task[];
  onToggle?: (taskId: string) => void;
  onDelete?: (taskId: string) => void;
  onEditText?: (taskId: string, text: string) => void;
  onOpenDetail?: (task: Task) => void;
  minimal?: boolean; // 5分だけモード: 最初の1タスクのみ表示
}

function priorityColor(priority: 1 | 2 | 3 | 4 | undefined): string {
  if (priority === 1) return "var(--color-priority-1)";
  if (priority === 2) return "var(--color-priority-2)";
  if (priority === 3) return "var(--color-priority-3)";
  return "var(--color-priority-4)";
}

export default function TaskList({
  tasks,
  onToggle,
  onDelete,
  onEditText,
  onOpenDetail,
  minimal = false,
}: TaskListProps) {
  const shown = minimal ? tasks.filter((t) => t.isFirstTask).slice(0, 1) : tasks;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [startX, setStartX] = useState<number | null>(null);
  const [swipedId, setSwipedId] = useState<string | null>(null);

  if (shown.length === 0) {
    return (
      <p className="card px-4 py-6 text-center text-sm text-[var(--color-text-secondary)]">
        今日のタスクはまだありません。朝の対話で決めましょう。
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {shown.map((task) => {
        const isEditing = editingId === task.id;
        return (
          <li key={task.id}>
            <div
              onPointerDown={(e) => setStartX(e.clientX)}
              onPointerUp={(e) => {
                if (startX == null) return;
                const diff = e.clientX - startX;
                setStartX(null);
                if (diff > 50) {
                  onToggle?.(task.id);
                  setSwipedId(task.id);
                  setTimeout(() => setSwipedId((prev) => (prev === task.id ? null : prev)), 250);
                  return;
                }
                if (diff < -50) {
                  onDelete?.(task.id);
                  return;
                }
              }}
              className={`group flex w-full items-start gap-3 rounded-xl px-4 py-3 text-left transition-all select-none lg:hover:bg-[var(--color-bg-muted)] ${
                task.isFirstTask ? "highlight rounded-xl" : "card"
              } ${swipedId === task.id ? "scale-[0.99]" : ""}`}
            >
              <button
                type="button"
                aria-label={task.done ? "未完了に戻す" : "完了にする"}
                disabled={!onToggle}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle?.(task.id);
                }}
                className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold transition-transform"
                style={{
                  borderColor: priorityColor(task.priority),
                  background: task.done ? priorityColor(task.priority) : "transparent",
                  color: task.done ? "#fff" : "transparent",
                  transform: task.done ? "scale(1.06)" : "scale(1)",
                }}
              >
                ✓
              </button>
              <span className="min-w-0 flex-1">
                {task.isFirstTask && (
                  <span className="mb-0.5 block text-[11px] font-semibold tracking-[0.2em] text-[var(--color-brand-500)]">
                    最初の一歩
                  </span>
                )}
                {isEditing ? (
                  <input
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    onBlur={() => {
                      const nextText = editingText.trim();
                      setEditingId(null);
                      if (nextText && nextText !== task.text) onEditText?.(task.id, nextText);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const nextText = editingText.trim();
                        setEditingId(null);
                        if (nextText && nextText !== task.text) onEditText?.(task.id, nextText);
                      }
                    }}
                    autoFocus
                    className="w-full rounded border border-[var(--color-line)] bg-transparent px-1 py-0.5 text-[15px] text-[var(--color-text-main)]"
                  />
                ) : (
                  <span
                    className={`block text-[15px] leading-snug transition-all ${
                      task.done
                        ? "text-[var(--color-text-faint)] line-through decoration-1"
                        : "text-[var(--color-text-main)]"
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingId(task.id);
                      setEditingText(task.text);
                    }}
                  >
                    {task.text}
                  </span>
                )}
              </span>
              <span className="flex gap-1">
                <span
                  className="mt-1 inline-block h-2 w-2 rounded-full transition-opacity lg:opacity-0 lg:group-hover:opacity-100"
                  style={{ background: priorityColor(task.priority) }}
                />
                {onOpenDetail && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenDetail(task);
                    }}
                    className="text-xs text-[var(--color-text-secondary)] transition-opacity lg:opacity-0 lg:group-hover:opacity-100"
                  >
                    詳細
                  </button>
                )}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
