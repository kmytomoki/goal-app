# goal-app エージェント向けメモ

- スタック: React 19 + Vite 7 + Tailwind CSS v4（`@tailwindcss/vite` プラグイン、`src/index.css` の `@theme` でトークン定義）+ Firebase（Auth/Firestore/Functions v2）+ Gemini API（`@google/genai`）
- AI 呼び出しはすべて `functions/src/`（Cloud Functions）経由。クライアントに API キーを置かない
- モデル: 対話 `gemini-2.5-flash`（SSE ストリーミング）、軽量タスク `gemini-2.5-flash-lite`（`responseJsonSchema` の JSON Schema 構造化出力）
- ローカル開発は Firebase エミュレータ（`npm run emulators`、demo-goal-app プロジェクト）。Java 17 環境のため firebase-tools は v14 に固定（v15 は Java 21 必須）
- WSL の /mnt/c はディスクが遅い: functions のコード検出タイムアウト対策で `FUNCTIONS_DISCOVERY_TIMEOUT=120` を npm script に設定済み
- 設計思想は README の「意志力に頼らない仕組み化」7原則を参照。UI はダーク×ゴールドの「舞台」テーマ（見出し: Shippori Mincho / 本文: Zen Kaku Gothic New）
