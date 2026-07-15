import { useState } from "react";
import PageHeader from "../components/PageHeader";
import { saveIdealSelf, saveUserProfile } from "../lib/db";
import { useApp } from "../lib/useApp";

export default function Settings() {
  const { user, profile, ideal, refresh } = useApp();
  const [triggerHabit, setTriggerHabit] = useState(profile?.triggerHabit ?? "");
  const [minimalRule, setMinimalRule] = useState(profile?.minimalRule ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [idealTitle, setIdealTitle] = useState(ideal?.title ?? "");
  const [idealDescription, setIdealDescription] = useState(ideal?.description ?? "");
  const [idealHabitsText, setIdealHabitsText] = useState((ideal?.habits ?? []).join("\n"));

  const save = async () => {
    if (!user) return;
    setSaving(true);
    setSaved(false);
    try {
      await saveUserProfile(user.uid, { aiStyle: "labeling", triggerHabit, minimalRule });
      if (idealTitle.trim()) {
        await saveIdealSelf(user.uid, {
          title: idealTitle.trim(),
          description: idealDescription.trim(),
          habits: idealHabitsText
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean)
            .slice(0, 6),
        });
      }
      await refresh();
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="px-4 pb-12">
      <PageHeader eyebrow="SETTINGS" title="設定" />

      {ideal && (
        <section className="card mt-4 p-5">
          <p className="text-[11px] font-semibold tracking-[0.25em] text-[var(--color-brand-500)]">あなたの理想像</p>
          <input
            value={idealTitle}
            onChange={(e) => setIdealTitle(e.target.value)}
            placeholder="理想像タイトル"
            className="mt-2 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-bg-page)] px-3 py-2 text-sm text-[var(--color-text-main)]"
          />
          <textarea
            value={idealDescription}
            onChange={(e) => setIdealDescription(e.target.value)}
            placeholder="理想像の説明"
            rows={2}
            className="mt-2 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-bg-page)] px-3 py-2 text-sm text-[var(--color-text-main)]"
          />
          <textarea
            value={idealHabitsText}
            onChange={(e) => setIdealHabitsText(e.target.value)}
            placeholder={"習慣（1行に1つ）"}
            rows={4}
            className="mt-2 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-bg-page)] px-3 py-2 text-sm text-[var(--color-text-main)]"
          />
        </section>
      )}

      <section className="mt-6 space-y-5">
        <p className="card px-4 py-3 text-sm text-[var(--color-text-secondary)]">
          AIの話し方は現在「コーチ型」に固定しています。
        </p>

        <label className="block">
          <span className="block px-1 pb-2 text-sm text-[var(--color-text-secondary)]">
            毎日のきっかけ（開始条件付け）
          </span>
          <input
            value={triggerHabit}
            onChange={(e) => setTriggerHabit(e.target.value)}
            placeholder="例: 朝食後に机に座ったら"
            className="w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-bg-page)] px-4 py-3 text-[15px] text-[var(--color-text-main)] placeholder:text-[var(--color-text-faint)]"
          />
        </label>

        <label className="block">
          <span className="block px-1 pb-2 text-sm text-[var(--color-text-secondary)]">忙しい日の最低ライン</span>
          <input
            value={minimalRule}
            onChange={(e) => setMinimalRule(e.target.value)}
            placeholder="例: 5分だけでもOK"
            className="w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-bg-page)] px-4 py-3 text-[15px] text-[var(--color-text-main)] placeholder:text-[var(--color-text-faint)]"
          />
        </label>

        <button
          onClick={save}
          disabled={saving}
          className="btn-primary w-full rounded-2xl py-3.5 font-bold disabled:opacity-50"
        >
          {saving ? "保存中…" : saved ? "保存しました" : "保存する"}
        </button>
      </section>
    </main>
  );
}
