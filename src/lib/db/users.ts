import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import { firestore } from "@/lib/firebase/client";
import { paths } from "@/lib/firebase/paths";
import type { AiStyle, UserDoc } from "@/types";
import {
  DEFAULT_DAY_RESET_HOUR,
  DEFAULT_TIMEZONE,
  guessTimeZone,
} from "@/lib/time/dayBoundary";

export async function getUser(uid: string): Promise<UserDoc | null> {
  const db = firestore();
  const snap = await getDoc(doc(db, paths.user(uid)));
  return snap.exists() ? (snap.data() as UserDoc) : null;
}

/**
 * 初回ログイン時にユーザードキュメントを作成する（既存なら何もしない）。
 */
export async function ensureUser(params: {
  uid: string;
  email: string;
  displayName?: string;
}): Promise<UserDoc> {
  const existing = await getUser(params.uid);
  if (existing) return existing;

  const now = Timestamp.now();
  const user: UserDoc = {
    uid: params.uid,
    email: params.email,
    displayName: params.displayName,
    timezone: guessTimeZone() || DEFAULT_TIMEZONE,
    dayResetHour: DEFAULT_DAY_RESET_HOUR,
    aiStyle: "future_self",
    reminderEnabled: true,
    reminderHour: 7,
    onboardingCompleted: false,
    createdAt: now,
    updatedAt: now,
  };
  // undefined を含めると Firestore がエラーになるため除去
  const clean = Object.fromEntries(
    Object.entries(user).filter(([, v]) => v !== undefined)
  );
  await setDoc(doc(firestore(), paths.user(params.uid)), clean);
  return user;
}

export async function updateUser(
  uid: string,
  patch: Partial<
    Pick<
      UserDoc,
      | "displayName"
      | "timezone"
      | "dayResetHour"
      | "aiStyle"
      | "onboardingCompleted"
      | "reminderEnabled"
      | "reminderHour"
      | "policyAcceptedAt"
    >
  >
): Promise<void> {
  await updateDoc(doc(firestore(), paths.user(uid)), {
    ...patch,
    updatedAt: Timestamp.now(),
  });
}

export async function setAiStyle(uid: string, aiStyle: AiStyle): Promise<void> {
  await updateUser(uid, { aiStyle });
}

export async function completeOnboarding(uid: string): Promise<void> {
  await updateUser(uid, { onboardingCompleted: true });
}
