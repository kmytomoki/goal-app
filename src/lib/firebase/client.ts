import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  connectAuthEmulator,
  getAuth,
  GoogleAuthProvider,
  type Auth,
} from "firebase/auth";
import {
  connectFirestoreEmulator,
  getFirestore,
  type Firestore,
} from "firebase/firestore";

/**
 * Firebase クライアント SDK（ブラウザ用）。
 * NEXT_PUBLIC_* は公開されてよい設定値。秘密鍵はここには含めない。
 *
 * 初期化は遅延（初回アクセス時）に行う。
 * これにより、サーバー側のプリレンダー時にモジュール読み込みだけで
 * 初期化が走って失敗することを防ぐ（実際の利用はすべてクライアント実行時）。
 */
const useEmulator = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true";

// エミュレータ利用時は実プロジェクトに依存しない demo プロジェクトを使う。
// （クライアントとエミュレータの projectId を一致させるため固定値にする）
const firebaseConfig = useEmulator
  ? {
      apiKey: "demo-api-key",
      authDomain: "demo-goal-app.firebaseapp.com",
      projectId: "demo-goal-app",
    }
  : {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };

let _app: FirebaseApp | undefined;
let _auth: Auth | undefined;
let _db: Firestore | undefined;
let _googleProvider: GoogleAuthProvider | undefined;

function getFirebaseApp(): FirebaseApp {
  if (!_app) {
    _app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  }
  return _app;
}

export function firebaseAuth(): Auth {
  if (!_auth) {
    _auth = getAuth(getFirebaseApp());
    if (useEmulator && typeof window !== "undefined") {
      connectAuthEmulator(_auth, "http://127.0.0.1:9099", {
        disableWarnings: true,
      });
    }
  }
  return _auth;
}

export function firestore(): Firestore {
  if (!_db) {
    _db = getFirestore(getFirebaseApp());
    if (useEmulator && typeof window !== "undefined") {
      connectFirestoreEmulator(_db, "127.0.0.1", 8088);
    }
  }
  return _db;
}

export function googleProvider(): GoogleAuthProvider {
  if (!_googleProvider) _googleProvider = new GoogleAuthProvider();
  return _googleProvider;
}
