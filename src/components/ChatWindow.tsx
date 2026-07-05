"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import ChatBubble from "@/components/ChatBubble";
import { SendIcon } from "@/components/icons";
import type { ChatMessage } from "@/types";

interface ChatWindowProps {
  messages: ChatMessage[];
  streaming: boolean;
  streamingText: string;
  error: string | null;
  onSend: (text: string) => void;
  onRetry: () => void;
  /** 入力欄の上に置く補助UI（完了ボタンなど） */
  footer?: ReactNode;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * 再利用可能なチャットUI。ストリーミング中はカーソル付きで逐次表示する。
 */
export default function ChatWindow({
  messages,
  streaming,
  streamingText,
  error,
  onSend,
  onRetry,
  footer,
  placeholder = "メッセージを入力…",
  disabled,
}: ChatWindowProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, streamingText]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || streaming || disabled) return;
    onSend(text);
    setInput("");
  };

  return (
    <div className="flex flex-col h-full">
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m, i) => (
          <ChatBubble key={i} role={m.role}>
            {m.content}
          </ChatBubble>
        ))}

        {streaming && (
          <ChatBubble role="assistant">
            {streamingText ? (
              <>
                {streamingText}
                <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse rounded-full bg-secondary align-middle" />
              </>
            ) : (
              <span className="flex items-center gap-1 py-1" aria-label="考え中">
                <span className="typing-dot h-1.5 w-1.5 rounded-full bg-secondary" />
                <span className="typing-dot h-1.5 w-1.5 rounded-full bg-secondary" />
                <span className="typing-dot h-1.5 w-1.5 rounded-full bg-secondary" />
              </span>
            )}
          </ChatBubble>
        )}

        {error && (
          <div
            role="alert"
            className="fade-up rounded-2xl border border-destructive/25 bg-destructive-soft p-4 text-sm text-destructive"
          >
            <p className="leading-relaxed">{error}</p>
            <button
              onClick={onRetry}
              className="mt-3 inline-flex min-h-9 cursor-pointer items-center rounded-full bg-destructive px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700"
            >
              再試行（入力内容は保持されています）
            </button>
          </div>
        )}
      </div>

      <div className="space-y-2 border-t border-border bg-muted/40 p-3">
        {footer}
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSend();
              }
            }}
            rows={2}
            placeholder={placeholder}
            aria-label="メッセージ"
            disabled={streaming || disabled}
            className="input-base flex-1 resize-none rounded-2xl"
          />
          <button
            onClick={handleSend}
            disabled={streaming || disabled || !input.trim()}
            aria-label="送信"
            className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-primary text-white shadow-sm transition-all duration-200 hover:-translate-y-px hover:bg-primary-strong hover:shadow-md active:translate-y-0 disabled:pointer-events-none disabled:opacity-40"
          >
            <SendIcon size={18} />
          </button>
        </div>
        <p className="text-xs text-fg-subtle">⌘/Ctrl + Enter で送信</p>
      </div>
    </div>
  );
}
