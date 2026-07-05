import { initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { connectFunctionsEmulator, getFunctions } from "firebase/functions";

export const USE_EMULATOR = import.meta.env.VITE_USE_FIREBASE_EMULATOR === "true";

const projectId = USE_EMULATOR
  ? "demo-goal-app"
  : (import.meta.env.VITE_FIREBASE_PROJECT_ID as string);

const app = initializeApp(
  USE_EMULATOR
    ? { projectId, apiKey: "demo-api-key", authDomain: "localhost" }
    : {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId,
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID,
      },
);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);

if (USE_EMULATOR) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8088);
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
}

// SSE ストリーミング用の chat 関数 URL（callable ではなく onRequest なので直接叩く）
export const CHAT_URL = USE_EMULATOR
  ? `http://127.0.0.1:5001/${projectId}/us-central1/chat`
  : `https://us-central1-${projectId}.cloudfunctions.net/chat`;
