"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Timestamp } from "firebase/firestore";
import { useAuth } from "@/lib/auth/AuthContext";
import { streamChat } from "@/lib/api/client";
import {
  appendMessage,
  createConversation,
  findResumableConversation,
  updateConversation,
} from "@/lib/db/conversations";
import type {
  AiStyle,
  ApiMessage,
  ChatMessage,
  ConversationDoc,
  ConversationType,
} from "@/types";

/** 種別ごとの最初のAIあいさつ（コスト節約のため固定文。以降はAI応答） */
function initialGreeting(type: ConversationType, style: AiStyle): string {
  const futureSelf = style === "future_self";
  switch (type) {
    case "onboarding":
      return futureSelf
        ? "こんにちは。5年後の私から来ました。これから一緒に、あなたが本当に望む未来を言葉にしていきましょう。まず、5年後どんな自分でありたいですか？"
        : "はじめまして。あなたの伴走者です。これから一緒に目標を描いていきます。まず、5年後にどんな自分になっていたいですか？";
    case "morning_woop":
      return futureSelf
        ? "おはよう。今日も理想へ一歩進む日にしよう。まずは Wish（願い）から。今日、心から叶えたいことは何？"
        : "おはようございます。今日のWOOPを始めましょう。まずは Wish（願い）から。今日、達成したいことは何ですか？";
    case "night_reflection":
      return futureSelf
        ? "おつかれさま。今日を一緒に振り返ろう。まず、今日できたことを一つ教えてくれる？"
        : "おつかれさまでした。今日を振り返りましょう。まず、今日できたことを一つ教えてください。";
  }
}

export interface UseConversationOptions {
  type: ConversationType;
  aiStyle: AiStyle;
  /** 論理日付（朝/夜の対話に紐づける） */
  date?: string;
  /** system に追加する文脈（ゴール要約など） */
  context?: string;
  /** 中断中の対話があれば再開する（既定 true） */
  resume?: boolean;
}

const MAX_CONTEXT_MESSAGES = 12;

function compactForPrompt(list: ChatMessage[]): ApiMessage[] {
  if (list.length <= MAX_CONTEXT_MESSAGES) {
    return list.map((m) => ({ role: m.role, content: m.content }));
  }
  const head = list.slice(0, list.length - MAX_CONTEXT_MESSAGES);
  const tail = list.slice(-MAX_CONTEXT_MESSAGES);
  const summary = head
    .slice(-10)
    .map((m) => `${m.role === "assistant" ? "AI" : "ユーザー"}: ${m.content}`)
    .join("\n")
    .slice(0, 1200);
  return [
    {
      role: "assistant",
      content: `過去会話の要約:\n${summary}`,
    },
    ...tail.map((m) => ({ role: m.role, content: m.content })),
  ];
}

export function useConversation(opts: UseConversationOptions) {
  const { user } = useAuth();
  const uid = user?.uid;

  const [conversation, setConversation] = useState<ConversationDoc | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const startedRef = useRef(false);
  const sessionKeyRef = useRef("");

  useEffect(() => {
    const key = [uid ?? "", opts.type, opts.date ?? "", opts.resume ? "1" : "0"].join("|");
    if (key !== sessionKeyRef.current) {
      sessionKeyRef.current = key;
      startedRef.current = false;
      setConversation(null);
      setMessages([]);
      setReady(false);
      setError(null);
      setStreaming(false);
      setStreamingText("");
    }
  }, [uid, opts.type, opts.date, opts.resume]);

  // 初期化: 再開 or 新規作成
  useEffect(() => {
    if (!uid || startedRef.current) return;
    startedRef.current = true;

    (async () => {
      try {
        const resumable =
          opts.resume === false
            ? null
            : await findResumableConversation(uid, opts.type, opts.date);

        if (resumable) {
          setConversation(resumable);
          setMessages(resumable.messages);
        } else {
          const greeting: ChatMessage = {
            role: "assistant",
            content: initialGreeting(opts.type, opts.aiStyle),
            createdAt: Timestamp.now(),
          };
          const conv = await createConversation(uid, {
            type: opts.type,
            aiStyle: opts.aiStyle,
            date: opts.date,
            messages: [greeting],
          });
          setConversation(conv);
          setMessages([greeting]);
        }
      } catch {
        setError("対話の初期化に失敗しました。再読み込みしてください。");
      } finally {
        setReady(true);
      }
    })();
  }, [uid, opts.type, opts.aiStyle, opts.date, opts.resume]);

  /** 現在の messages 末尾（=user）に対するAI応答を生成しストリーム表示する */
  const generate = useCallback(
    async (history: ChatMessage[]) => {
      if (!uid || !conversation) return;
      setStreaming(true);
      setStreamingText("");
      setError(null);
      try {
        const full = await streamChat(
          {
            type: opts.type,
            aiStyle: opts.aiStyle,
            messages: compactForPrompt(history),
            context: opts.context,
          },
          (delta) => setStreamingText((prev) => prev + delta)
        );
        const assistantMsg: ChatMessage = {
          role: "assistant",
          content: full,
          createdAt: Timestamp.now(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
        setStreamingText("");
        await appendMessage(uid, conversation.id, assistantMsg);
      } catch (e) {
        // 失敗時: 入力済み内容(messages)は保持。retry() で再試行可能。
        setError(
          e instanceof Error ? e.message : "AI応答に失敗しました。再試行してください。"
        );
      } finally {
        setStreaming(false);
      }
    },
    [uid, conversation, opts.type, opts.aiStyle, opts.context]
  );

  /** ユーザー発言を送信し、AI応答を得る */
  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!uid || !conversation || !trimmed || streaming) return;
      const userMsg: ChatMessage = {
        role: "user",
        content: trimmed,
        createdAt: Timestamp.now(),
      };
      const next = [...messages, userMsg];
      setMessages(next);
      try {
        await appendMessage(uid, conversation.id, userMsg);
      } catch {
        /* 保存失敗でも会話は継続させる */
      }
      await generate(next);
    },
    [uid, conversation, messages, streaming, generate]
  );

  /** 直近の失敗をやり直す（末尾が user の状態で再生成） */
  const retry = useCallback(async () => {
    if (streaming) return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== "user") return;
    await generate(messages);
  }, [messages, streaming, generate]);

  /** 対話を完了状態にする */
  const complete = useCallback(async () => {
    if (!uid || !conversation) return;
    await updateConversation(uid, conversation.id, { status: "completed" });
    setConversation({ ...conversation, status: "completed" });
  }, [uid, conversation]);

  /** 下書き/現在ステップを保存（中断・再開のため） */
  const saveProgress = useCallback(
    async (patch: { currentStep?: string; draft?: Record<string, unknown> }) => {
      if (!uid || !conversation) return;
      await updateConversation(uid, conversation.id, patch);
      setConversation({ ...conversation, ...patch });
    },
    [uid, conversation]
  );

  return {
    conversation,
    messages,
    streaming,
    streamingText,
    error,
    ready,
    send,
    retry,
    complete,
    saveProgress,
  };
}
