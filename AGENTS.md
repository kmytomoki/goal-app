# goal-app エージェント向けメモ

- スタック: React 19 + Vite 7 + Tailwind CSS v4（`@tailwindcss/vite` プラグイン、`src/index.css` の `@theme` でトークン定義）+ Firebase（Auth/Firestore/Functions v2）+ Gemini API（`@google/genai`）
- AI 呼び出しはすべて `functions/src/`（Cloud Functions）経由。クライアントに API キーを置かない
- モデル: 対話 `gemini-3.5-flash`（SSE ストリーミング）、軽量タスク `gemini-3.1-flash-lite`（`responseJsonSchema` の JSON Schema 構造化出力）。gemini-2.5 系は新規ユーザー向け提供終了のため使用不可
- ローカルでシークレットを使うには `functions/.secret.local` に `GEMINI_API_KEY=...` が必要（`defineSecret` は `.env.local` を見ず、無いと本番 Secret Manager に 401 で失敗する）
- ローカル開発は Firebase エミュレータ（`npm run emulators`、demo-goal-app プロジェクト）。Java 17 環境のため firebase-tools は v14 に固定（v15 は Java 21 必須）
- WSL の /mnt/c はディスクが遅い: functions のコード検出タイムアウト対策で `FUNCTIONS_DISCOVERY_TIMEOUT=120` を npm script に設定済み
- 設計思想は README の「意志力に頼らない仕組み化」7原則を参照。UI は Todoist 風ライトテーマ（白背景×赤アクセント `#dc4c3e`、フォント: Zen Kaku Gothic New、優先度 P1〜P4 カラー）。ボトムタブ+FAB のナビ構成（`AppShell.tsx`）
