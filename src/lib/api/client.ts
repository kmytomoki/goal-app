"use client";

import { firebaseAuth } from "@/lib/firebase/client";
import type {
  ApiMessage,
  AiStyle,
  ConversationType,
  TaskCategory,
  TaskResult,
} from "@/types";

/** 現在ユーザーの ID トークンを取得（API認証ヘッダ用） */
async function authHeader(): Promise<Record<string, string>> {
  const u = firebaseAuth().currentUser;
  if (!u) throw new Error("ログインが必要です。");
  const token = await u.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

/**
 * 対話のストリーミング呼び出し。
 * onDelta で1チャンクずつテキストを受け取り、最終的に全文を返す。
 * 失敗時は例外を投げる（呼び出し側で入力内容を保持したままリトライさせる）。
 */
export async function streamChat(
  params: {
    type: ConversationType;
    aiStyle: AiStyle;
    messages: ApiMessage[];
    context?: string;
  },
  onDelta: (text: string) => void,
  signal?: AbortSignal
): Promise<string> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeader()) },
    body: JSON.stringify(params),
    signal,
  });

  if (!res.ok || !res.body) {
    let msg = "AI応答の取得に失敗しました。";
    try {
      const j = await res.json();
      if (j?.error) msg = j.error;
    } catch {
      /* noop */
    }
    throw new Error(msg);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let full = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    if (chunk.includes("[[STREAM_ERROR]]")) {
      throw new Error("応答の途中でエラーが発生しました。");
    }
    full += chunk;
    onDelta(chunk);
  }
  return full;
}

export async function classifyTasks(
  tasks: { id: string; title: string }[]
): Promise<{ items: { id: string; title: string; category: TaskCategory }[] }> {
  const res = await fetch("/api/classify", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeader()) },
    body: JSON.stringify({ tasks }),
  });
  if (!res.ok) throw new Error((await res.json())?.error ?? "分類に失敗しました。");
  return res.json();
}

export interface AdjustResponse {
  items: {
    id: string;
    title: string;
    estimatedAmount: number;
    adjustedAmount: number;
    ratio: number;
    reason: string;
  }[];
  message: string;
}

export async function adjustTasks(
  items: { id: string; title: string; estimatedAmount: number; unit?: string }[]
): Promise<AdjustResponse> {
  const res = await fetch("/api/adjust", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeader()) },
    body: JSON.stringify({ items }),
  });
  if (!res.ok) throw new Error((await res.json())?.error ?? "調整に失敗しました。");
  return res.json();
}

export async function extractOnboardingGoals(
  messages: ApiMessage[]
): Promise<{ vision5y: string; goal3m: string; weekly: string }> {
  const res = await fetch("/api/extract-goals", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeader()) },
    body: JSON.stringify({ mode: "onboarding_goals", messages }),
  });
  if (!res.ok) throw new Error((await res.json())?.error ?? "目標抽出に失敗しました。");
  return res.json();
}

export async function extractTasksFromWoop(
  messages: ApiMessage[]
): Promise<{ items: { title: string; estimatedAmount: number; unit: string }[] }> {
  const res = await fetch("/api/extract-goals", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeader()) },
    body: JSON.stringify({ mode: "woop_tasks", messages }),
  });
  if (!res.ok)
    throw new Error((await res.json())?.error ?? "WOOPからの抽出に失敗しました。");
  return res.json();
}

export interface ScoreResponse {
  score: number;
  achievementRateAdjusted: number;
  achievementRateEstimated: number;
  summary: string;
}

export async function scoreDay(
  taskResults: TaskResult[],
  conversation?: ApiMessage[]
): Promise<ScoreResponse> {
  const res = await fetch("/api/score", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeader()) },
    body: JSON.stringify({ taskResults, conversation }),
  });
  if (!res.ok) throw new Error((await res.json())?.error ?? "スコア化に失敗しました。");
  return res.json();
}

export async function deleteAccount(): Promise<void> {
  const res = await fetch("/api/account/delete", {
    method: "POST",
    headers: { ...(await authHeader()) },
  });
  if (!res.ok) throw new Error((await res.json())?.error ?? "アカウント削除に失敗しました。");
}
