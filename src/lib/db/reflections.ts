import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  where,
  Timestamp,
} from "firebase/firestore";
import { firestore } from "@/lib/firebase/client";
import { paths } from "@/lib/firebase/paths";
import type { ReflectionDoc } from "@/types";

export async function addReflection(
  uid: string,
  input: Omit<ReflectionDoc, "id" | "createdAt">
): Promise<ReflectionDoc> {
  const ref = doc(collection(firestore(), paths.reflections(uid)));
  const reflection: ReflectionDoc = {
    ...input,
    id: ref.id,
    createdAt: Timestamp.now(),
  };
  const clean = Object.fromEntries(
    Object.entries(reflection).filter(([, v]) => v !== undefined)
  );
  await setDoc(ref, clean);
  return reflection;
}

/** 履歴を新しい順に取得 */
export async function listReflections(
  uid: string,
  max = 30
): Promise<ReflectionDoc[]> {
  const q = query(
    collection(firestore(), paths.reflections(uid)),
    orderBy("date", "desc"),
    limit(max)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as ReflectionDoc);
}

/** 指定論理日付の振り返りを取得（なければ null） */
export async function getReflectionByDate(
  uid: string,
  date: string
): Promise<ReflectionDoc | null> {
  const q = query(
    collection(firestore(), paths.reflections(uid)),
    where("date", "==", date),
    limit(1)
  );
  const snap = await getDocs(q);
  return snap.empty ? null : (snap.docs[0].data() as ReflectionDoc);
}
