import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Chat, { START_MARKER } from "../components/Chat";
import { extractIdealSelf } from "../lib/api";
import { saveIdealSelf, saveUserProfile } from "../lib/db";
import { useApp } from "../lib/useApp";
import type { ChatMessage } from "../lib/types";

const DRAFT_KEY = "onboarding-draft";

interface Draft {
  aiStyle: "labeling";
  path: "chat" | "archetype" | null;
  messages: ChatMessage[];
  archetypeId?: string | null;
  triggerHabit?: string;
  minimalRule?: string;
}

function loadDraft(): Draft {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) return JSON.parse(raw) as Draft;
  } catch {
    /* 破損したドラフトは無視 */
  }
  return { aiStyle: "labeling", path: null, messages: [] };
}

const ARCHETYPES: {
  id: string;
  title: string;
  description: string;
  habits: string[];
}[] = [
  {
    id: "exam",
    title: "合格する受験生",
    description: "毎日コツコツ積み上げ、演習ベースで前進する。",
    habits: ["問題を3問解く", "学習記録をつける", "翌日の最初の1タスクを決める"],
  },
  {
    id: "engineer",
    title: "手に職のエンジニア",
    description: "小さく作って直し、毎日少しずつ技術を磨く。",
    habits: ["コードを1コミット", "公式ドキュメントを1節読む", "学びを1行メモする"],
  },
  {
    id: "creator",
    title: "発信するクリエイター",
    description: "アウトプットを止めず、反応から改善する。",
    habits: ["下書きを1つ作る", "作品を1回見直す", "毎日1回公開か共有する"],
  },
  {
    id: "researcher",
    title: "探究する研究者",
    description: "疑問を仮説に変え、検証を積み重ねる。",
    habits: ["疑問を1つ言語化", "資料を15分読む", "検証メモを残す"],
  },
  {
    id: "fitness",
    title: "整えるアスリート",
    description: "コンディションを整え、継続で強くなる。",
    habits: ["5分運動する", "食事を1つ整える", "睡眠準備をする"],
  },
  {
    id: "explorer",
    title: "探索中（3ヶ月の仮の理想像）",
    description: "まだ定まっていなくても、試しながら見つける。",
    habits: ["興味あることを10分試す", "気づきを1つメモ", "明日の一歩を決める"],
  },
];

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
        aiStyle: "labeling",
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

  if (!draft.path) {
    return (
      <main className="flex min-h-dvh flex-col px-5 py-10">
        <p className="text-[11px] font-semibold tracking-[0.3em] text-[var(--color-brand-500)]">次のステップ</p>
        <h1 className="mt-3 text-2xl font-semibold leading-snug text-[var(--color-text-main)]">
          はじめ方を選んでください
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-secondary)]">
          仮の設定で始めて、あとから設定で育てることもできます。
        </p>
        <div className="mt-8 space-y-4">
          <button
            onClick={() => setDraft((d) => ({ ...d, path: "chat" }))}
            className="spotlight w-full rounded-2xl p-5 text-left"
          >
            <p className="text-base font-semibold text-[var(--color-brand-500)]">対話で決める</p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
              AIと短く話しながら理想像・開始条件・最低ラインを整えます。
            </p>
          </button>
          <button
            onClick={() => setDraft((d) => ({ ...d, path: "archetype" }))}
            className="card w-full p-5 text-left"
          >
            <p className="text-base font-semibold text-[var(--color-text-main)]">タップで決める（仮でOK）</p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
              近いアーキタイプを選んで、すぐ開始できます。
            </p>
          </button>
        </div>
      </main>
    );
  }

  if (draft.path === "archetype") {
    const selected = ARCHETYPES.find((item) => item.id === draft.archetypeId) ?? null;
    const finishArchetype = async () => {
      if (!user || !selected) return;
      setFinishing(true);
      setError(null);
      try {
        const now = Date.now();
        await saveIdealSelf(user.uid, {
          title: selected.title,
          description: selected.description,
          habits: selected.habits,
          createdAt: now,
        });
        await saveUserProfile(user.uid, {
          createdAt: now,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          aiStyle: "labeling",
          triggerHabit: draft.triggerHabit?.trim() || "朝起きたら",
          minimalRule: draft.minimalRule?.trim() || "5分だけでもOK",
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

    return (
      <main className="px-4 pb-10">
        <header className="px-1 pt-5 pb-1">
          <p className="text-[11px] font-semibold tracking-[0.3em] text-[var(--color-brand-500)]">かんたん開始</p>
          <h1 className="text-lg font-semibold text-[var(--color-text-main)]">近い理想像を選ぶ</h1>
        </header>
        <div className="mt-4 grid gap-3">
          {ARCHETYPES.map((item) => (
            <button
              key={item.id}
              onClick={() => setDraft((d) => ({ ...d, archetypeId: item.id }))}
              className={`rounded-2xl border p-4 text-left ${
                draft.archetypeId === item.id
                  ? "border-[var(--color-brand-500)]/60 bg-[color-mix(in_srgb,var(--color-brand-500)_10%,white)]"
                  : "card"
              }`}
            >
              <p className="text-base font-semibold text-[var(--color-text-main)]">{item.title}</p>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{item.description}</p>
            </button>
          ))}
        </div>
        <div className="mt-5 space-y-3">
          <input
            value={draft.triggerHabit ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, triggerHabit: e.target.value }))}
            placeholder="毎日のきっかけ（例: 朝食後に机に座ったら）"
            className="w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-bg-page)] px-4 py-3 text-[15px] text-[var(--color-text-main)] placeholder:text-[var(--color-text-faint)]"
          />
          <input
            value={draft.minimalRule ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, minimalRule: e.target.value }))}
            placeholder="忙しい日の最低ライン（例: 5分だけでもOK）"
            className="w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-bg-page)] px-4 py-3 text-[15px] text-[var(--color-text-main)] placeholder:text-[var(--color-text-faint)]"
          />
          {error && <p className="text-sm text-red-300">{error}</p>}
          <button
            onClick={finishArchetype}
            disabled={finishing || !selected}
            className="btn-primary w-full rounded-2xl py-3.5 font-bold disabled:opacity-50"
          >
            {finishing ? "設定を保存中…" : "この内容で始める"}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-dvh flex-col px-4">
      <header className="px-1 pt-5 pb-1">
        <p className="text-[11px] font-semibold tracking-[0.3em] text-[var(--color-brand-500)]">はじめの対話</p>
        <h1 className="text-lg font-semibold text-[var(--color-text-main)]">5年後の理想像を言葉にする</h1>
      </header>

      <Chat
        mode="onboarding"
        context={{ aiStyle: "labeling" }}
        messages={draft.messages}
        onMessagesChange={(messages) => setDraft((d) => ({ ...d, messages }))}
        aiStarts
        disabled={finishing}
      />

      {userTurns >= 2 && (
        <div className="px-1 pb-4">
          {error && <p className="mb-2 text-sm text-red-300">{error}</p>}
          <button
            onClick={finish}
            disabled={finishing}
            className="btn-primary w-full rounded-2xl py-3.5 font-bold disabled:opacity-50"
          >
            {finishing ? "理想像を記録しています…" : "設定を完了する"}
          </button>
        </div>
      )}
    </main>
  );
}
