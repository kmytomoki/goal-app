# 仕様書 — 理想の自分（目標管理アプリ）

> この文書は開発完了まで参照・更新し続ける「生きた仕様書」です。
> 変更があったら該当セクションと「実装ステータス」表を更新してください。
>
> - 最終更新: 2026-07-02
> - 対象バージョン: MVP（v1）
> - リポジトリ: `goal-app/`

---

## 1. 概要 / コンセプト

学生・社会人向けの目標管理アプリ。AIとの対話を主軸に目標設定を完結させる。
「ラベリング効果」を活用し、ユーザーを“理想の自分”として扱うことで、未来の自己像と日々の行動を接続する。

### 目標の4層構造

```
5年後の理想像  →  3ヶ月目標  →  週次ゴール  →  毎日の行動
   (goals:          (goals:        (goals:         (dailyTasks)
    vision_5y)       goal_3m)       weekly)
```

- `goals` は **週次(weekly)まで**を階層で保持。
- 「毎日の行動」は `dailyTasks` に**一本化**（`goals` に daily 層は作らない）。

---

## 2. スコープ

### MVP（v1）で実装する機能

1. オンボーディング / 理想の自分設定
2. 朝のWOOPダイアログ
3. 1日の目標設定とバッファ調整（70%ルール）
4. 夜の振り返り + 自動スコアリング

### v2 以降（今回は実装しない。ただしデータは今から取得）

- バッファ率の**個人最適化**（`dailyTasks.bufferHistory` と 見積もり vs 実績データを活用）
- WOOP の**段階的導入**（MVPは毎回フルWOOP）
- 目標（goals）の編集・進捗管理UIの拡充
- 通知・リマインド

---

## 3. 技術スタック

| 区分 | 採用 |
| --- | --- |
| フロントエンド | Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 |
| バックエンド | Firebase (Firestore, Authentication) |
| AI | Anthropic API (Claude) |
| ホスティング想定 | Vercel |
| ローカル開発DB | Firebase Emulator Suite（課金不要） |

- React 19 / Turbopack。
- パッケージ: `firebase`, `firebase-admin`, `@anthropic-ai/sdk`。

---

## 4. AIモデルの方針（コスト最適化）

用途で住み分ける。定義は `src/lib/ai/models.ts` に集約し、各呼び出しに `max_tokens` と想定コストをコメントで明記する。

| 用途 | モデル | max_tokens | 想定コスト目安 |
| --- | --- | --- | --- |
| 対話（オンボーディング / 朝WOOP / 夜振り返り） | `claude-sonnet-4-6` | 1024 | 1往復 ~$0.01–0.03 |
| 分類（絶対やる / できたらやる） | `claude-haiku-4-5-20251001` | 512 | 1回 <$0.001 |
| 70%調整（コスト優先で柔軟に） | `claude-haiku-4-5-20251001` | 768 | 1回 ~$0.001 |
| 夜のスコア要約 | `claude-haiku-4-5-20251001` | 512 | 1回 ~$0.001 |

### ルール

- **APIキーは環境変数管理・ハードコード禁止**。
- AI呼び出しは**すべてサーバー側**（`src/app/api/*`）で実行し、キーをクライアントへ露出させない。
- 単価はリリース時点で最新料金を再確認する（コスト注記の更新）。
- スコアの**数値計算はサーバー側**で行い、AIには要約生成のみ任せる（再現性・コスト削減）。

---

## 5. アーキテクチャ / ディレクトリ構成

```
goal-app/
├── src/
│   ├── app/
│   │   ├── layout.tsx                # AuthProvider でラップ
│   │   ├── page.tsx                  # ルート：認証/オンボ状態で振り分け
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx        # メール + Google
│   │   │   └── signup/page.tsx
│   │   ├── onboarding/               # 機能1
│   │   │   ├── page.tsx              # phase: style→mode→dialogue|form
│   │   │   └── components/
│   │   │       ├── StyleSelector.tsx
│   │   │       ├── OnboardingChat.tsx
│   │   │       └── OnboardingForm.tsx
│   │   ├── today/
│   │   │   ├── page.tsx              # 日常ホーム（Day1/再訪/空状態）
│   │   │   ├── morning/page.tsx      # 機能2 + 機能3
│   │   │   └── night/page.tsx        # 機能4
│   │   ├── history/page.tsx          # スコア履歴
│   │   ├── settings/page.tsx         # TZ / リセット時刻 / AIスタイル
│   │   └── api/
│   │       ├── chat/route.ts         # 対話ストリーミング(Sonnet)
│   │       ├── classify/route.ts     # 分類(Haiku)
│   │       ├── adjust/route.ts       # 70%調整(Haiku)
│   │       └── score/route.ts        # スコアリング(計算+Haiku要約)
│   ├── components/                   # ChatWindow / ChatBubble / EmptyState / Spinner / AppShell
│   ├── hooks/useConversation.ts      # 対話の状態管理（永続化+ストリーミング+中断/再開）
│   ├── lib/
│   │   ├── ai/                       # models / prompts / client / retry / complete
│   │   ├── api/                      # client(認証付きfetch) / auth(ルート認証)
│   │   ├── auth/AuthContext.tsx      # 認証コンテキスト
│   │   ├── db/                       # users / goals / dailyTasks / reflections / conversations
│   │   ├── firebase/                 # client / admin / paths
│   │   └── time/dayBoundary.ts       # TZ + リセット時刻ロジック
│   └── types/index.ts                # データモデル型定義
├── firestore.rules                   # セキュリティルール
├── firestore.indexes.json            # 複合インデックス
├── firebase.json                     # ルール/インデックス/エミュレータ設定
├── .firebaserc                       # 既定プロジェクト(demo-goal-app)
├── .env.example                      # 環境変数テンプレート
└── docs/SPEC.md                      # 本書
```

### 設計上の原則

- AI呼び出しはサーバー(`app/api/*`)に集約 → キー秘匿。
- Firebase クライアント/Admin ともに**遅延初期化**（プリレンダー時に落ちないため）。
- Firestore アクセスはクライアント側は `lib/db/*`、サーバー側（Admin）はトークン検証のみ。

---

## 6. データモデル（Firestore）

トップレベル `users/{uid}` の下にサブコレクションをぶら下げる。型定義は `src/types/index.ts` が正。

### 6.1 `users/{uid}`

| フィールド | 型 | 説明 |
| --- | --- | --- |
| uid | string | ユーザーID |
| email | string | メール |
| displayName | string? | 表示名 |
| timezone | string | IANA 例 `Asia/Tokyo` |
| dayResetHour | number | 1日の境界時刻 0-23（例 4=朝4時） |
| aiStyle | `future_self` \| `coach` | 選択したAIスタイル |
| onboardingCompleted | boolean | オンボ完了フラグ |
| createdAt / updatedAt | Timestamp | |

### 6.2 `users/{uid}/goals/{goalId}`

| フィールド | 型 | 説明 |
| --- | --- | --- |
| id | string | |
| layer | `vision_5y` \| `goal_3m` \| `weekly` | 階層 |
| title | string | |
| description | string? | |
| parentId | string \| null | 上位層への参照（vision_5yはnull） |
| status | `active` \| `done` \| `archived` | |
| periodStart / periodEnd | Timestamp? | 週次/3ヶ月の対象期間 |
| source | `dialogue` \| `form` | 由来 |
| createdAt / updatedAt | Timestamp | |

### 6.3 `users/{uid}/dailyTasks/{taskId}`

★ **見積もり量・AI調整後の量・実績量をすべて保存**（v2のバッファ最適化用）。

| フィールド | 型 | 説明 |
| --- | --- | --- |
| id | string | |
| date | string | 論理日付 `YYYY-MM-DD`（境界基準） |
| title | string | |
| category | `must` \| `optional` | 絶対やる / できたらやる |
| estimatedAmount | number | **ユーザー見積もり量** |
| adjustedAmount | number | **AI調整後(70%)の量** |
| actualAmount | number \| null | **実績量**（夜に記録） |
| unit | string? | 単位（ページ/分など） |
| bufferHistory | BufferAdjustment[] | 調整履歴（下記） |
| completed | boolean | |
| goalId | string? | 紐づく上位ゴール |
| source | `dialogue` \| `form` | |
| createdAt / updatedAt | Timestamp | |

`BufferAdjustment`: `{ at: Timestamp, before: number, after: number, ratio: number, reason: string }`

### 6.4 `users/{uid}/reflections/{reflectionId}`

| フィールド | 型 | 説明 |
| --- | --- | --- |
| id | string | |
| date | string | 論理日付 |
| score | number | 自動スコア 0-100 |
| achievementRateAdjusted | number | 調整後ベース達成率 0-1 = Σactual/Σadjusted |
| achievementRateEstimated | number | **見積もりベース達成率 0-1（併記）** = Σactual/Σestimated |
| summary | string | AI要約 |
| taskResults | TaskResult[] | 見積もりvs実績（下記） |
| conversationId | string | 元の夜の対話 |
| createdAt | Timestamp | |

`TaskResult`: `{ taskId, title, estimatedAmount, adjustedAmount, actualAmount }`

### 6.5 `users/{uid}/conversations/{conversationId}`

★ マルチターン対話の履歴 + 中断/再開状態。

| フィールド | 型 | 説明 |
| --- | --- | --- |
| id | string | |
| type | `onboarding` \| `morning_woop` \| `night_reflection` | |
| status | `in_progress` \| `completed` \| `abandoned` | 中断/再開判定に使用 |
| aiStyle | `future_self` \| `coach` | |
| date | string? | 朝/夜の対話が紐づく論理日付 |
| currentStep | string? | 再開位置（WOOPステップ等） |
| messages | ChatMessage[] | 会話履歴（配列保持） |
| draft | object? | 未確定の入力（失敗時保持） |
| createdAt / updatedAt | Timestamp | |

`ChatMessage`: `{ role: "user"|"assistant", content: string, createdAt: Timestamp }`

### 6.6 インデックス（`firestore.indexes.json`）

- `dailyTasks`: `date ASC, createdAt ASC`
- `goals`: `layer ASC, createdAt ASC`
- `conversations`: `type ASC, status ASC, updatedAt DESC`
- `conversations`: `type ASC, status ASC, date ASC, updatedAt DESC`

---

## 7. 機能仕様

### 7.1 機能1: オンボーディング / 理想の自分設定

**目的**: 5年後の理想像をヒアリングし、3ヶ月目標（可能なら週次）まで落とし込む。

**フロー（`/onboarding`, phase 制御）**
1. `style`: AIスタイル選択（未来の自分 / コーチ）→ `users.aiStyle` 保存
2. `mode`: 「AIと対話」か「フォーム入力」を選択
3a. `dialogue`: `useConversation(type=onboarding)` で対話。「保存へ進む」で確認へ
3b. `form`: 各層を直接入力
4. 確認フォームで確定 → `goals` に階層作成（vision_5y→goal_3m→weekly、parentIdで連結）→ `onboardingCompleted=true` → `/today`

**AIスタイル**: `future_self`（理想の自分が語る口調）/ `coach`（伴走者の口調）。`src/lib/ai/prompts.ts` でシステムプロンプトを切替。

**要件**
- 対話だけで完結が基本。フォーム入力も任意で選べる。
- 由来を `source`（dialogue/form）で保存。

### 7.2 機能2: 朝のWOOPダイアログ

**目的**: Wish / Outcome / Obstacle / Plan の4ステップで今日の行動目標を設定。

- `/today/morning` の stage `woop`。`useConversation(type=morning_woop)`。
- **MVPでは毎回フルWOOPを実施**（段階的導入はv2）。
- 「WOOP完了 → 今日の目標を設定する」で機能3へ。

### 7.3 機能3: 1日の目標設定とバッファ調整

**目的**: 今日やりたいことを現実的な量に調整して確定。

**フロー（`/today/morning` の stage `input`→`review`→保存）**
1. `input`: タスク（title / estimatedAmount / unit）を複数入力
2. 「AIに調整してもらう」→ `/api/adjust`(70%) と `/api/classify`(分類) を**並行実行**
3. `review`: **A案（明示）**で調整を提示（例「今日は少し余裕を持たせて…」＝`message`）。各タスクに調整後量・理由・カテゴリ表示
4. 確定 → `dailyTasks` 作成
   - `estimatedAmount`（見積もり）と `adjustedAmount`（調整後）を**両方保存**
   - `bufferHistory` に調整1件を記録
   - `actualAmount=null`

**要件**
- 70%ルールは基本0.7、タスク性質で0.6〜0.8で柔軟に。
- 「絶対やる」は**最大3つ**（超過分はサーバー側でoptionalへ丸め）。分類はHaiku。

### 7.4 機能4: 夜の振り返り + 自動スコアリング

**目的**: 達成状況を対話で振り返り、達成率を自動スコア化して履歴保存。

**フロー（`/today/night` の stage `reflect`→`record`→保存）**
1. `reflect`: `useConversation(type=night_reflection)` で振り返り対話
2. `record`: 各タスクの**実績量(actualAmount)**を入力
3. 確定 → 実績を `dailyTasks` に保存 → `/api/score` 呼び出し → `reflections` 作成 → `/today`

**スコア定義（`/api/score` がサーバー側計算）**
- 調整後ベース達成率 = `min(Σactual / Σadjusted, 1)`
- 見積もりベース達成率 = `min(Σactual / Σestimated, 1)`（**併記**）
- `score` = 調整後ベース達成率 × 100（四捨五入、上限100）
- `summary` はHaikuで生成（失敗時はフォールバック文言、スコアは返す）

**要件**
- **実際の達成量を記録**（見積もりvs実績の比較用）。
- バッファ率の個人最適化はv2。今回はデータのみ残す。

---

## 8. 横断的な実装要件

### 8.1 対話の状態管理（`hooks/useConversation.ts`）
- 会話履歴を `conversations` に永続化し、API呼び出し時に文脈として渡す。
- `status=in_progress` を `findResumableConversation` で探索し、**中断・再開**可能。
- 各対話の最初のAIあいさつはコスト節約のため固定文（以降はAI応答）。

### 8.2 AI呼び出しのエラー処理（`lib/ai/retry.ts`）
- タイムアウト / レート制限(429) / 5xx を対象に**指数バックオフで最大3回**リトライ（ジッター付き）。
- 失敗時も**入力済み内容を保持**し、UIの「再試行」ボタンで最初からやり直させない。

### 8.3 ストリーミング表示
- `/api/chat` がテキストチャンクを逐次送出（`text/plain` ストリーム）。
- `lib/api/client.ts#streamChat` が `onDelta` で受信、`ChatWindow` がカーソル付きで1文字ずつ表示。
- ストリーム途中エラーは `[[STREAM_ERROR]]` マーカーで通知。

### 8.4 1日の境界（`lib/time/dayBoundary.ts`）
- ユーザーごとに `timezone` と `dayResetHour` を保持。
- `getLogicalDate(now, tz, resetHour)`: 現地時刻が resetHour 未満なら前日に繰り下げ、論理日付 `YYYY-MM-DD` を返す。
- 「朝/夜」対話・スコア集計はこの論理日付を基準にする。
- `getDayPhase` で morning/day/night をUI出し分けに使用。

### 8.5 画面遷移と状態の出し分け
- オンボ完了後 `/today` へ自然遷移。`AppShell` が未ログイン→`/login`、オンボ未完了→`/onboarding` を強制。
- `/today` で **Day1（初回）/ 再訪 / 空状態** を出し分け（履歴有無・当日タスク有無で判定）。

---

## 9. 画面 / ルーティング

| パス | 画面 | 認証 | 備考 |
| --- | --- | --- | --- |
| `/` | 振り分け | - | 状態でリダイレクト |
| `/login` | ログイン | 不要 | メール + Google |
| `/signup` | 新規登録 | 不要 | メール + Google |
| `/onboarding` | オンボーディング | 要 | 機能1 |
| `/today` | 日常ホーム | 要 | 当日状況 |
| `/today/morning` | 朝WOOP+目標設定 | 要 | 機能2+3 |
| `/today/night` | 夜の振り返り | 要 | 機能4 |
| `/history` | スコア履歴 | 要 | |
| `/settings` | 設定 | 要 | TZ/リセット時刻/AIスタイル |

---

## 10. API 仕様（`src/app/api/*`）

すべて `POST` / `runtime = nodejs`。`Authorization: Bearer <FirebaseIDトークン>` 必須（`requireUid` で検証、失敗時401）。

### `POST /api/chat`（対話ストリーミング / Sonnet）
- req: `{ type, aiStyle, messages: {role,content}[], context? }`
- res: `text/plain` ストリーム（チャンク列）。エラー時 429/502 とJSON。

### `POST /api/classify`（分類 / Haiku）
- req: `{ tasks: string[] }`
- res: `{ items: { title, category: "must"|"optional" }[] }`（must最大3）

### `POST /api/adjust`（70%調整 / Haiku）
- req: `{ items: { title, estimatedAmount, unit? }[] }`
- res: `{ items: { title, estimatedAmount, adjustedAmount, ratio, reason }[], message }`

### `POST /api/score`（スコアリング / 計算 + Haiku要約）
- req: `{ taskResults: TaskResult[], conversation?: {role,content}[] }`
- res: `{ score, achievementRateAdjusted, achievementRateEstimated, summary }`

---

## 11. 認証・セキュリティ

- Firebase Auth（**メール/パスワード + Google**）。
- セキュリティルール（`firestore.rules`）: 各ユーザーは `users/{uid}` 配下の自分のデータのみ read/write 可。`users` の delete はクライアント禁止（Admin経由のみ）。
- IDトークンをAPIへ Bearer で渡し、Admin SDK で検証。

---

## 12. 環境変数（`.env.example` 参照）

| 変数 | 用途 | 公開 |
| --- | --- | --- |
| GEMINI_API_KEY | AI（サーバー側のみ） | ✗ 秘密 |
| NEXT_PUBLIC_FIREBASE_* | Firebase Web設定 | ○ 公開可 |
| FIREBASE_ADMIN_PROJECT_ID / CLIENT_EMAIL / PRIVATE_KEY | Admin SDK | ✗ 秘密 |
| NEXT_PUBLIC_USE_FIREBASE_EMULATOR | エミュレータ利用フラグ | ○ |
| FIRESTORE_EMULATOR_HOST | 例 `127.0.0.1:8088` | ○ |
| FIREBASE_AUTH_EMULATOR_HOST | 例 `127.0.0.1:9099` | ○ |

- `NEXT_PUBLIC_*` はビルド時に埋め込まれるため、変更後は **dev サーバー再起動**が必要。

---

## 13. ローカル開発（エミュレータ）

課金不要でローカル完結。

### 前提
- Node.js / npm、**JDK 11以上**（エミュレータに必須。現状 Temurin 25 で動作確認）。

### 手順
1. `.env.local` に以下を設定（Firebase実値はエミュレータ時は未使用。Anthropicキーのみ実値必要）
   ```
   NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true
   FIRESTORE_EMULATOR_HOST=127.0.0.1:8088
   FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
   GEMINI_API_KEY=<実キー>
   ```
2. ターミナル①: `npm run emulators`（Auth:9099 / Firestore:8088 / UI:4000。demo-goal-app でオフライン起動）
3. ターミナル②: `npm run dev`
4. ブラウザで **`http://127.0.0.1:3000`** を開く

### エミュレータ利用時の注意（重要）
- **必ず `127.0.0.1:3000` でアクセス**する（`localhost` だと Auth エミュレータ(127.0.0.1)とオリジン不一致で Google ポップアップが `No matching frame` で失敗する）。
- Google ログインはエミュレータの擬似ログイン画面。メール+パスワード登録でも可。
- エミュレータ停止でデータは消える（開発用）。必要なら export/import 設定を追加。
- Firestore は 8080 が Windows のサービスに占有されていたため **8088** に変更済み。

### 本番接続時
- `NEXT_PUBLIC_USE_FIREBASE_EMULATOR=false` にし、実 Firebase の値を設定。
- Firestore データベース作成には Blaze プランが必要な場合あり（無料枠内で運用可）。
- ルール/インデックスのデプロイ: `firebase deploy --only firestore:rules,firestore:indexes`

---

## 14. 実装ステータス

| 項目 | 状態 | 備考 |
| --- | --- | --- |
| プロジェクト雛形 / 依存 | ✅ 完了 | Next.js 16 + Tailwind + firebase/admin/anthropic |
| 型定義（データモデル） | ✅ 完了 | `types/index.ts` |
| Firebase client/admin/paths | ✅ 完了 | 遅延初期化・エミュレータ対応 |
| AI層 models/prompts/client/retry/complete | ✅ 完了 | |
| 1日の境界ロジック | ✅ 完了 | `lib/time/dayBoundary.ts` |
| DB CRUD（5コレクション） | ✅ 完了 | `lib/db/*` |
| API（chat/classify/adjust/score） | ✅ 完了 | 認証・リトライ込み |
| 認証（Context/hooks） | ✅ 完了 | Email + Google |
| 対話フック（永続化/再開/ストリーム） | ✅ 完了 | `useConversation` |
| 機能1 オンボーディング | ✅ 完了 | 対話 + フォーム + スタイル選択 |
| 機能2 朝WOOP | ✅ 完了 | フルWOOP |
| 機能3 目標設定+70%調整 | ✅ 完了 | 見積/調整後 両保存 |
| 機能4 夜振り返り+スコア | ✅ 完了 | 実績記録・二種達成率 |
| 履歴 / 設定 | ✅ 完了 | |
| firestore.rules / indexes | ✅ 完了 | エミュレータで許可/拒否を検証済 |
| ローカル起動（エミュレータ） | ✅ 動作確認済 | 127.0.0.1 でアクセス必須 |
| 型チェック / Lint / ビルド | ✅ 通過 | |
| デザイン適用 | ✅ 完了 | indigo基調・共通クラス(btn/card/input)を globals.css に定義 |
| エラー時UX（トースト） | ✅ 完了 | `components/Toast.tsx`（保存成功/失敗を通知） |
| goals 表示の最小UI | ✅ 完了 | `/today` に4層の目標カードを表示（編集はv2） |
| 本番 Firebase 接続 / デプロイ | ⬜ 未着手 | Blaze要否・Vercel（ユーザーのアカウント作業が必要） |
| E2E動作確認（全フロー通し） | ✅ API/認証/ルール確認済 | API4本(chat/classify/adjust/score)・401検証・全ルート200・ルール許可/拒否をエミュレータで確認。ブラウザ通し操作は手動確認を推奨 |

凡例: ✅完了 / 🚧進行中 / ⬜未着手

---

## 15. 既知の課題 / 注意点

- **エミュレータは `127.0.0.1:3000` でアクセス必須**（localhost だと Google ポップアップが失敗）。
- **Windows のユーザー環境変数 `GEMINI_API_KEY` が `.env.local` を上書きしうる**（既存の process 環境変数が優先される）。AI呼び出しが 401 になる場合はユーザー環境変数を確認する。
- エミュレータデータは揮発。永続化するなら `emulators:start --import/--export-on-exit` を追加。
- 対話の最初のあいさつは固定文（コスト削減）。AI生成にしたい場合は要変更。
- goals の編集UIは未実装（オンボ時の作成のみ）。
- AIコスト単価は要再確認（`models.ts` の注記更新）。

---

## 16. 残タスク / ロードマップ

### v1 完成までの残タスク
- [x] 全機能の通し動作確認（API・認証・ルール・全ルートをエミュレータで確認。ブラウザでの手動通し確認を推奨）
- [ ] 本番 Firebase プロジェクト作成・環境変数設定・ルール/インデックスデプロイ
- [ ] Vercel デプロイ（環境変数設定、`USE_FIREBASE_EMULATOR=false`）
- [x] UIデザイン適用（indigo基調の共通デザインクラスを適用）
- [x] エラー時UX微調整（トースト通知を追加）
- [x] goals 表示の最小UI（`/today` に目標カード。編集UIはv2）

### v2 バックログ
- [ ] バッファ率の個人最適化（蓄積した bufferHistory / 見積vs実績を分析）
- [ ] WOOP 段階的導入
- [ ] 通知・リマインド
- [ ] 週次/3ヶ月の進捗ダッシュボード

---

## 17. 変更履歴

| 日付 | 変更 |
| --- | --- |
| 2026-07-02 | 初版作成。MVP実装完了時点の内容を反映。 |
| 2026-07-02 | UIデザイン適用（indigo基調・共通クラス）、トースト通知追加、`/today` に目標カード追加。API/認証/ルールのE2E確認完了。ユーザー環境変数の APIキー上書き問題を既知の課題に追記。 |
