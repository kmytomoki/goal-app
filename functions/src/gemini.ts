import { GoogleGenAI } from "@google/genai";

// モデル方針（コスト最適化）:
// - 対話生成（オンボーディング / 朝 / 夜 / 週次）: gemini-2.5-flash
// - 軽量タスク（抽出・スコア算出）: gemini-2.5-flash-lite
export const MODEL_DIALOGUE = "gemini-2.5-flash";
export const MODEL_LIGHT = "gemini-2.5-flash-lite";

let client: GoogleGenAI | null = null;

export function getGemini(): GoogleGenAI {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set");
    }
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}
