import { useCallback, useEffect, useRef, useState } from "react";
import { streamChat } from "../lib/api";
import type { ChatContext, ChatMessage, ChatMode } from "../lib/types";

// AIから会話を始めるための不可視のユーザーメッセージ
// （APIの先頭メッセージは user である必要があるため）
export const START_MARKER = "（対話を開始してください）";

function parseChoices(content: string): { cleaned: string; choices: string[] } {
  const lines = content.split("\n");
  const choices: string[] = [];
  const kept: string[] = [];
  const seen = new Set<string>();
  for (const line of lines) {
    const match = line.trim().match(/^\[choices:\s*(.+)\]$/i);
    if (!match) {
      kept.push(line);
      continue;
    }
    for (const raw of match[1].split("|")) {
      const item = raw.trim();
      if (!item || seen.has(item)) continue;
      seen.add(item);
      choices.push(item);
    }
  }
  return { cleaned: kept.join("\n").trim(), choices };
}

interface ChatProps {
  mode: ChatMode;
  context: ChatContext;
  messages: ChatMessage[];
  onMessagesChange: (messages: ChatMessage[]) => void;
  aiStarts?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export default function Chat({
  mode,
  context,
  messages,
  onMessagesChange,
  aiStarts = false,
  disabled = false,
  placeholder = "メッセージを入力…",
}: ChatProps) {
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);

  const visible = messages.filter((m) => m.content !== START_MARKER);
  const lastAssistant = [...visible].reverse().find((m) => m.role === "assistant");
  const quickChoices = lastAssistant ? parseChoices(lastAssistant.content).choices : [];

  const run = useCallback(
    async (history: ChatMessage[]) => {
      setStreaming(true);
      setStreamText("");
      setError(null);
      try {
        const reply = await streamChat({
          mode,
          messages: history,
          context,
          onText: setStreamText,
        });
        onMessagesChange([...history, { role: "assistant", content: reply }]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "通信に失敗しました。");
        onMessagesChange(history);
      } finally {
        setStreaming(false);
        setStreamText("");
      }
    },
    [mode, context, onMessagesChange],
  );

  // AI が最初に話しかける
  useEffect(() => {
    if (aiStarts && messages.length === 0 && !startedRef.current) {
      startedRef.current = true;
      const history: ChatMessage[] = [{ role: "user", content: START_MARKER }];
      onMessagesChange(history);
      void run(history);
    }
  }, [aiStarts, messages.length, onMessagesChange, run]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [visible.length, streamText]);

  const send = () => {
    const text = input.trim();
    if (!text || streaming || disabled) return;
    setInput("");
    const history: ChatMessage[] = [...messages, { role: "user", content: text }];
    onMessagesChange(history);
    void run(history);
  };

  const sendQuickChoice = (text: string) => {
    if (streaming || disabled) return;
    const history: ChatMessage[] = [...messages, { role: "user", content: text }];
    onMessagesChange(history);
    void run(history);
  };

  const retry = () => {
    if (messages.length > 0) void run(messages);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto px-1 py-4">
        {visible.map((m, i) => {
          const parsed =
            m.role === "assistant" ? parseChoices(m.content) : { cleaned: m.content, choices: [] };
          return (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={
                m.role === "user"
                  ? "max-w-[85%] rounded-2xl rounded-br-sm bg-gold-400/15 px-4 py-2.5 text-[15px] leading-relaxed text-ink-100 ring-1 ring-gold-400/25"
                  : "max-w-[85%] rounded-2xl rounded-bl-sm bg-night-800 px-4 py-2.5 text-[15px] leading-relaxed text-ink-100 whitespace-pre-wrap"
              }
            >
              {parsed.cleaned || "…"}
            </div>
          </div>
          );
        })}
        {streaming && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-night-800 px-4 py-2.5 text-[15px] leading-relaxed text-ink-100 whitespace-pre-wrap">
              {streamText || <span className="text-ink-600">…</span>}
            </div>
          </div>
        )}
        {error && (
          <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
            {error}
            <button onClick={retry} className="ml-3 underline underline-offset-2">
              再試行
            </button>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="sticky bottom-0 border-t hairline bg-night-950/90 px-1 py-3 backdrop-blur">
        {quickChoices.length > 0 && !streaming && !disabled && (
          <div className="mb-2 flex flex-wrap gap-2 px-1">
            {quickChoices.map((choice) => (
              <button
                key={choice}
                onClick={() => sendQuickChoice(choice)}
                className="rounded-full border border-gold-400/35 bg-gold-400/10 px-3 py-1 text-xs text-gold-300"
              >
                {choice}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            placeholder={placeholder}
            disabled={disabled || streaming}
            className="min-h-[44px] flex-1 resize-none rounded-xl border hairline bg-night-900 px-4 py-2.5 text-[15px] text-ink-100 placeholder:text-ink-600 disabled:opacity-50"
          />
          <button
            onClick={send}
            disabled={!input.trim() || streaming || disabled}
            className="h-[44px] shrink-0 rounded-xl bg-gold-400 px-4 font-medium text-night-950 transition-opacity disabled:opacity-30"
          >
            送る
          </button>
        </div>
      </div>
    </div>
  );
}
