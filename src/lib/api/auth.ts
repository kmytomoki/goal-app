import { NextResponse } from "next/server";
import { verifyIdTokenFromHeader } from "@/lib/firebase/admin";

/**
 * API ルート共通: Authorization ヘッダから uid を取り出す。
 * 未認証なら 401 レスポンスを返し、呼び出し側で early return できるようにする。
 */
export async function requireUid(
  request: Request
): Promise<{ uid: string } | { error: NextResponse }> {
  const uid = await verifyIdTokenFromHeader(
    request.headers.get("authorization")
  );
  if (!uid) {
    return {
      error: NextResponse.json(
        { error: "認証が必要です。" },
        { status: 401 }
      ),
    };
  }
  return { uid };
}
