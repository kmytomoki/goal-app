"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { BrandMark, GoogleIcon } from "@/components/icons";

export default function LoginPage() {
  const { user, loading, signInWithEmail, signInWithGoogle } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/");
  }, [loading, user, router]);

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signInWithEmail(email, password);
      router.replace("/");
    } catch {
      setError("ログインに失敗しました。メールアドレスとパスワードを確認してください。");
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setBusy(true);
    try {
      await signInWithGoogle();
      router.replace("/");
    } catch {
      setError("Googleログインに失敗しました。");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex flex-1 flex-col justify-center overflow-hidden px-6 py-12">
      {/* 朝焼けの淡いグロー */}
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
          <h1 className="text-xl font-bold">ログイン</h1>
          <p className="mt-1 text-sm text-fg-muted">
            理想の自分へ、おかえりなさい。
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
                autoComplete="current-password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-base"
              />
            </div>
            <button type="submit" disabled={busy} className="btn-primary w-full">
              メールでログイン
            </button>
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
            Googleでログイン
          </button>

          {error && (
            <p role="alert" className="mt-4 text-sm text-destructive">
              {error}
            </p>
          )}

          <p className="mt-6 text-center text-sm text-fg-muted">
            アカウントがない方は{" "}
            <Link
              href="/signup"
              className="font-semibold text-primary underline-offset-2 hover:underline"
            >
              新規登録
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
