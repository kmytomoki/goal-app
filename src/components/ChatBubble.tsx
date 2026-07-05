import { SparklesIcon } from "@/components/icons";

interface ChatBubbleProps {
  role: "user" | "assistant";
  children: React.ReactNode;
}

export default function ChatBubble({ role, children }: ChatBubbleProps) {
  const isUser = role === "user";

  if (isUser) {
    return (
      <div className="fade-up flex justify-end">
        <div className="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-gradient-to-br from-secondary to-primary px-4 py-2.5 text-sm leading-relaxed text-white shadow-sm">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="fade-up flex items-end justify-start gap-2">
      <span
        aria-hidden
        className="mb-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-secondary text-white shadow-sm"
      >
        <SparklesIcon size={14} />
      </span>
      <div className="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-bl-md border border-border bg-surface px-4 py-2.5 text-sm leading-relaxed text-foreground shadow-[0_1px_2px_rgba(28,25,23,0.04)]">
        {children}
      </div>
    </div>
  );
}
