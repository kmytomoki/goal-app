"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Timestamp } from "firebase/firestore";
import { useAuth } from "@/lib/auth/AuthContext";
import { BrandMark, GoogleIcon } from "@/components/icons";
import { firebaseAuth } from "@/lib/firebase/client";
import { updateUser } from "@/lib/db/users";

export default function SignupPage() {
  const { user, loading, signUpWithEmail, signInWithGoogle } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/");
  }, [loading, user, router]);

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("パスワードは6文字以上にしてください。");
      return;
    }
    if (!accepted) {
      setError("利用規約とプライバシーポリシーへの同意が必要です。");
      return;
    }
    setBusy(true);
    try {
      await signUpWithEmail(email, password);
      const uid = firebaseAuth().currentUser?.uid;
      if (uid) {
        await updateUser(uid, { policyAcceptedAt: Timestamp.now() });
      }
      router.replace("/");
    } catch {
      setError("登録に失敗しました。別のメールアドレスをお試しください。");
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setBusy(true);
    try {
      await signInWithGoogle();
      const uid = firebaseAuth().currentUser?.uid;
      if (uid) {
        await updateUser(uid, { policyAcceptedAt: Timestamp.now() });
      }
      router.replace("/");
    } catch {
      setError("Google登録に失敗しました。");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex flex-1 flex-col justify-center overflow-hidden px-6 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_at_top,rgba(245,158,11,0.14),transparent_65%)]"
      />
      <div className="fade-up relative mx-auto w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <BrandMark size={44} />
          <p className="font-display text-2xl font-semibold tracking-wide">
            理想の自分
          </p>
          <p className="text-xs text-fg-subtle">
            5年後の理想像と、今日の行動をつなぐ
          </p>
        </div>
        <div className="card p-6 sm:p-7">
          <h1 className="text-xl font-bold">新規登録</h1>
          <p className="mt-1 text-sm text-fg-muted">
            5年後の理想の自分を、今日から。
          </p>

          <form onSubmit={handleEmail} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-1 block text-sm font-medium text-fg-muted"
              >
                メールアドレス
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-base"
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="mb-1 block text-sm font-medium text-fg-muted"
              >
                パスワード
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                placeholder="6文字以上"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-base"
              />
              <p className="mt-1 text-xs text-fg-subtle">
                6文字以上で入力してください。
              </p>
            </div>
            <button type="submit" disabled={busy} className="btn-primary w-full">
              メールで登録
            </button>
            <label className="flex items-start gap-2 text-xs text-fg-subtle leading-relaxed">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                <Link href="/terms" className="underline underline-offset-2">
                  利用規約
                </Link>
                と
                <Link href="/privacy" className="ml-1 underline underline-offset-2">
                  プライバシーポリシー
                </Link>
                に同意します。
              </span>
            </label>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs text-fg-subtle">
            <span className="h-px flex-1 bg-border" />
            または
            <span className="h-px flex-1 bg-border" />
          </div>

          <button
            onClick={handleGoogle}
            disabled={busy}
            className="btn-secondary w-full"
          >
            <GoogleIcon size={17} />
            Googleで登録
          </button>

          {error && (
            <p role="alert" className="mt-4 text-sm text-destructive">
              {error}
            </p>
          )}

          <p className="mt-6 text-center text-sm text-fg-muted">
            すでにアカウントをお持ちの方は{" "}
            <Link
              href="/login"
              className="font-semibold text-primary underline-offset-2 hover:underline"
            >
              ログイン
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
