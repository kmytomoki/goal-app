"use client";

import { useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import Spinner from "@/components/Spinner";
import { useToast } from "@/components/Toast";
import { MoonIcon, SparklesIcon, SunIcon } from "@/components/icons";
import StyleSelector from "@/app/onboarding/components/StyleSelector";
import { useAuth } from "@/lib/auth/AuthContext";
import { updateUser } from "@/lib/db/users";
import { deleteAccount } from "@/lib/api/client";
import type { AiStyle, UserDoc } from "@/types";

// よく使うタイムゾーンの候補（必要に応じて拡張）
const TIMEZONES = [
  "Asia/Tokyo",
  "Asia/Seoul",
  "Asia/Shanghai",
  "Asia/Singapore",
  "America/Los_Angeles",
  "America/New_York",
  "Europe/London",
  "UTC",
];

export default function SettingsPage() {
  return (
    <AppShell>
      <SettingsInner />
    </AppShell>
  );
}

function SettingsInner() {
  const { userDoc } = useAuth();
  if (!userDoc) return <Spinner />;
  // userDoc 確定後に form をマウントし、初期値を一度だけ取り込む（派生stateの再代入を避ける）
  return <SettingsForm key={userDoc.uid} userDoc={userDoc} />;
}

function SettingsForm({ userDoc }: { userDoc: UserDoc }) {
  const { user, refreshUserDoc, signOut } = useAuth();
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState(userDoc.displayName ?? "");
  const [timezone, setTimezone] = useState(userDoc.timezone);
  const [dayResetHour, setDayResetHour] = useState(userDoc.dayResetHour);
  const [aiStyle, setAiStyle] = useState<AiStyle>(userDoc.aiStyle);
  const [reminderEnabled, setReminderEnabled] = useState(userDoc.reminderEnabled ?? true);
  const [reminderHour, setReminderHour] = useState(userDoc.reminderHour ?? 7);
  const [saving, setSaving] = useState(false);
  const [checkingModel, setCheckingModel] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateUser(user.uid, {
        displayName: displayName.trim() || undefined,
        timezone,
        dayResetHour,
        aiStyle,
        reminderEnabled,
        reminderHour,
      });
      await refreshUserDoc();
      toast("success", "設定を保存しました");
    } catch {
      toast("error", "設定の保存に失敗しました。もう一度お試しください。");
    } finally {
      setSaving(false);
    }
  };

  const enableBrowserNotification = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      toast("error", "このブラウザは通知に対応していません。");
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      toast("success", "通知を許可しました。");
      new Notification("理想の自分", {
        body: "毎日のWOOPと振り返りで、理想へ一歩ずつ進みましょう。",
      });
      return;
    }
    toast("error", "通知が拒否されました。ブラウザ設定から変更できます。");
  };

  const handleDeleteAccount = async () => {
    if (!confirm("本当にアカウントを削除しますか？この操作は取り消せません。")) return;
    try {
      await deleteAccount();
      await signOut();
      toast("success", "アカウントを削除しました。");
    } catch (e) {
      toast(
        "error",
        e instanceof Error ? e.message : "アカウント削除に失敗しました。"
      );
    }
  };

  const handleModelCheck = async () => {
    setCheckingModel(true);
    try {
      const res = await fetch("/api/model-check");
      const data = (await res.json()) as { ok: boolean; missing?: string[] };
      if (data.ok) {
        toast("success", "モデルIDは有効です。");
      } else {
        toast("error", `未検出モデル: ${(data.missing ?? []).join(", ") || "不明"}`);
      }
    } catch {
      toast("error", "モデル確認に失敗しました。");
    } finally {
      setCheckingModel(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-6">
      <h1 className="font-display fade-up mb-6 text-2xl font-semibold">設定</h1>

      <div className="fade-up space-y-5">
        <section className="card p-5">
          <h2 className="mb-4 flex items-center gap-1.5 text-sm font-semibold text-fg-muted">
            <SunIcon size={14} className="text-secondary" />
            プロフィール
          </h2>
          <label
            htmlFor="display-name"
            className="mb-1 block text-sm font-medium text-fg-muted"
          >
            表示名
          </label>
          <input
            id="display-name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="あなたの名前"
            autoComplete="nickname"
            className="input-base"
          />
          <p className="mt-1.5 text-xs text-fg-subtle">
            「今日」の挨拶などで使われます。
          </p>
        </section>

        <section className="card p-5">
          <h2 className="mb-4 flex items-center gap-1.5 text-sm font-semibold text-fg-muted">
            <MoonIcon size={14} className="text-night" />
            1日の区切り
          </h2>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="timezone"
                className="mb-1 block text-sm font-medium text-fg-muted"
              >
                タイムゾーン
              </label>
              <select
                id="timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="input-base cursor-pointer"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="reset-hour"
                className="mb-1 block text-sm font-medium text-fg-muted"
              >
                1日のリセット時刻
              </label>
              <select
                id="reset-hour"
                value={dayResetHour}
                onChange={(e) => setDayResetHour(Number(e.target.value))}
                className="input-base cursor-pointer"
              >
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h}>
                    {String(h).padStart(2, "0")}:00
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-xs leading-relaxed text-fg-subtle">
                この時刻を境に「1日」が切り替わります（例: 4:00 なら深夜帯は前日扱い）。
              </p>
            </div>
          </div>
        </section>

        <section className="card p-5">
          <h2 className="mb-4 flex items-center gap-1.5 text-sm font-semibold text-fg-muted">
            <SparklesIcon size={14} className="text-secondary" />
            AIの語り口
          </h2>
          <StyleSelector value={aiStyle} onSelect={setAiStyle} />
          <button onClick={handleModelCheck} className="btn-secondary mt-3" disabled={checkingModel}>
            {checkingModel ? "確認中…" : "モデルIDを確認する"}
          </button>
        </section>

        <section className="card p-5">
          <h2 className="mb-4 flex items-center gap-1.5 text-sm font-semibold text-fg-muted">
            <SunIcon size={14} className="text-secondary" />
            リマインド
          </h2>
          <label className="mb-3 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={reminderEnabled}
              onChange={(e) => setReminderEnabled(e.target.checked)}
            />
            朝/夜のリマインドを有効にする
          </label>
          <label htmlFor="reminder-hour" className="mb-1 block text-sm text-fg-muted">
            リマインド時刻
          </label>
          <select
            id="reminder-hour"
            value={reminderHour}
            onChange={(e) => setReminderHour(Number(e.target.value))}
            className="input-base cursor-pointer"
            disabled={!reminderEnabled}
          >
            {Array.from({ length: 24 }, (_, h) => (
              <option key={h} value={h}>
                {String(h).padStart(2, "0")}:00
              </option>
            ))}
          </select>
          <button onClick={enableBrowserNotification} className="btn-secondary mt-3 w-full sm:w-auto">
            ブラウザ通知を許可する
          </button>
        </section>

        <section className="card p-5">
          <h2 className="mb-2 text-sm font-semibold text-fg-muted">規約・プライバシー</h2>
          <p className="text-xs text-fg-subtle leading-relaxed">
            本サービス利用時は、利用規約とプライバシーポリシーへの同意が必要です。
          </p>
          <div className="mt-3 flex gap-3 text-sm">
            <Link href="/terms" className="underline underline-offset-2">
              利用規約
            </Link>
            <Link href="/privacy" className="underline underline-offset-2">
              プライバシーポリシー
            </Link>
          </div>
        </section>

        <section className="card border-destructive/25 p-5">
          <h2 className="mb-2 text-sm font-semibold text-destructive">危険操作</h2>
          <p className="text-xs text-fg-subtle leading-relaxed">
            アカウント削除を行うと、目標・対話・履歴データは全て削除されます。
          </p>
          <button onClick={handleDeleteAccount} className="btn-secondary mt-3 text-destructive">
            アカウントを削除
          </button>
        </section>

        <div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary w-full sm:w-auto"
          >
            {saving ? "保存中…" : "保存する"}
          </button>
        </div>
      </div>
    </div>
  );
}
