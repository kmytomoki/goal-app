import { NavLink, Outlet, useLocation } from "react-router-dom";
import QuickAddSheet from "./QuickAddSheet";
import { useMemo, useState } from "react";
import { useApp } from "../lib/useApp";
import { emptyDailyLog, getDailyLog, saveDailyLog } from "../lib/db";
import { createTask, insertTask } from "../lib/tasks";
import { localDateKey } from "../lib/dates";

export default function AppShell() {
  const location = useLocation();
  const { user } = useApp();
  const [openQuickAdd, setOpenQuickAdd] = useState(false);
  const today = localDateKey();

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

  return (
    <div className="app-shell mx-auto min-h-dvh max-w-md pb-20">
      <Outlet />
      {showBottomNav && (
        <>
          <nav className="fixed right-0 bottom-0 left-0 z-20 border-t border-[var(--color-line)] bg-[var(--color-bg-page)]/95 backdrop-blur">
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
            className="fixed right-6 bottom-20 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-brand-500)] text-2xl leading-none text-white shadow-lg"
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
