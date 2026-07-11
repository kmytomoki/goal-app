# Production Deployment Guide

最終更新: 2026-07-02

## 1) Firebase本番プロジェクト

1. Firebaseで本番プロジェクト作成
2. Authentication: メール/Google を有効化
3. Firestoreを作成
4. ルール/インデックスを反映

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

## 2) 環境変数（Vercel）

`NEXT_PUBLIC_USE_FIREBASE_EMULATOR=false` を必ず設定。

- `GEMINI_API_KEY`
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `FIREBASE_ADMIN_PROJECT_ID`
- `FIREBASE_ADMIN_CLIENT_EMAIL`
- `FIREBASE_ADMIN_PRIVATE_KEY`

## 3) 127.0.0.1依存の解消

- 開発時のみ `127.0.0.1:3000` を使う（Authエミュレータ都合）
- 本番は通常のドメインを使う
- 本番では `FIRESTORE_EMULATOR_HOST` と `FIREBASE_AUTH_EMULATOR_HOST` を設定しない

## 4) リリース前チェック

```bash
npm run lint
npx tsc --noEmit
npm run build
```

### モデルIDチェック

```bash
curl https://<your-domain>/api/model-check
```

`missing` が空であることを確認。
