# ステージ — 理想の自分×AI対話 目標管理アプリ (MVP)

「理想の自分をAIと毎日対話しながら演じていく」目標管理アプリ。
夢はあるのに今日何をすべきか分からない学生向けに、理想像と今日の行動を繋げる。フォーム入力ゼロ、AIとの会話だけで完結する。

## 思想的基盤：意志力に頼らない仕組み化

1. **迷いの排除** — 前日の夜に「明日の最初の1タスク」を決めるので、朝は考えずに始まる
2. **タスク量ベース管理** — 「2時間勉強」ではなく「例題3問」。完了条件が明確なチェックリスト
3. **確実にやりきれる量** — AIが昨日の実績を見て計画過多を止める（見積もりの70%で組む）
4. **最低ライン** — 「5分だけモード」「今日は休む（チェックインのみ）」でゼロの日を作らない
5. **戻る仕組み** — 1日空いたら半分の量、3日空いたら今日の1タスクから。AIは絶対に責めない
6. **プレイヤー/マネージャー分離** — 朝夜は実行に集中、計画の見直しは週次振り返りでだけ

## 技術スタック

- **フロントエンド**: React 19 (Vite) + TypeScript + Tailwind CSS v4。モバイルファーストSPA
- **バックエンド**: Firebase — Authentication（匿名認証）/ Firestore / Cloud Functions v2
- **AI**: Gemini API（Cloud Functions 経由。クライアントから直接叩かない）
  - 対話生成: `gemini-2.5-flash`（オンボーディング・朝・夜・週次）— SSE ストリーミング
  - 軽量タスク: `gemini-2.5-flash-lite`（理想像/タスク抽出・スコア算出）— 構造化出力（JSON Schema）

## セットアップ

```bash
# 1. 依存インストール
npm install
npm install --prefix functions

# 2. 環境変数
cp .env.example .env.local              # Firebase クライアント設定（エミュレータなら不要）
cp functions/.env.example functions/.env # GEMINI_API_KEY を設定（必須）

# 3. Functions をビルド
npm run functions:build

# 4. エミュレータ + 開発サーバー（ターミナル2つ）
npm run emulators   # Firebase エミュレータ（auth/firestore/functions）
npm run dev         # http://localhost:5173
```

日常の起動・停止手順やトラブル対処は [docs/LOCAL_DEV.md](docs/LOCAL_DEV.md) を参照。

- `VITE_USE_FIREBASE_EMULATOR=true`（デフォルト）でローカルの `demo-goal-app` プロジェクトで動作。課金不要。Gemini キーだけ本物が必要。
- 要件: Node 20+、Java 17+（Firestore エミュレータ用。firebase-tools@14 は Java 17 対応、@15 は Java 21 が必要）
- WSL の `/mnt/c` 上ではモジュール読込が遅いため、`npm run emulators` は `FUNCTIONS_DISCOVERY_TIMEOUT=120` を設定済み

## アーキテクチャ

```
src/
  lib/        firebase 初期化 / Firestore アクセサ / API クライアント / 日付ユーティリティ
  components/ Chat（SSEストリーミング対話）/ TaskList / ScoreChart / PageHeader
  pages/      Welcome → Onboarding → Home / Morning / Evening / Weekly / Settings
functions/src/
  index.ts    chat（onRequest, SSE）+ assist（onCall, 構造化出力）
  prompts.ts  モード別システムプロンプト（ラベリング型 / 将来の自分型）
  anthropic.ts モデル定義とクライアント
```

### Firestore データモデル

```
users/{uid}                     … createdAt, timezone, aiStyle, triggerHabit, minimalRule
users/{uid}/idealSelf/main      … title, description, habits[]
users/{uid}/dailyLogs/{yyyy-mm-dd}
  morningDialogue / eveningDialogue: { messages[], completedAt, woopStage }
  tasks: [{ text, done, isFirstTask }]
  tomorrowFirstTask, scores: { narikiri, pace, motivation }
  mode: normal | minimal | checkin_only
  estimation: { planned, completed }   … 見積もり/実績の差分（表示せず保存のみ）
users/{uid}/weeklyReviews/{yyyy-Www} … summary, stuckPatterns[], adjustments[]
```

### 主要フロー

- **オンボーディング**: AIスタイル選択 → 対話で理想像を言語化（3〜5往復）→ Haiku が理想像・習慣・開始条件・最低ラインを抽出して保存
- **朝**: WOOP 段階拡張（Day1-7: WO / 8-30: WOO / 31-: WOOP）→ 対話の最後に Haiku がタスク抽出。前夜の「最初の1タスク」が必ず先頭
- **夜**: 会話で振り返り → Haiku が3スコア算出＋「明日の最初の1タスク」を抽出（決まっていないと完了できない）
- **週次**: 直近7日を Sonnet が観察（完了率・詰まりパターン・調整提案の3点のみ）
- 朝夜の対話はメッセージごとに Firestore へ永続化（途中離脱しても再開できる）

## 本番デプロイ（Vercel + Firebase）

- **フロント**: Vercel（`dist/`、`vercel.json` で SPA ルーティング）
- **バックエンド**: Firebase 本番（Auth / Firestore / Cloud Functions）
- Cloud Functions から Gemini を呼ぶため Firebase **Blaze プラン**が必要
- Vercel では `VITE_USE_FIREBASE_EMULATOR=false` と `VITE_FIREBASE_*` を設定
- Authentication で「**匿名**」プロバイダを有効化し、Vercel のドメインを承認ドメインに追加

手順の詳細: [docs/VERCEL_DEPLOY.md](docs/VERCEL_DEPLOY.md)

## 旧実装について

Next.js 版の旧実装は git 履歴（`snapshot: legacy Next.js implementation` コミット）に保存されている。
`docs/` 配下の企画資料（SPEC / BUSINESS_MODEL / PRODUCTION）は旧実装時代のもの。