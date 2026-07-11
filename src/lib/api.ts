import { httpsCallable } from "firebase/functions";
import { auth, functions, CHAT_URL } from "./firebase";
import type { ChatContext, ChatMessage, ChatMode, Task } from "./types";

/**
 * 対話ストリーミング。Cloud Functions (onRequest) の SSE を読み、
 * テキスト断片ごとに onText を呼ぶ。戻り値は完成した応答全文。
 */
export async function streamChat(params: {
  mode: ChatMode;
  messages: ChatMessage[];
  context: ChatContext;
  onText: (fullText: string) => void;
  signal?: AbortSignal;
}): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error("not signed in");
  const idToken = await user.getIdToken();

  const res = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      mode: params.mode,
      messages: params.messages,
      context: params.context,
    }),
    signal: params.signal,
  });

  if (!res.ok || !res.body) {
    throw new Error(`chat request failed (${res.status})`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";
    for (const event of events) {
      const line = event.trim();
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (data === "[DONE]") continue;
      try {
        const parsed = JSON.parse(data) as { text?: string; error?: string };
        if (parsed.error) throw new Error(parsed.error);
        if (parsed.text) {
          full += parsed.text;
          params.onText(full);
        }
      } catch (e) {
        if (e instanceof Error && e.message && !(e instanceof SyntaxError)) throw e;
      }
    }
  }
  return full;
}

// ---- 軽量タスク（onCall） ----

const assistCallable = httpsCallable(functions, "assist");

async function assist<T>(task: string, payload: Record<string, unknown>): Promise<T> {
  const result = await assistCallable({ task, payload });
  return result.data as T;
}

export interface ExtractedIdealSelf {
  title: string;
  description: string;
  habits: string[];
  triggerHabit: string;
  minimalRule: string;
}

export function extractIdealSelf(messages: ChatMessage[]): Promise<ExtractedIdealSelf> {
  return assist("extract_ideal_self", { messages });
}

export function extractTasks(params: {
  messages: ChatMessage[];
  firstTask: string | null;
  minimal: boolean;
}): Promise<{ tasks: { text: string; isFirstTask: boolean }[] }> {
  return assist("extract_tasks", params);
}

export interface EveningScoreResult {
  narikiri: number;
  pace: number;
  motivation: number;
  tomorrowFirstTask: string;
  narikiriReason: string;
  paceReason: string;
  motivationReason: string;
}

export function scoreEvening(params: {
  messages: ChatMessage[];
  tasks: Task[];
  idealHabits: string[];
}): Promise<EveningScoreResult> {
  return assist("score_evening", params);
}

export interface FirstTaskSuggestionResult {
  candidates: string[];
}

export function suggestFirstTasks(params: {
  tasks: Task[];
  idealHabits: string[];
  mood: string;
}): Promise<FirstTaskSuggestionResult> {
  return assist("suggest_first_tasks", params);
}

export interface WeeklyReviewResult {
  summary: string;
  stuckPatterns: string[];
  adjustments: string[];
}

export function generateWeeklyReview(params: {
  days: {
    date: string;
    taskCount: number;
    doneCount: number;
    mode?: string;
    scores?: { narikiri: number; pace: number; motivation: number } | null;
  }[];
  idealTitle: string;
}): Promise<WeeklyReviewResult> {
  return assist("weekly_review", params);
}
