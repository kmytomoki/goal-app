import { NextResponse } from "next/server";
import { requireUid } from "@/lib/api/auth";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { paths } from "@/lib/firebase/paths";

export const runtime = "nodejs";

/**
 * アカウント削除（ユーザードキュメント配下 + Authユーザー）。
 * 失敗時は部分削除の可能性があるため、管理者ログでの確認を推奨。
 */
export async function POST(request: Request) {
  const authd = await requireUid(request);
  if ("error" in authd) return authd.error;
  const uid = authd.uid;
  try {
    const db = getAdminDb();
    const userRef = db.doc(paths.user(uid));
    await db.recursiveDelete(userRef);
    await getAdminAuth().deleteUser(uid);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/account/delete] failed:", e);
    return NextResponse.json(
      { error: "アカウント削除に失敗しました。時間をおいて再試行してください。" },
      { status: 500 }
    );
  }
}
