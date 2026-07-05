import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  arrayUnion,
  Timestamp,
} from "firebase/firestore";
import { firestore } from "@/lib/firebase/client";
import { paths } from "@/lib/firebase/paths";
import type { BufferAdjustment, DailyTaskDoc } from "@/types";

export async function addDailyTask(
  uid: string,
  input: Omit<DailyTaskDoc, "id" | "createdAt" | "updatedAt">
): Promise<DailyTaskDoc> {
  const ref = doc(collection(firestore(), paths.dailyTasks(uid)));
  const now = Timestamp.now();
  const task: DailyTaskDoc = {
    ...input,
    id: ref.id,
    createdAt: now,
    updatedAt: now,
  };
  const clean = Object.fromEntries(
    Object.entries(task).filter(([, v]) => v !== undefined)
  );
  await setDoc(ref, clean);
  return task;
}

/** 同一日付 + 同一タイトルのタスクを取得（重複作成防止用） */
export async function findDailyTaskByDateAndTitle(
  uid: string,
  date: string,
  title: string
): Promise<DailyTaskDoc | null> {
  const q = query(
    collection(firestore(), paths.dailyTasks(uid)),
    where("date", "==", date),
    where("title", "==", title),
    limit(1)
  );
  const snap = await getDocs(q);
  return snap.empty ? null : (snap.docs[0].data() as DailyTaskDoc);
}

/** 論理日付でその日のタスク一覧を取得 */
export async function listDailyTasksByDate(
  uid: string,
  date: string
): Promise<DailyTaskDoc[]> {
  const q = query(
    collection(firestore(), paths.dailyTasks(uid)),
    where("date", "==", date),
    orderBy("createdAt", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as DailyTaskDoc);
}

export async function updateDailyTask(
  uid: string,
  taskId: string,
  patch: Partial<Omit<DailyTaskDoc, "id" | "createdAt">>
): Promise<void> {
  await updateDoc(doc(firestore(), paths.dailyTask(uid, taskId)), {
    ...patch,
    updatedAt: Timestamp.now(),
  });
}

/** 実績量を記録する（夜の振り返り用） */
export async function setActualAmount(
  uid: string,
  taskId: string,
  actualAmount: number,
  completed: boolean
): Promise<void> {
  await updateDailyTask(uid, taskId, { actualAmount, completed });
}

/** バッファ調整履歴を1件追記し、調整後量を更新する */
export async function appendBufferAdjustment(
  uid: string,
  taskId: string,
  adjustment: BufferAdjustment
): Promise<void> {
  await updateDoc(doc(firestore(), paths.dailyTask(uid, taskId)), {
    bufferHistory: arrayUnion(adjustment),
    adjustedAmount: adjustment.after,
    updatedAt: Timestamp.now(),
  });
}
