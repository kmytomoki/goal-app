"use client";

import ChatWindow from "@/components/ChatWindow";
import Spinner from "@/components/Spinner";
import { ArrowRightIcon } from "@/components/icons";
import { useConversation } from "@/hooks/useConversation";
import type { AiStyle, ApiMessage } from "@/types";

/**
 * オンボーディングの対話モード。
 * 対話が一段落したら「保存へ進む」で確認フォームへ。
 */
export default function OnboardingChat({
  aiStyle,
  context,
  onProceed,
}: {
  aiStyle: AiStyle;
  context?: string;
  onProceed: (messages: ApiMessage[]) => void;
}) {
  const conv = useConversation({ type: "onboarding", aiStyle, context, resume: true });

  if (!conv.ready) return <Spinner label="対話を準備中…" />;

  return (
    <div className="flex h-[70vh] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <ChatWindow
        messages={conv.messages}
        streaming={conv.streaming}
        streamingText={conv.streamingText}
        error={conv.error}
        onSend={conv.send}
        onRetry={conv.retry}
        placeholder="思っていることを話してみましょう…"
        footer={
          <button
            onClick={async () => {
              await conv.complete();
              onProceed(conv.messages.map((m) => ({ role: m.role, content: m.content })));
            }}
            className="btn-outline w-full"
          >
            理想像が固まった → 保存へ進む
            <ArrowRightIcon size={16} />
          </button>
        }
      />
    </div>
  );
}
