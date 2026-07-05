import {
  cert,
  getApp,
  getApps,
  initializeApp,
  type App,
} from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

/**
 * Firebase Admin SDK（サーバー側専用）。
 * API ルートでのトークン検証や、サーバー権限での Firestore 操作に使う。
 * 秘密鍵は環境変数からのみ読み込む（ハードコード禁止）。
 *
 * 初期化は遅延（リクエスト時）に行う。
 * ビルド時のページデータ収集では env 未設定でも失敗させない。
 */
// エミュレータ利用時は認証情報なしで初期化する。
// 接続先は FIRESTORE_EMULATOR_HOST / FIREBASE_AUTH_EMULATOR_HOST を Admin SDK が自動検出する。
const useEmulator =
  process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true" ||
  !!process.env.FIRESTORE_EMULATOR_HOST;

function buildAdminApp(): App {
  if (getApps().length) return getApp();

  if (useEmulator) {
    // クライアント (client.ts) と projectId を一致させる
    return initializeApp({ projectId: "demo-goal-app" });
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  // .env では \n がエスケープされているため実改行へ戻す
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase Admin の環境変数が未設定です (FIREBASE_ADMIN_PROJECT_ID / CLIENT_EMAIL / PRIVATE_KEY)。"
    );
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

export function getAdminAuth(): Auth {
  return getAuth(buildAdminApp());
}

export function getAdminDb(): Firestore {
  return getFirestore(buildAdminApp());
}

/**
 * Authorization: Bearer <idToken> ヘッダから uid を検証して取り出す。
 * API ルートの先頭で呼ぶ。検証失敗時は null を返す。
 */
export async function verifyIdTokenFromHeader(
  authorizationHeader: string | null
): Promise<string | null> {
  if (!authorizationHeader?.startsWith("Bearer ")) return null;
  const idToken = authorizationHeader.slice("Bearer ".length).trim();
  if (!idToken) return null;
  try {
    const decoded = await getAdminAuth().verifyIdToken(idToken);
    return decoded.uid;
  } catch {
    return null;
  }
}
