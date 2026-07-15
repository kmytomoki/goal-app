import type { Task } from "./types";

export function createTask(input: {
  text: string;
  isFirstTask?: boolean;
  done?: boolean;
  priority?: 1 | 2 | 3 | 4;
}): Task {
  return {
    id: crypto.randomUUID(),
    text: input.text.trim(),
    done: input.done ?? false,
    isFirstTask: input.isFirstTask ?? false,
    priority: input.priority ?? 4,
  };
}

export function normalizeTask(task: Partial<Task>, fallbackFirstTask = false): Task {
  return {
    id: task.id && task.id.trim() ? task.id : crypto.randomUUID(),
    text: (task.text ?? "").trim(),
    done: Boolean(task.done),
    isFirstTask: task.isFirstTask ?? fallbackFirstTask,
    priority: normalizePriority(task.priority),
  };
}

export function normalizeTasks(tasks: Partial<Task>[] = []): Task[] {
  const normalized = tasks
    .map((task, index) => normalizeTask(task, index === 0))
    .filter((task) => task.text.length > 0);
  return ensureSingleFirstTask(normalized);
}

export function normalizePriority(priority: unknown): 1 | 2 | 3 | 4 {
  if (priority === 1 || priority === 2 || priority === 3 || priority === 4) return priority;
  return 4;
}

export function ensureSingleFirstTask(tasks: Task[]): Task[] {
  if (tasks.length === 0) return [];
  let firstFound = false;
  return tasks.map((task, index) => {
    if (!firstFound && task.isFirstTask) {
      firstFound = true;
      return task;
    }
    if (firstFound) return { ...task, isFirstTask: false };
    if (index === 0) {
      firstFound = true;
      return { ...task, isFirstTask: true };
    }
    return task;
  });
}

export function insertTask(tasks: Task[], newTask: Task): Task[] {
  const list = [...tasks];
  if (newTask.isFirstTask) {
    const demoted = list.map((task) => ({ ...task, isFirstTask: false }));
    return ensureSingleFirstTask([newTask, ...demoted]);
  }
  list.push(newTask);
  return ensureSingleFirstTask(list);
}

export function updateTask(tasks: Task[], taskId: string, patch: Partial<Task>): Task[] {
  const next = tasks.map((task) =>
    task.id === taskId
      ? {
          ...task,
          ...patch,
          text: patch.text === undefined ? task.text : patch.text.trim(),
          priority: patch.priority === undefined ? task.priority : normalizePriority(patch.priority),
        }
      : task,
  );
  if (patch.isFirstTask) {
    return ensureSingleFirstTask(
      next.map((task) => (task.id === taskId ? { ...task, isFirstTask: true } : { ...task, isFirstTask: false })),
    );
  }
  return ensureSingleFirstTask(next);
}

export function removeTask(tasks: Task[], taskId: string): { tasks: Task[]; removed: Task | null; index: number } {
  const index = tasks.findIndex((task) => task.id === taskId);
  if (index < 0) return { tasks, removed: null, index: -1 };
  const removed = tasks[index];
  const next = tasks.filter((task) => task.id !== taskId);
  return { tasks: ensureSingleFirstTask(next), removed, index };
}

export function restoreTask(tasks: Task[], task: Task, index: number): Task[] {
  const next = [...tasks];
  const safeIndex = Math.max(0, Math.min(index, next.length));
  next.splice(safeIndex, 0, task);
  return ensureSingleFirstTask(next);
}
