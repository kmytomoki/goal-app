import { useState } from "react";
import PageHeader from "../components/PageHeader";
import { saveUserProfile } from "../lib/db";
import { useApp } from "../lib/useApp";
import type { AiStyle } from "../lib/types";

export default function Settings() {
  const { user, profile, ideal, refresh } = useApp();
  const [aiStyle, setAiStyle] = useState<AiStyle>(profile?.aiStyle ?? "labeling");
  const [triggerHabit, setTriggerHabit] = useState(profile?.triggerHabit ?? "");
  const [minimalRule, setMinimalRule] = useState(profile?.minimalRule ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    setSaved(false);
    try {
      await saveUserProfile(user.uid, { aiStyle, triggerHabit, minimalRule });
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
          <p className="font-display mt-2 text-lg text-ink-100">{ideal.title}</p>
          <p className="mt-1 text-sm leading-relaxed text-ink-400">{ideal.description}</p>
          {ideal.habits.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm text-ink-400">
              {ideal.habits.map((h, i) => (
                <li key={i}>・{h}</li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="mt-6 space-y-5">
        <div>
          <p className="px-1 pb-2 text-sm text-ink-400">AIの話し方</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setAiStyle("labeling")}
              className={`rounded-xl border px-3 py-3 text-sm ${
                aiStyle === "labeling"
                  ? "border-gold-400/60 bg-gold-400/10 text-gold-300"
                  : "hairline bg-night-900 text-ink-400"
              }`}
            >
              コーチと話す
            </button>
            <button
              onClick={() => setAiStyle("futureself")}
              className={`rounded-xl border px-3 py-3 text-sm ${
                aiStyle === "futureself"
                  ? "border-gold-400/60 bg-gold-400/10 text-gold-300"
                  : "hairline bg-night-900 text-ink-400"
              }`}
            >
              未来の自分と話す
            </button>
          </div>
        </div>

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
