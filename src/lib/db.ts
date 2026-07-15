import {
  collection,
  doc,
  documentId,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import { normalizeTasks } from "./tasks";
import type { DailyLog, IdealSelf, UserProfile, WeeklyReview } from "./types";

const userDoc = (uid: string) => doc(db, "users", uid);
const idealSelfDoc = (uid: string) => doc(db, "users", uid, "idealSelf", "main");
const dailyLogDoc = (uid: string, date: string) => doc(db, "users", uid, "dailyLogs", date);
const weeklyReviewDoc = (uid: string, week: string) => doc(db, "users", uid, "weeklyReviews", week);

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(userDoc(uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

export async function saveUserProfile(uid: string, profile: Partial<UserProfile>): Promise<void> {
  await setDoc(userDoc(uid), profile, { merge: true });
}

export async function getIdealSelf(uid: string): Promise<IdealSelf | null> {
  const snap = await getDoc(idealSelfDoc(uid));
  return snap.exists() ? (snap.data() as IdealSelf) : null;
}

export async function saveIdealSelf(uid: string, ideal: Partial<IdealSelf>): Promise<void> {
  await setDoc(idealSelfDoc(uid), { ...ideal, updatedAt: Date.now() }, { merge: true });
}

export function emptyDailyLog(date: string): DailyLog {
  return {
    date,
    morningDialogue: null,
    eveningDialogue: null,
    tasks: [],
    tomorrowFirstTask: null,
    scores: null,
    mode: "normal",
    eveningNote: null,
    estimation: null,
  };
}

function normalizeDailyLog(log: DailyLog): DailyLog {
  return {
    ...log,
    tasks: normalizeTasks(log.tasks),
  };
}

export async function getDailyLog(uid: string, date: string): Promise<DailyLog | null> {
  const snap = await getDoc(dailyLogDoc(uid, date));
  return snap.exists() ? normalizeDailyLog(snap.data() as DailyLog) : null;
}

export async function saveDailyLog(uid: string, date: string, log: Partial<DailyLog>): Promise<void> {
  await setDoc(dailyLogDoc(uid, date), { ...log, date }, { merge: true });
}

export async function updateDailyLog(uid: string, date: string, patch: Record<string, unknown>): Promise<void> {
  await updateDoc(dailyLogDoc(uid, date), patch);
}

// 直近 n 日分のログ（新しい順）
export async function getRecentLogs(uid: string, n: number): Promise<DailyLog[]> {
  // documentId() の降順はエミュレータ非対応（descending key scans）のため、同値の date フィールドで並べる
  const q = query(
    collection(db, "users", uid, "dailyLogs"),
    orderBy("date", "desc"),
    limit(n),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => normalizeDailyLog(d.data() as DailyLog));
}

// 指定日より前の最後のログ（戻る仕組みの空白日数判定に使う）
export async function getLastLogBefore(uid: string, date: string): Promise<DailyLog | null> {
  const q = query(
    collection(db, "users", uid, "dailyLogs"),
    where("date", "<", date),
    orderBy("date", "desc"),
    limit(1),
  );
  const snap = await getDocs(q);
  return snap.empty ? null : normalizeDailyLog(snap.docs[0].data() as DailyLog);
}

export async function getLogsInRange(uid: string, fromDate: string, toDate: string): Promise<DailyLog[]> {
  const q = query(
    collection(db, "users", uid, "dailyLogs"),
    where(documentId(), ">=", fromDate),
    where(documentId(), "<=", toDate),
    orderBy(documentId(), "asc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => normalizeDailyLog(d.data() as DailyLog));
}

export async function getWeeklyReview(uid: string, week: string): Promise<WeeklyReview | null> {
  const snap = await getDoc(weeklyReviewDoc(uid, week));
  return snap.exists() ? (snap.data() as WeeklyReview) : null;
}

export async function saveWeeklyReview(uid: string, review: WeeklyReview): Promise<void> {
  await setDoc(weeklyReviewDoc(uid, review.week), review);
}
