import { NavLink, Outlet, useLocation } from "react-router-dom";
import QuickAddSheet from "./QuickAddSheet";
import { useEffect, useMemo, useState } from "react";
import { useApp } from "../lib/useApp";
import { emptyDailyLog, getDailyLog, saveDailyLog } from "../lib/db";
import { createTask, insertTask } from "../lib/tasks";
import { dayCountSince, localDateKey } from "../lib/dates";

export default function AppShell() {
  const location = useLocation();
  const { user, ideal, profile } = useApp();
  const [openQuickAdd, setOpenQuickAdd] = useState(false);
  const today = localDateKey();
  const dayCount = profile?.createdAt ? dayCountSince(profile.createdAt) : 1;

  const navItems = useMemo(
    () => [
      { to: "/", label: "今日" },
      { to: "/upcoming", label: "予定" },
      { to: "/weekly", label: "振り返り" },
      { to: "/settings", label: "設定" },
    ],
    [],
  );

  const showBottomNav = ["/", "/upcoming", "/weekly", "/settings"].includes(location.pathname);
  const onKeyboardShortcut = (event: KeyboardEvent) => {
    const target = event.target as HTMLElement | null;
    const tagName = target?.tagName.toLowerCase();
    const editable = Boolean(
      target?.isContentEditable ||
        tagName === "input" ||
        tagName === "textarea" ||
        tagName === "select",
    );
    if (editable) return;
    if (event.key.toLowerCase() === "q") {
      event.preventDefault();
      setOpenQuickAdd(true);
    }
    if (event.key === "Escape") {
      setOpenQuickAdd(false);
    }
  };

  useEffect(() => {
    window.addEventListener("keydown", onKeyboardShortcut);
    return () => window.removeEventListener("keydown", onKeyboardShortcut);
  }, []);

  return (
    <div className="app-shell min-h-dvh lg:flex">
      <aside className="hidden w-[280px] shrink-0 border-r border-[var(--color-line)] bg-[var(--color-bg-surface)] px-3 py-4 lg:block">
        <div className="px-2">
          <p className="text-xs font-semibold tracking-wide text-[var(--color-text-secondary)]">STAGE</p>
          <h1 className="mt-1 truncate text-sm font-semibold text-[var(--color-text-main)]">
            {ideal?.title ?? "理想の自分"}
          </h1>
          <p className="text-xs text-[var(--color-text-faint)]">Day {dayCount}</p>
        </div>
        <button
          onClick={() => setOpenQuickAdd(true)}
          className="mt-4 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-[var(--color-brand-500)] hover:bg-[color-mix(in_srgb,var(--color-brand-500)_8%,white)]"
        >
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-brand-500)] text-white">
            +
          </span>
          タスクを追加
        </button>
        <nav className="mt-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `block rounded-lg px-3 py-2 text-sm ${
                  isActive
                    ? "bg-[color-mix(in_srgb,var(--color-brand-500)_10%,white)] font-semibold text-[var(--color-brand-600)]"
                    : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-muted)]"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="min-w-0 flex-1 pb-20 lg:pb-0">
        <Outlet />
      </div>
      {showBottomNav && (
        <>
          <nav className="fixed right-0 bottom-0 left-0 z-20 border-t border-[var(--color-line)] bg-[var(--color-bg-page)]/95 backdrop-blur lg:hidden">
            <div className="mx-auto grid max-w-md grid-cols-4">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `py-3 text-center text-xs ${isActive ? "font-semibold text-[var(--color-brand-500)]" : "text-[var(--color-text-secondary)]"}`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </nav>
          <button
            aria-label="タスクを追加"
            onClick={() => setOpenQuickAdd(true)}
            className="fixed right-6 bottom-20 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-brand-500)] text-2xl leading-none text-white shadow-lg lg:hidden"
          >
            +
          </button>
        </>
      )}
      <QuickAddSheet
        open={openQuickAdd}
        onClose={() => setOpenQuickAdd(false)}
        initialDate={today}
        onSubmit={async ({ text, isFirstTask, priority, date }) => {
          if (!user) return;
          const base = (await getDailyLog(user.uid, date)) ?? emptyDailyLog(date);
          const task = createTask({ text, isFirstTask, priority, done: false });
          const tasks = insertTask(base.tasks, task);
          await saveDailyLog(user.uid, date, { ...base, tasks });
          window.dispatchEvent(new CustomEvent("tasks:updated", { detail: { date } }));
        }}
      />
    </div>
  );
}
