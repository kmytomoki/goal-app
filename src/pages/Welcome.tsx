import { useState } from "react";
import { useApp } from "../lib/useApp";

export default function Welcome() {
  const { start } = useApp();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onStart = async () => {
    setBusy(true);
    setError(null);
    try {
      await start();
    } catch {
      setError("開始できませんでした。通信環境を確認して、もう一度お試しください。");
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-between px-6 py-10">
      <div className="rise pt-16">
        <p className="text-xs font-semibold tracking-[0.35em] text-[var(--color-brand-500)]">STAGE</p>
        <h1 className="mt-4 text-[34px] font-semibold leading-snug text-[var(--color-text-main)]">
          理想の自分を、
          <br />
          今日<span className="text-[var(--color-brand-500)]">演じる</span>。
        </h1>
        <div className="mt-6 h-px w-16 bg-[var(--color-brand-500)]/50" aria-hidden />
        <p className="mt-6 text-[15px] leading-relaxed text-[var(--color-text-secondary)]">
          夢はある。でも今日何をすべきかは分からない——
          そんな毎日を、AIとの短い対話が変えます。
        </p>
        <ul className="mt-8 space-y-4 text-sm leading-relaxed text-[var(--color-text-secondary)]">
          <li className="flex gap-3">
            <span className="font-semibold text-[var(--color-brand-500)]">朝</span>
            <span>今日の「最初の一歩」は前の夜に決まっている。迷わず始まる。</span>
          </li>
          <li className="flex gap-3">
            <span className="font-semibold text-[var(--color-brand-500)]">夜</span>
            <span>会話で振り返るだけ。フォーム入力はゼロ。</span>
          </li>
          <li className="flex gap-3">
            <span className="font-semibold text-[var(--color-brand-500)]">灯</span>
            <span>忙しい日は5分だけでいい。休んだ日も、記録は途切れない。</span>
          </li>
        </ul>
      </div>

      <div className="rise pb-4">
        {error && <p className="mb-3 text-sm text-red-300">{error}</p>}
        <button
          onClick={onStart}
          disabled={busy}
          className="btn-primary w-full rounded-2xl py-4 text-base font-bold transition-opacity disabled:opacity-50"
        >
          {busy ? "準備中…" : "はじめる"}
        </button>
        <p className="mt-3 text-center text-xs text-[var(--color-text-faint)]">
          登録は不要です。この端末ですぐに始められます。
        </p>
      </div>
    </main>
  );
}
