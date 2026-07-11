# Vercel デプロイ手順（goal-app）

フロントエンド（Vite SPA）を **Vercel**、バックエンド（Auth / Firestore / Cloud Functions）を **Firebase 本番** に置く構成。

```
ブラウザ → Vercel（静的ファイル dist/）
         ↓ Firebase SDK
         → Firebase Auth / Firestore
         → Cloud Functions（chat SSE / assist）
              ↓
              Gemini API
```

---

## 前提

- Firebase **Blaze（従量課金）** プラン（Functions から Gemini を呼ぶため）
- Node 20+、Firebase CLI ログイン済み（`firebase login`）
- Vercel アカウント（GitHub 連携推奨）

---

## 1. Firebase 本番プロジェクト

### 1-1. プロジェクト作成

1. [Firebase Console](https://console.firebase.google.com/) で本番プロジェクトを作成
2. **Authentication** → サインイン方法 → **匿名** を有効化
3. **Firestore Database** を作成（本番リージョンは `asia-northeast1` 推奨）
4. コンソール **プロジェクト設定 > 全般** から Web アプリを追加し、設定値を控える

### 1-2. ローカルの Firebase プロジェクト ID を本番に合わせる

`.firebaserc` の `default` を本番プロジェクト ID に変更:

```json
{
  "projects": {
    "default": "your-production-project-id"
  }
}
```

### 1-3. ルール・Functions をデプロイ

```bash
cd goal-app
npm install --prefix functions
npm run functions:build

# Firestore ルール
firebase deploy --only firestore:rules,firestore:indexes --project your-production-project-id

# Cloud Functions（chat / assist）
firebase deploy --only functions --project your-production-project-id
```

### 1-4. Gemini API キー（Functions Secret）

```bash
firebase functions:secrets:set GEMINI_API_KEY --project your-production-project-id
```

ローカルエミュレータでは従来どおり `functions/.env` の `GEMINI_API_KEY` が使われる。

---

## 2. Vercel にフロントをデプロイ

### 2-1. リポジトリ連携（推奨）

1. [vercel.com](https://vercel.com) → **Add New Project**
2. GitHub リポジトリ `goal-app` を選択
3. Framework Preset: **Vite**（自動検出）
4. Root Directory: `goal-app`（モノレポでない場合はそのまま）
5. Build Command: `npm run build`
6. Output Directory: `dist`

`vercel.json` があるため SPA のルーティングは自動で `index.html` にフォールバックされる。

### 2-2. 環境変数（Vercel Dashboard > Settings > Environment Variables）

| 変数名 | 値 | 備考 |
|--------|-----|------|
| `VITE_USE_FIREBASE_EMULATOR` | `false` | **必須**。未設定だと本番でもエミュレータ接続を試みる |
| `VITE_FIREBASE_API_KEY` | Firebase Web 設定 | |
| `VITE_FIREBASE_AUTH_DOMAIN` | `xxx.firebaseapp.com` | |
| `VITE_FIREBASE_PROJECT_ID` | 本番プロジェクト ID | |
| `VITE_FIREBASE_STORAGE_BUCKET` | | |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | | |
| `VITE_FIREBASE_APP_ID` | | |

**Production / Preview / Development** すべてに設定するか、少なくとも **Production** に設定。

デプロイ後、環境変数を変えたら **Redeploy** が必要。

### 2-3. CLI からデプロイ（任意）

```bash
npm i -g vercel
cd goal-app
vercel login
vercel --prod
```

---

## 3. デプロイ後の必須設定

### 3-1. Firebase Auth の承認ドメイン

Firebase Console → Authentication → Settings → **Authorized domains** に追加:

- `your-app.vercel.app`
- カスタムドメインを使う場合はそれも追加

### 3-2. 動作確認チェックリスト

- [ ] トップページが表示される（白画面・無限ローディングなし）
- [ ] 匿名ログイン（「はじめる」）が成功する
- [ ] Firestore に `users/{uid}` が作成される
- [ ] オンボーディング / 朝 / 夜の AI 対話が返る（Functions + Gemini）
- [ ] ブラウザコンソールに `client is offline` / `127.0.0.1` エラーがない

### 3-3. よくあるエラー

| 症状 | 原因 | 対処 |
|------|------|------|
| 読み込み中のまま | エミュレータモードのまま | `VITE_USE_FIREBASE_EMULATOR=false` |
| Auth 失敗 | 承認ドメイン未登録 | Vercel の URL を Auth に追加 |
| AI 応答失敗 | Functions 未デプロイ / API キー未設定 | `firebase deploy --only functions`、キー確認 |
| 404 on refresh | SPA rewrite 不足 | `vercel.json` の rewrites を確認 |
| CORS エラー | Functions CORS | `chat` は `cors: true` 済み。Callable は Firebase SDK 経由 |

---

## 4. ローカルと本番の切り替え

| 環境 | `.env.local` |
|------|----------------|
| ローカル（エミュレータ） | `VITE_USE_FIREBASE_EMULATOR=true` |
| ローカル（本番 Firebase 接続テスト） | `VITE_USE_FIREBASE_EMULATOR=false` + 本番 `VITE_FIREBASE_*` |
| Vercel 本番 | Dashboard の環境変数のみ |

---

## 5. 更新フロー

**フロントのみ変更した場合**

- Git push → Vercel が自動ビルド（連携時）
- または `vercel --prod`

**Functions / Firestore ルールを変更した場合**

```bash
firebase deploy --only functions
firebase deploy --only firestore:rules
```

フロントと Functions は **別デプロイ** である点に注意。
