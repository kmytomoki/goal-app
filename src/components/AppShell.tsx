"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import Spinner from "@/components/Spinner";
import {
  BrandMark,
  ChartIcon,
  LogOutIcon,
  SettingsIcon,
  SunIcon,
  TargetIcon,
} from "@/components/icons";

const NAV = [
  { href: "/today", label: "今日", icon: SunIcon },
  { href: "/goals", label: "目標", icon: TargetIcon },
  { href: "/history", label: "履歴", icon: ChartIcon },
  { href: "/settings", label: "設定", icon: SettingsIcon },
];

/**
 * 認証必須レイアウト。未ログインは /login へ。
 * オンボーディング未完了は /onboarding へ誘導する。
 */
export default function AppShell({
  children,
  requireOnboarding = true,
}: {
  children: ReactNode;
  requireOnboarding?: boolean;
}) {
  const { user, userDoc, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (
      requireOnboarding &&
      userDoc &&
      !userDoc.onboardingCompleted &&
      pathname !== "/onboarding"
    ) {
      router.replace("/onboarding");
    }
  }, [loading, user, userDoc, requireOnboarding, pathname, router]);

  if (loading || !user) {
    return <Spinner label="読み込み中…" />;
  }

  return (
    <div className="flex min-h-full w-full flex-col">
      {/* 朝焼け→緑のアクセントライン */}
      <div
        aria-hidden
        className="h-0.5 w-full bg-gradient-to-r from-amber-400 via-secondary to-accent"
      />
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between px-4 py-2.5">
          <Link
            href="/today"
            className="flex items-center gap-2 rounded-lg py-1 pr-2"
          >
            <BrandMark size={26} />
            <span className="font-display text-base font-semibold tracking-wide text-foreground">
              理想の自分
            </span>
          </Link>
          <nav className="flex items-center gap-0.5 text-sm">
            {NAV.map((n) => {
              const active = pathname?.startsWith(n.href);
              const Icon = n.icon;
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-10 items-center gap-1.5 rounded-full px-3 py-1.5 transition-colors duration-200 ${
                    active
                      ? "bg-primary-soft font-semibold text-primary"
                      : "text-fg-muted hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon size={16} />
                  <span className="hidden sm:inline">{n.label}</span>
                  <span className="sr-only sm:hidden">{n.label}</span>
                </Link>
              );
            })}
            <button
              onClick={() => signOut()}
              aria-label="ログアウト"
              title="ログアウト"
              className="ml-1 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-fg-subtle transition-colors duration-200 hover:bg-muted hover:text-foreground"
            >
              <LogOutIcon size={16} />
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col">
        {children}
      </main>
    </div>
  );
}
