"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import Spinner from "@/components/Spinner";

/**
 * ルート: 認証状態とオンボーディング完了状況で振り分ける。
 */
export default function Home() {
  const { user, userDoc, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
    } else if (userDoc && !userDoc.onboardingCompleted) {
      router.replace("/onboarding");
    } else {
      router.replace("/today");
    }
  }, [loading, user, userDoc, router]);

  return <Spinner label="読み込み中…" />;
}
