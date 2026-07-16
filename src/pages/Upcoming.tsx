import { useCallback, useEffect, useState } from "react";
import TaskList from "../components/TaskList";
import TaskDetailSheet from "../components/TaskDetailSheet";
import { emptyDailyLog, getLogsInRange, saveDailyLog } from "../lib/db";
import { addDays, localDateKey } from "../lib/dates";
import { removeTask, restoreTask, updateTask } from "../lib/tasks";
import { useApp } from "../lib/useApp";
import type { DailyLog, Task } from "../lib/types";

interface DeletedState {
  task: Task;
  index: number;
  date: string;
}

export default function Upcoming() {
  const { user } = useApp();
  const uid = user?.uid;
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [deleted, setDeleted] = useState<DeletedState | null>(null);
  const [detail, setDetail] = useState<{ task: Task; date: string } | null>(null);
  const today = localDateKey();
  const until = addDays(today, 14);

  const load = useCallback(async () => {
    if (!uid) return;
    const range = await getLogsInRange(uid, today, until);
    setLogs(range.filter((entry) => entry.tasks.length > 0));
  }, [uid, today, until]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const listener = () => void load();
    window.addEventListener("tasks:updated", listener);
    return () => window.removeEventListener("tasks:updated", listener);
  }, [load]);

  const updateLogTasks = async (date: string, updater: (tasks: Task[]) => Task[]) => {
    if (!uid) return;
    const target = logs.find((entry) => entry.date === date) ?? emptyDailyLog(date);
    const tasks = updater(target.tasks);
    await saveDailyLog(uid, date, { ...target, tasks });
    await load();
  };

  return (
    <main className="px-4 pb-24 lg:px-8 lg:pb-16">
      <header className="mx-auto max-w-6xl px-1 pt-6">
        <p className="text-xs font-semibold tracking-wide text-[var(--color-text-secondary)]">UPCOMING</p>
        <h1 className="mt-1 text-xl font-semibold text-[var(--color-text-main)]">予定</h1>
      </header>
      <div className="mx-auto mt-4 max-w-6xl space-y-5 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6 lg:space-y-0 xl:grid-cols-3">
        {logs.length === 0 ? (
          <p className="card px-4 py-6 text-center text-sm text-[var(--color-text-secondary)] lg:col-span-2 xl:col-span-3">
            予定されたタスクはありません。右下の + から追加できます。
          </p>
        ) : (
          logs.map((entry) => (
            <section key={entry.date} className="card p-3">
              <h2 className="mb-2 px-1 text-xs font-semibold text-[var(--color-text-secondary)]">{entry.date}</h2>
              <TaskList
                tasks={entry.tasks}
                onToggle={(taskId) =>
                  void updateLogTasks(entry.date, (tasks) =>
                    tasks.map((task) => (task.id === taskId ? { ...task, done: !task.done } : task)),
                  )
                }
                onEditText={(taskId, text) =>
                  void updateLogTasks(entry.date, (tasks) => updateTask(tasks, taskId, { text }))
                }
                onDelete={(taskId) =>
                  void updateLogTasks(entry.date, (tasks) => {
                    const result = removeTask(tasks, taskId);
                    if (result.removed) {
                      setDeleted({ task: result.removed, index: result.index, date: entry.date });
                      setTimeout(() => setDeleted((prev) => (prev?.task.id === result.removed?.id ? null : prev)), 5000);
                    }
                    return result.tasks;
                  })
                }
                onOpenDetail={(task) => setDetail({ task, date: entry.date })}
              />
            </section>
          ))
        )}
      </div>
      {deleted && (
        <div className="fixed right-4 bottom-24 left-4 z-30 mx-auto max-w-md rounded-xl border border-[var(--color-line)] bg-[var(--color-bg-page)] px-3 py-2 text-sm text-[var(--color-text-main)] shadow">
          タスクを削除しました
          <button
            onClick={async () => {
              await updateLogTasks(deleted.date, (tasks) => restoreTask(tasks, deleted.task, deleted.index));
              setDeleted(null);
            }}
            className="ml-3 font-semibold text-[var(--color-brand-500)]"
          >
            元に戻す
          </button>
        </div>
      )}
      <TaskDetailSheet
        open={Boolean(detail)}
        task={detail?.task ?? null}
        date={detail?.date ?? today}
        onClose={() => setDetail(null)}
        onDelete={async (taskId) => {
          if (!detail) return;
          await updateLogTasks(detail.date, (tasks) => removeTask(tasks, taskId).tasks);
          setDetail(null);
        }}
        onSave={async ({ taskId, text, priority, date }) => {
          if (!uid || !detail) return;
          if (date === detail.date) {
            await updateLogTasks(detail.date, (tasks) => updateTask(tasks, taskId, { text, priority }));
            return;
          }
          const source = logs.find((entry) => entry.date === detail.date) ?? emptyDailyLog(detail.date);
          const moved = source.tasks.find((task) => task.id === taskId);
          if (!moved) return;
          const sourceTasks = removeTask(source.tasks, taskId).tasks;
          const target = logs.find((entry) => entry.date === date) ?? emptyDailyLog(date);
          const targetTasks = [...target.tasks, { ...moved, text, priority }];
          await Promise.all([
            saveDailyLog(uid, detail.date, { ...source, tasks: sourceTasks }),
            saveDailyLog(uid, date, { ...target, tasks: targetTasks }),
          ]);
          await load();
        }}
      />
    </main>
  );
}
