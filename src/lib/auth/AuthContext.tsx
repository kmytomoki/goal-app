"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as fbSignOut,
  type User,
} from "firebase/auth";
import { firebaseAuth, googleProvider } from "@/lib/firebase/client";
import { ensureUser, getUser } from "@/lib/db/users";
import type { UserDoc } from "@/types";

interface AuthContextValue {
  user: User | null;
  userDoc: UserDoc | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshUserDoc: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(firebaseAuth(), async (fbUser) => {
      setUser(fbUser);
      try {
        if (fbUser) {
          const doc = await ensureUser({
            uid: fbUser.uid,
            email: fbUser.email ?? "",
            displayName: fbUser.displayName ?? undefined,
          });
          setUserDoc(doc);
        } else {
          setUserDoc(null);
        }
      } catch (e) {
        // Firestore 接続失敗などでもローディングは必ず解除する（無限スピナー防止）
        console.error("ユーザードキュメントの取得/作成に失敗しました:", e);
        setUserDoc(null);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      userDoc,
      loading,
      signInWithEmail: async (email, password) => {
        await signInWithEmailAndPassword(firebaseAuth(), email, password);
      },
      signUpWithEmail: async (email, password) => {
        await createUserWithEmailAndPassword(firebaseAuth(), email, password);
      },
      signInWithGoogle: async () => {
        await signInWithPopup(firebaseAuth(), googleProvider());
      },
      signOut: async () => {
        await fbSignOut(firebaseAuth());
      },
      refreshUserDoc: async () => {
        if (user) setUserDoc(await getUser(user.uid));
      },
    }),
    [user, userDoc, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth は AuthProvider の内側で使ってください。");
  return ctx;
}
