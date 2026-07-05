"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import StepIndicator from "@/components/StepIndicator";
import { useToast } from "@/components/Toast";
import {
  ChevronLeftIcon,
  MessageIcon,
  PenIcon,
} from "@/components/icons";
import { useAuth } from "@/lib/auth/AuthContext";
import { extractOnboardingGoals } from "@/lib/api/client";
import { setAiStyle, completeOnboarding } from "@/lib/db/users";
import { addGoal } from "@/lib/db/goals";
import { listGoals } from "@/lib/db/goals";
import { buildGoalContext } from "@/lib/goals/context";
import StyleSelector from "@/app/onboarding/components/StyleSelector";
import OnboardingChat from "@/app/onboarding/components/OnboardingChat";
import OnboardingForm, {
  type GoalDraft,
} from "@/app/onboarding/components/OnboardingForm";
import type { AiStyle, ApiMessage, EntrySource } from "@/types";

type Phase = "style" | "mode" | "dialogue" | "form";

const STEPS = ["語り口", "進め方", "理想像を描く"];
const PHASE_STEP: Record<Phase, number> = {
  style: 0,
  mode: 1,
  dialogue: 2,
  form: 2,
};

export default function OnboardingPage() {
  return (
    <AppShell>
      <OnboardingInner />
    </AppShell>
  );
}

function OnboardingInner() {
  const { user, userDoc, refreshUserDoc } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("style");
  const [style, setStyle] = useState<AiStyle>(userDoc?.aiStyle ?? "future_self");
  const [entrySource, setEntrySource] = useState<EntrySource>("form");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialDraft, setInitialDraft] = useState<Partial<GoalDraft>>({});
  const [goalContext, setGoalContext] = useState("目標情報なし");

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const goals = await listGoals(user.uid);
      setGoalContext(buildGoalContext(goals));
    })();
  }, [user]);

  const handleSelectStyle = async (s: AiStyle) => {
    setStyle(s);
    if (user) await setAiStyle(user.uid, s);
    setPhase("mode");
  };

  const handleSave = async (draft: GoalDraft, source: EntrySource) => {
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      const vision = await addGoal(user.uid, {
        layer: "vision_5y",
        title: draft.vision5y,
        parentId: null,
        source,
      });
      const goal3m = await addGoal(user.uid, {
        layer: "goal_3m",
        title: draft.goal3m,
        parentId: vision.id,
        source,
      });
      if (draft.weekly) {
        await addGoal(user.uid, {
          layer: "weekly",
          title: draft.weekly,
          parentId: goal3m.id,
          source,
        });
      }
      await completeOnboarding(user.uid);
      await refreshUserDoc();
      toast("success", "目標を保存しました。今日から始めましょう！");
      router.replace("/today");
    } catch {
      setError("保存に失敗しました。もう一度お試しください。");
      toast("error", "保存に失敗しました。もう一度お試しください。");
      setSaving(false);
    }
  };

  const handleDialogueProceed = async (messages: ApiMessage[]) => {
    setPhase("form");
    try {
      const extracted = await extractOnboardingGoals(messages);
      setInitialDraft(extracted);
    } catch (e) {
      toast(
        "error",
        e instanceof Error ? e.message : "対話内容の抽出に失敗しました。手入力で確定してください。"
      );
    }
  };

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-8">
      <div className="fade-up">
        <h1 className="font-display text-2xl font-semibold">
          理想の自分を設定する
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-fg-muted">
          5年後の理想像から、3ヶ月目標まで一緒に描きます。
        </p>
      </div>

      <div className="fade-up mt-5">
        <StepIndicator steps={STEPS} current={PHASE_STEP[phase]} />
      </div>

      <div className="mt-7">
        {phase === "style" && (
          <section className="fade-up">
            <h2 className="mb-3 text-lg font-semibold">AIの語り口を選ぶ</h2>
            <StyleSelector value={style} onSelect={handleSelectStyle} />
          </section>
        )}

        {phase === "mode" && (
          <section className="fade-up space-y-3">
            <h2 className="text-lg font-semibold">進め方を選ぶ</h2>
            <button
              onClick={() => {
                setEntrySource("dialogue");
                setPhase("dialogue");
              }}
              className="flex w-full cursor-pointer items-start gap-3 rounded-2xl border border-primary/25 bg-gradient-to-br from-primary-soft to-surface p-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-px hover:border-primary hover:shadow-md"
            >
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-white">
                <MessageIcon size={17} />
              </span>
              <span>
                <span className="flex items-center gap-2 font-semibold">
                  AIと対話して決める
                  <span className="chip bg-primary text-white">おすすめ</span>
                </span>
                <span className="mt-1 block text-sm leading-relaxed text-fg-muted">
                  質問に答えていくだけで、自然に理想像が言葉になります。
                </span>
              </span>
            </button>
            <button
              onClick={() => {
                setEntrySource("form");
                setPhase("form");
              }}
              className="flex w-full cursor-pointer items-start gap-3 rounded-2xl border border-border bg-surface p-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-px hover:border-primary/40 hover:shadow-md"
            >
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-fg-muted">
                <PenIcon size={17} />
              </span>
              <span>
                <span className="block font-semibold">
                  フォームに直接入力する
                </span>
                <span className="mt-1 block text-sm leading-relaxed text-fg-muted">
                  対話が苦手な方向け。各層を自分で書き込めます。
                </span>
              </span>
            </button>
            <button onClick={() => setPhase("style")} className="btn-ghost -ml-2">
              <ChevronLeftIcon size={15} />
              語り口を選び直す
            </button>
          </section>
        )}

        {phase === "dialogue" && (
          <section className="fade-up space-y-4">
            <OnboardingChat
              aiStyle={style}
              context={goalContext}
              onProceed={handleDialogueProceed}
            />
            <p className="text-xs leading-relaxed text-fg-subtle">
              対話の途中でも保存して中断できます。次回その続きから再開できます。
            </p>
          </section>
        )}

        {phase === "form" && (
          <section className="fade-up space-y-2">
            <h2 className="text-lg font-semibold">内容を確定する</h2>
            <OnboardingForm
              key={`${initialDraft.vision5y ?? ""}|${initialDraft.goal3m ?? ""}|${initialDraft.weekly ?? ""}|${entrySource}`}
              initial={initialDraft}
              source={entrySource}
              saving={saving}
              onSave={(d) => handleSave(d, entrySource)}
            />
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
