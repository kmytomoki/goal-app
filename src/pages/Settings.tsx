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
        <section className="mt-4 rounded-2xl border hairline bg-night-900 p-5">
          <p className="font-display text-[11px] tracking-[0.25em] text-gold-300">あなたの理想像</p>
          <input
            value={idealTitle}
            onChange={(e) => setIdealTitle(e.target.value)}
            placeholder="理想像タイトル"
            className="mt-2 w-full rounded-xl border hairline bg-night-800 px-3 py-2 text-sm text-ink-100"
          />
          <textarea
            value={idealDescription}
            onChange={(e) => setIdealDescription(e.target.value)}
            placeholder="理想像の説明"
            rows={2}
            className="mt-2 w-full rounded-xl border hairline bg-night-800 px-3 py-2 text-sm text-ink-100"
          />
          <textarea
            value={idealHabitsText}
            onChange={(e) => setIdealHabitsText(e.target.value)}
            placeholder={"習慣（1行に1つ）"}
            rows={4}
            className="mt-2 w-full rounded-xl border hairline bg-night-800 px-3 py-2 text-sm text-ink-100"
          />
        </section>
      )}

      <section className="mt-6 space-y-5">
        <p className="rounded-xl border hairline bg-night-900 px-4 py-3 text-sm text-ink-400">
          AIの話し方は現在「コーチ型」に固定しています。
        </p>

        <label className="block">
          <span className="block px-1 pb-2 text-sm text-ink-400">
            毎日のきっかけ（開始条件付け）
          </span>
          <input
            value={triggerHabit}
            onChange={(e) => setTriggerHabit(e.target.value)}
            placeholder="例: 朝食後に机に座ったら"
            className="w-full rounded-xl border hairline bg-night-900 px-4 py-3 text-[15px] text-ink-100 placeholder:text-ink-600"
          />
        </label>

        <label className="block">
          <span className="block px-1 pb-2 text-sm text-ink-400">忙しい日の最低ライン</span>
          <input
            value={minimalRule}
            onChange={(e) => setMinimalRule(e.target.value)}
            placeholder="例: 5分だけでもOK"
            className="w-full rounded-xl border hairline bg-night-900 px-4 py-3 text-[15px] text-ink-100 placeholder:text-ink-600"
          />
        </label>

        <button
          onClick={save}
          disabled={saving}
          className="w-full rounded-2xl bg-gold-400 py-3.5 font-bold text-night-950 disabled:opacity-50"
        >
          {saving ? "保存中…" : saved ? "保存しました" : "保存する"}
        </button>
      </section>
    </main>
  );
}
