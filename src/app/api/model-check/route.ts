import { NextResponse } from "next/server";
import { getAnthropic } from "@/lib/ai/client";
import { MODELS } from "@/lib/ai/models";

export const runtime = "nodejs";

/**
 * 設定中モデルIDの存在確認。
 * 運用開始前のスモークチェック用途。
 */
export async function GET() {
  try {
    const client = getAnthropic();
    const list = await client.models.list({ limit: 200 });
    const available = new Set(list.data.map((m) => m.id));
    const configured = Object.values(MODELS).map((m) => m.name);
    const missing = configured.filter((id) => !available.has(id));
    return NextResponse.json({
      ok: missing.length === 0,
      configured,
      missing,
    });
  } catch (e) {
    console.error("[api/model-check] failed:", e);
    return NextResponse.json(
      { ok: false, error: "モデル確認に失敗しました。" },
      { status: 500 }
    );
  }
}
