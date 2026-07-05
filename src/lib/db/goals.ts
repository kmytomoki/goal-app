import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  Timestamp,
} from "firebase/firestore";
import { firestore } from "@/lib/firebase/client";
import { paths } from "@/lib/firebase/paths";
import type { GoalDoc, GoalLayer } from "@/types";

export async function addGoal(
  uid: string,
  input: Omit<GoalDoc, "id" | "createdAt" | "updatedAt" | "status"> &
    Partial<Pick<GoalDoc, "status">>
): Promise<GoalDoc> {
  const ref = doc(collection(firestore(), paths.goals(uid)));
  const now = Timestamp.now();
  const goal: GoalDoc = {
    ...input,
    id: ref.id,
    status: input.status ?? "active",
    createdAt: now,
    updatedAt: now,
  };
  const clean = Object.fromEntries(
    Object.entries(goal).filter(([, v]) => v !== undefined)
  );
  await setDoc(ref, clean);
  return goal;
}

export async function listGoals(
  uid: string,
  layer?: GoalLayer
): Promise<GoalDoc[]> {
  const base = collection(firestore(), paths.goals(uid));
  const q = layer
    ? query(base, where("layer", "==", layer), orderBy("createdAt", "asc"))
    : query(base, orderBy("createdAt", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as GoalDoc);
}

export async function updateGoal(
  uid: string,
  goalId: string,
  patch: Partial<Omit<GoalDoc, "id" | "createdAt">>
): Promise<void> {
  await updateDoc(doc(firestore(), paths.goal(uid, goalId)), {
    ...patch,
    updatedAt: Timestamp.now(),
  });
}

export async function deleteGoal(uid: string, goalId: string): Promise<void> {
  await deleteDoc(doc(firestore(), paths.goal(uid, goalId)));
}
