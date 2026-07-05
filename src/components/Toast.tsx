"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AlertIcon, CheckCircleIcon, InfoIcon, XIcon } from "@/components/icons";

type ToastKind = "success" | "error" | "info";

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastContextValue {
  toast: (kind: ToastKind, message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

const KIND_STYLE: Record<ToastKind, string> = {
  success: "border-accent/25 bg-accent-soft text-accent-strong",
  error: "border-destructive/25 bg-destructive-soft text-destructive",
  info: "border-primary/25 bg-primary-soft text-primary-strong",
};

const KIND_ICON: Record<ToastKind, ReactNode> = {
  success: <CheckCircleIcon size={18} />,
  error: <AlertIcon size={18} />,
  info: <InfoIcon size={18} />,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const toast = useCallback((kind: ToastKind, message: string) => {
    const id = nextId.current++;
    setItems((prev) => [...prev, { id, kind, message }]);
    setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4"
      >
        {items.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`fade-up pointer-events-auto flex w-full max-w-sm items-center gap-2.5 rounded-2xl border px-4 py-3 text-sm shadow-lg backdrop-blur ${KIND_STYLE[t.kind]}`}
          >
            <span className="shrink-0">{KIND_ICON[t.kind]}</span>
            <span className="flex-1 leading-snug">{t.message}</span>
            <button
              onClick={() =>
                setItems((prev) => prev.filter((x) => x.id !== t.id))
              }
              className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-current opacity-60 transition-opacity hover:opacity-100"
              aria-label="閉じる"
            >
              <XIcon size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
