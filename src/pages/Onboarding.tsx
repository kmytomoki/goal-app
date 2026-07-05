import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Chat, { START_MARKER } from "../components/Chat";
import { extractIdealSelf } from "../lib/api";
import { saveIdealSelf, saveUserProfile } from "../lib/db";
import { useApp } from "../lib/useApp";
import type { AiStyle, ChatMessage } from "../lib/types";

const DRAFT_KEY = "onboarding-draft";

interface Draft {
  aiStyle: AiStyle | null;
  messages: ChatMessage[];
}

function loadDraft(): Draft {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) return JSON.parse(raw) as Draft;
  } catch {
    /* 破損したドラフトは無視 */
  }
  return { aiStyle: null, messages: [] };
}

export default function Onboarding() {
  const { user, refresh } = useApp();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<Draft>(loadDraft);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [draft]);

  const userTurns = useMemo(
    () => draft.messages.filter((m) => m.role === "user" && m.content !== START_MARKER).length,
    [draft.messages],
  );

  const finish = async () => {
    if (!user) return;
    setFinishing(true);
    setError(null);
    try {
      const extracted = await extractIdealSelf(draft.messages);
      await saveIdealSelf(user.uid, {
        title: extracted.title,
        description: extracted.description,
        habits: extracted.habits,
        createdAt: Date.now(),
      });
      await saveUserProfile(user.uid, {
        createdAt: Date.now(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        aiStyle: draft.aiStyle ?? "labeling",
        triggerHabit: extracted.triggerHabit,
        minimalRule: extracted.minimalRule,
        onboardingCompleted: true,
      });
      localStorage.removeItem(DRAFT_KEY);
      await refresh();
      navigate("/", { replace: true });
    } catch {
      setError("設定の保存に失敗しました。もう一度お試しください。");
      setFinishing(false);
    }
  };

  if (!draft.aiStyle) {
    return (
      <main className="flex min-h-dvh flex-col px-5 py-10">
        <p className="font-display text-[11px] tracking-[0.3em] text-gold-300">はじめの設定</p>
        <h1 className="font-display mt-3 text-2xl leading-snug text-ink-100">
          AIの話し方を選んでください
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-400">
          あとから設定でいつでも変えられます。
        </p>
        <div className="mt-8 space-y-4">
          <button
            onClick={() => setDraft((d) => ({ ...d, aiStyle: "labeling" }))}
            className="spotlight w-full rounded-2xl p-5 text-left"
          >
            <p className="font-display text-base text-gold-300">コーチと話す</p>
            <p className="mt-2 text-sm leading-relaxed text-ink-400">
              AIコーチがあなたを「すでに理想の自分である人」として扱い、問いかけます。
            </p>
          </button>
          <button
            onClick={() => setDraft((d) => ({ ...d, aiStyle: "futureself" }))}
            className="w-full rounded-2xl border hairline bg-night-900 p-5 text-left"
          >
            <p className="font-display text-base text-ink-100">未来の自分と話す</p>
            <p className="mt-2 text-sm leading-relaxed text-ink-400">
              5年後のあなた自身が、過去のあなたに語りかけます。没入感を重視する人に。
            </p>
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-dvh flex-col px-4">
      <header className="px-1 pt-5 pb-1">
        <p className="font-display text-[11px] tracking-[0.3em] text-gold-300">はじめの対話</p>
        <h1 className="font-display text-lg text-ink-100">5年後の理想像を言葉にする</h1>
      </header>

      <Chat
        mode="onboarding"
        context={{ aiStyle: draft.aiStyle }}
        messages={draft.messages}
        onMessagesChange={(messages) => setDraft((d) => ({ ...d, messages }))}
        aiStarts
        disabled={finishing}
      />

      {userTurns >= 4 && (
        <div className="px-1 pb-4">
          {error && <p className="mb-2 text-sm text-red-300">{error}</p>}
          <button
            onClick={finish}
            disabled={finishing}
            className="w-full rounded-2xl bg-gold-400 py-3.5 font-bold text-night-950 disabled:opacity-50"
          >
            {finishing ? "理想像を記録しています…" : "設定を完了する"}
          </button>
        </div>
      )}
    </main>
  );
}
