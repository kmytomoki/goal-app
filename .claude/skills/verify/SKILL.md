---
name: verify
description: goal-app をローカルで起動してブラウザで動作確認する手順(WSL / エミュレータ / Playwright)
---

# goal-app の動作確認レシピ

## 起動

```bash
export PATH="/usr/local/n/versions/node/22.14.0/bin:$PATH"   # node は PATH に無い
npm run emulators   # Firebase エミュレータ(起動に1〜2分。Auth:9099 / Firestore:8088 / Functions:5001 / UI:4000)
npm run dev         # Vite (5173)。.env.local の VITE_USE_FIREBASE_EMULATOR=true で自動的にエミュレータ接続
```

- 初回 `vite build` が `rollup/dist/native.js MODULE_NOT_FOUND` で落ちたら
  `npm install --no-save @rollup/rollup-linux-x64-gnu`(npm optional deps の既知バグ)。
- **重要: Vite は /mnt/c のファイル変更を検知できない**(DrvFS に inotify が無い)。
  ソースを編集したら dev サーバーを再起動しないと古いモジュールが配信され続ける。

## ブラウザ操作(ヘッドレス)

- Playwright はスクラッチパッドに `npm install playwright` + `npx playwright install chromium`。
- root が無いので `--with-deps` は不可。`libgbm.so.1` 欠落は
  `apt-get download libgbm1 libwayland-server0` → `dpkg -x` でローカル展開し
  `LD_LIBRARY_PATH` で渡す。
- コンテキストは `viewport 390x844, timezoneId "Asia/Tokyo", locale "ja-JP"`。

## テストデータ

- 認証は匿名(Welcome の「はじめる」ボタン)。
- オンボーディングは AI 不要の経路がある: 「タップで決める(仮でOK)」→ アーキタイプ選択 →「この内容で始める」。
  これで Home(AppShell 配下)まで UI だけで到達できる。
- クリーンな状態にするにはエミュレータ REST で全削除:
  - `DELETE http://127.0.0.1:9099/emulator/v1/projects/demo-goal-app/accounts`(要 `Authorization: Bearer owner`)
  - `DELETE http://127.0.0.1:8088/emulator/v1/projects/demo-goal-app/databases/(default)/documents`

## 確認する主要フロー

1. Welcome → 匿名サインイン → オンボーディング(タップ経路)→ Home
2. FAB「+」→ クイック追加(今日/明日チップ・P1〜P4・最初の一歩トグル)
3. TaskItem: 丸チェックのタップでトグル / 右スワイプ完了 / 左スワイプ削除+Undo トースト / テキストタップでインライン編集
4. 「詳細」→ TaskDetailSheet(優先度・日付移動・削除)
5. 予定タブ(/upcoming)に日付セクション表示、日付移動したタスクが現れる
6. 「今日は休む」→ ConfirmDialog →「今日は休む日」表示

## AI 対話(chat / assist)の検証

- functions は事前ビルドが必要: `npm --prefix functions run build`(エミュレータは `lib/` を実行する。/mnt/c では変更検知されないのでビルド+エミュレータ再起動)。
- **シークレットは `functions/.secret.local`**(`GEMINI_API_KEY=...`)。`defineSecret` は `.env.local` を見ず、無いと本番 Secret Manager へ 401 で失敗し、chat が「AIの応答に失敗しました」を返す。
- chat 単体テスト: 匿名 signUp で idToken を取得し、`POST http://127.0.0.1:5001/demo-goal-app/us-central1/chat` に `Authorization: Bearer <idToken>` + `{mode, messages, context}` → SSE の `data: {"text":...}` を確認。
- assist 単体テスト: 同トークンで `POST .../assist` に callable 形式 `{"data":{"task":"extract_tasks","payload":{...}}}`。
- 失敗時の原因は emulators ログの `chat stream failed` に出る。モデル提供終了(404)の場合は
  `GET https://generativelanguage.googleapis.com/v1beta/models?key=...` で利用可能モデルを確認して `functions/src/gemini.ts` を更新。

## 注意

- Firestore エミュレータは `orderBy(documentId(), "desc")` 非対応
  ("descending key scans" エラー)。日次ログの降順は `date` フィールドで並べる。
- swipe をマウスで再現する際は pointerdown → move(steps数回)→ up。行には select-none 済み。
