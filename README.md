# 理想の自分 — 目標管理アプリ (MVP)

AIとの対話を主軸に目標設定を完結させる目標管理アプリ。
「ラベリング効果」を活用し、ユーザーを“理想の自分”として扱うことで、未来の自己像と日々の行動を接続する。

## コンセプト / 目標の4層構造

```
5年後の理想像  →  3ヶ月目標  →  週次ゴール  →  毎日の行動
(goals)          (goals)        (goals)        (dailyTasks)
```

## 技術スタック

- フロントエンド: Next.js (App Router) + TypeScript + Tailwind CSS
- バックエンド: Firebase (Firestore, Authentication)
- AI: Anthropic API (Claude)
- ホスティング想定: Vercel

## AIモデルの方針（コスト最適化）

| 用途 | モデル | max_tokens | 想定コスト目安 |
| --- | --- | --- | --- |
| 対話（オンボーディング/朝WOOP/夜振り返り） | `claude-sonnet-4-6` | 1024 | 1往復 ~$0.01–0.03 |
| 分類（絶対やる/できたらやる） | `claude-haiku-4-5-20251001` | 512 | 1回 <$0.001 |
| 70%調整（コスト優先） | `claude-haiku-4-5-20251001` | 768 | 1回 ~$0.001 |
| 夜のスコア要約 | `claude-haiku-4-5-20251001` | 512 | 1回 ~$0.001 |

- APIキーは環境変数で管理（ハードコード禁止）。AI呼び出しは全てサーバー側 (`src/app/api/*`)。
- 単価はリリース時点で最新料金を再確認すること（`src/lib/ai/models.ts` にコスト注記）。

## MVP機能

1. **オンボーディング / 理想の自分設定** — AI対話 or フォームで5年後→3ヶ月目標を設定。AIスタイル（未来の自分 / コーチ）を選択。
2. **朝のWOOPダイアログ** — Wish/Outcome/Obstacle/Plan の4ステップ。MVPは毎回フルWOOP。
3. **1日の目標設定とバッファ調整** — 70%ルールをA案（明示）で適用。Haikuで「絶対やる/できたらやる」分類。**見積もり量とAI調整後の量を両方保存**。
4. **夜の振り返り + 自動スコアリング** — 達成率を自動スコア化。**実績量も記録**（見積もりvs実績の比較用）。

### 横断要件

- 会話履歴を Firestore に保持し API 呼び出しの文脈として渡す。対話は中断・再開可能。
- AI呼び出しは指数バックオフで最大3回リトライ。失敗時も入力内容を保持して再試行（最初からやり直させない）。
- 応答はストリーミングで逐次表示。
- ユーザーごとに TZ と「1日のリセット時刻」を持ち、論理日付を基準に朝/夜・スコア集計を行う。
- Day1 / Day2以降 / 空状態を出し分け。

## ディレクトリ構成

```
src/
├── app/
│   ├── (auth)/login, signup        # 認証画面（メール + Google）
│   ├── onboarding/                 # 機能1
│   ├── today/                      # 日常ホーム
│   │   ├── morning/                # 機能2 + 機能3
│   │   └── night/                  # 機能4
│   ├── goals/                      # 目標レビュー
│   ├── history/                    # スコア履歴
│   ├── settings/                   # TZ/リセット時刻/AIスタイル
│   ├── terms/                      # 利用規約
│   ├── privacy/                    # プライバシーポリシー
│   └── api/                        # chat(SSE) / classify / adjust / score
├── components/                     # 共通UI（ChatWindow 等）
├── hooks/useConversation.ts        # 対話の状態管理（永続化+ストリーミング+再開）
├── lib/
│   ├── ai/                         # models / prompts / client / retry / complete
│   ├── api/                        # 認証付きクライアント / ルート認証
│   ├── db/                         # Firestore CRUD（5コレクション）
│   ├── firebase/                   # client / admin / paths
│   └── time/dayBoundary.ts         # TZ + リセット時刻ロジック
└── types/index.ts                  # データモデル型定義
```

## Firestore データモデル

```
users/{uid}                         # TZ, リセット時刻, AIスタイル, onboarding完了
  goals/{goalId}                    # layer: vision_5y | goal_3m | weekly, parentId で階層
  dailyTasks/{taskId}               # estimatedAmount / adjustedAmount / actualAmount / bufferHistory
  reflections/{reflectionId}        # score, 達成率(調整後/見積もり), taskResults
  conversations/{conversationId}    # type, status, messages[], currentStep, draft（中断/再開）
```

> daily 層は `dailyTasks` に一本化（`goals` は weekly まで）。`conversations.messages` は配列保持。

## セットアップ

### 1. 依存インストール

```bash
npm install
```

### 2. 環境変数

`.env.example` をコピーして `.env.local` を作成し、値を設定する。

```bash
cp .env.example .env.local
```

- `ANTHROPIC_API_KEY` — Anthropic のAPIキー（サーバー側のみ）
- `NEXT_PUBLIC_FIREBASE_*` — Firebase コンソール > プロジェクト設定 > 全般 のWebアプリ設定
- `FIREBASE_ADMIN_*` — サービスアカウントJSON（Admin SDK 用）。`FIREBASE_ADMIN_PRIVATE_KEY` は改行を `\n` でエスケープして1行で貼り付け、ダブルクォートで囲む

### 3. Firebase 準備

- Authentication で「メール/パスワード」と「Google」を有効化
- Firestore を作成
- ルールとインデックスをデプロイ:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

### 4. 開発サーバー起動

```bash
npm run dev
```

http://localhost:3000 を開く。

## v2 で予定（今回は実装せずデータのみ取得）

- バッファ率の個人最適化（`dailyTasks.bufferHistory` と 見積もりvs実績データを活用）
- WOOPの段階的導入

## 運用ドキュメント

- 本番デプロイ手順: `docs/PRODUCTION.md`
- ビジネス仮説/KPI: `docs/BUSINESS_MODEL.md`
- 仕様書: `docs/SPEC.md`

## 注意

- UIは機能優先のシンプル実装（後でデザインを当てる前提）。
