import {
  collection,
  doc,
  getDoc,
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
import type {
  AiStyle,
  ChatMessage,
  ConversationDoc,
  ConversationType,
} from "@/types";

export async function createConversation(
  uid: string,
  input: {
    type: ConversationType;
    aiStyle: AiStyle;
    date?: string;
    currentStep?: string;
    messages?: ChatMessage[];
    draft?: Record<string, unknown>;
  }
): Promise<ConversationDoc> {
  const ref = doc(collection(firestore(), paths.conversations(uid)));
  const now = Timestamp.now();
  const conv: ConversationDoc = {
    id: ref.id,
    type: input.type,
    status: "in_progress",
    aiStyle: input.aiStyle,
    date: input.date,
    currentStep: input.currentStep,
    messages: input.messages ?? [],
    draft: input.draft,
    createdAt: now,
    updatedAt: now,
  };
  const clean = Object.fromEntries(
    Object.entries(conv).filter(([, v]) => v !== undefined)
  );
  await setDoc(ref, clean);
  return conv;
}

export async function getConversation(
  uid: string,
  conversationId: string
): Promise<ConversationDoc | null> {
  const snap = await getDoc(
    doc(firestore(), paths.conversation(uid, conversationId))
  );
  return snap.exists() ? (snap.data() as ConversationDoc) : null;
}

/** メッセージを1件追記する */
export async function appendMessage(
  uid: string,
  conversationId: string,
  message: ChatMessage
): Promise<void> {
  await updateDoc(doc(firestore(), paths.conversation(uid, conversationId)), {
    messages: arrayUnion(message),
    updatedAt: Timestamp.now(),
  });
}

/** ステータス・現在ステップ・下書きなどを更新する（中断/再開で利用） */
export async function updateConversation(
  uid: string,
  conversationId: string,
  patch: Partial<
    Pick<ConversationDoc, "status" | "currentStep" | "draft">
  >
): Promise<void> {
  await updateDoc(doc(firestore(), paths.conversation(uid, conversationId)), {
    ...patch,
    updatedAt: Timestamp.now(),
  });
}

/**
 * 中断中（in_progress）の対話を探して再開できるようにする。
 * type と date（任意）で絞り込み、最新の1件を返す。
 */
export async function findResumableConversation(
  uid: string,
  type: ConversationType,
  date?: string
): Promise<ConversationDoc | null> {
  const base = collection(firestore(), paths.conversations(uid));
  const constraints = [
    where("type", "==", type),
    where("status", "==", "in_progress"),
  ];
  if (date) constraints.push(where("date", "==", date));
  const q = query(base, ...constraints, orderBy("updatedAt", "desc"), limit(1));
  const snap = await getDocs(q);
  return snap.empty ? null : (snap.docs[0].data() as ConversationDoc);
}
