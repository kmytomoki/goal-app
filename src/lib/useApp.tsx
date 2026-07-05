import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { onAuthStateChanged, signInAnonymously, type User } from "firebase/auth";
import { auth } from "./firebase";
import { getIdealSelf, getUserProfile } from "./db";
import type { IdealSelf, UserProfile } from "./types";

interface AppState {
  user: User | null;
  authLoading: boolean;
  profile: UserProfile | null;
  ideal: IdealSelf | null;
  dataLoading: boolean;
  start: () => Promise<void>; // 匿名サインイン
  refresh: () => Promise<void>;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [ideal, setIdeal] = useState<IdealSelf | null>(null);
  const [dataLoading, setDataLoading] = useState(false);

  const loadData = useCallback(async (u: User | null) => {
    if (!u) {
      setProfile(null);
      setIdeal(null);
      return;
    }
    setDataLoading(true);
    try {
      const [p, i] = await Promise.all([getUserProfile(u.uid), getIdealSelf(u.uid)]);
      setProfile(p);
      setIdeal(i);
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      await loadData(u);
      setAuthLoading(false);
    });
  }, [loadData]);

  const start = useCallback(async () => {
    await signInAnonymously(auth);
  }, []);

  const refresh = useCallback(async () => {
    await loadData(auth.currentUser);
  }, [loadData]);

  return (
    <AppContext.Provider
      value={{ user, authLoading, profile, ideal, dataLoading, start, refresh }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
