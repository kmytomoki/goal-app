# Todoist PC版参考 — ワイド画面UI再設計計画

前回のモバイル向け改修（ライトテーマ / ボトムタブ + FAB / ボトムシート / Task拡張）は実装済み。
本計画はそれを土台に、**Todoist PC版（デスクトップWebアプリ）を参考へ切り替え、画面幅を広く使うレイアウト**に再設計する。
モバイル表示は現状のUI（ボトムタブ + ボトムシート）を維持し、`lg`（1024px）以上でデスクトップレイアウトへ切り替えるレスポンシブ構成とする。

## Todoist PC版から取り入れるレイアウト要素

- 左固定サイドバー（約280px）: 上部に「+ タスクを追加」、その下にビュー切替（今日 / 予定 / …）
- メインエリア: サイドバーの右側に広がり、コンテンツは中央寄せ（リスト系は最大 ~800px、複数カラムはそれ以上）
- クイック追加・タスク詳細は**画面中央のモーダルダイアログ**（モバイルのボトムシートに相当）
- ホバーで操作アイコンが現れるタスク行、キーボードショートカット（`q` でクイック追加）

## 現状の制約（変更対象）

- [src/components/AppShell.tsx](src/components/AppShell.tsx): シェル全体が `max-w-md`（448px）に固定。ボトムタブ + FAB のみ
- [src/App.tsx](src/App.tsx): `Morning` / `Evening` は AppShell 外のためサイドバーなし
- [src/components/QuickAddSheet.tsx](src/components/QuickAddSheet.tsx) / [src/components/TaskDetailSheet.tsx](src/components/TaskDetailSheet.tsx) / [src/components/ConfirmDialog.tsx](src/components/ConfirmDialog.tsx): 常にボトムシート/下寄せ表示
- 各ページ（Home / Upcoming / Weekly / Settings）: 1カラム前提の余白設計

## フェーズA: AppShellのレスポンシブ再構成（サイドバー化）

[src/components/AppShell.tsx](src/components/AppShell.tsx) を2レイアウト対応にする:

- `lg` 以上: 左に固定サイドバーを表示
  - 上段: 理想像タイトル + Day N（`useApp()` の `ideal` / `profile` から取得）
  - 「+ タスクを追加」ボタン（Todoistと同じ赤アイコン + テキスト。クリックでクイック追加モーダル）
  - ナビ: 今日（`/`）/ 予定（`/upcoming`）/ 振り返り（`/weekly`）/ 設定（`/settings`）。アクティブ項目は薄い赤背景（Todoistの選択状態）
- `lg` 未満: 現行のボトムタブ + FAB をそのまま維持（`lg:hidden`）
- ルートの `max-w-md` を撤廃し、`lg` では `flex`（サイドバー + メイン）、メイン側に `min-w-0 flex-1` を設定
- メイン内コンテンツ幅は各ページ側で制御（下記フェーズB）
- `Morning` / `Evening` も AppShell 配下へ移動し（[src/App.tsx](src/App.tsx) のルート再編）、デスクトップではサイドバーを常時表示。モバイルでは現行どおりボトムタブ非表示のフロー画面のままにする（`showBottomNav` の判定は既存ロジックを流用）
- キーボードショートカット: `q` でクイック追加を開く、`Escape` で閉じる（AppShellの `keydown` リスナーで実装）

## フェーズB: 各ページのワイドレイアウト

すべて既存ページの responsive クラス追加が中心。ロジック変更なし。

- [src/pages/Home.tsx](src/pages/Home.tsx)（今日）
  - `lg`: 2カラムグリッド（`lg:grid lg:grid-cols-[1fr_360px] lg:gap-8 lg:max-w-5xl`）
  - 左カラム: ヘッダー + 「今日の最初の一歩」スポットライト + 今日の演目（タスクリスト）
  - 右カラム: スコア3指標 + 7日間チャート（サイドパネル化）
- [src/pages/Upcoming.tsx](src/pages/Upcoming.tsx)(予定)
  - `lg`: 日付セクションを複数カラムのボード風グリッドに（`lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:gap-6 lg:items-start lg:max-w-6xl`）。Todoist PC版の「今後」ボードレイアウトに相当
  - モバイルは現行の縦積みリストのまま
- [src/pages/Morning.tsx](src/pages/Morning.tsx) / [src/pages/Evening.tsx](src/pages/Evening.tsx)（AI対話）
  - チャットカラムを `lg:max-w-2xl lg:mx-auto` で中央寄せし、行長を読みやすく保つ
  - Evening の「サッと終える」セクションは `lg` でチャット右横のサイドパネル（`lg:grid-cols-[1fr_320px]`）に移動
- [src/pages/Weekly.tsx](src/pages/Weekly.tsx) / [src/pages/Settings.tsx](src/pages/Settings.tsx)
  - `lg:max-w-2xl lg:mx-auto` の中央寄せ。Weekly の統計カードとAIレビューカードは `lg:grid-cols-2` で並べる
- [src/pages/Welcome.tsx](src/pages/Welcome.tsx) / [src/pages/Onboarding.tsx](src/pages/Onboarding.tsx)
  - Welcome: `lg` で左右2カラムのヒーロー（左=コピー、右=開始ボタンカード）
  - Onboarding のアーキタイプ一覧: `lg:grid-cols-2` のカードグリッド

## フェーズC: シート類のモーダル化（デスクトップ）

3コンポーネント共通で「モバイル=ボトムシート / デスクトップ=中央モーダル」に切り替える。CSSクラスの出し分けのみで対応:

- [src/components/QuickAddSheet.tsx](src/components/QuickAddSheet.tsx): `lg` では画面中央 `max-w-xl` の角丸ダイアログ（Todoistのクイック追加ウィンドウ相当）。開いたら入力に自動フォーカス、`Enter`（IME確定除く）で追加
- [src/components/TaskDetailSheet.tsx](src/components/TaskDetailSheet.tsx): 同様に中央 `max-w-xl` モーダル化
- [src/components/ConfirmDialog.tsx](src/components/ConfirmDialog.tsx): 既に `items-end` の下寄せなので `lg:items-center` を追加するだけ
- 共通の配置クラス（例: `sheet-or-modal`）を [src/index.css](src/index.css) に定義して重複を避けてもよい（任意）

## フェーズD: デスクトップ操作性（ホバー / ポインタ前提のUX）

[src/components/TaskList.tsx](src/components/TaskList.tsx) の調整:

- 「詳細」テキストと優先度ドットは、`lg` ではホバー時のみ表示（`lg:opacity-0 lg:group-hover:opacity-100`、行に `group` を付与）。Todoistの行ホバーで編集アイコンが出る挙動に相当
- スワイプ操作（右=完了 / 左=削除）はタッチ環境専用の位置づけとし、デスクトップではチェックボックスクリック + ホバーアイコンを主動線にする（ポインタイベント実装は共通なので変更不要）
- タスク行の背景ホバー（`lg:hover:bg-[var(--color-bg-muted)]`）を追加
- Undoトースト・チェックアニメーションは共通のまま

## 実施順序と検証

1. フェーズA（AppShell + ルート再編）→ `npm run dev` をブラウザ幅1280pxで確認
2. フェーズB（ページ別レイアウト）→ 今日 / 予定 / 対話 / 振り返り / 設定を順に確認
3. フェーズC(モーダル化) → クイック追加・詳細・確認の3つをデスクトップ/モバイル両幅で確認
4. フェーズD（ホバーUX）→ マウス操作での一連のタスク操作を確認

- データモデル・Firestore・AI関数への変更は**なし**（純粋にUI層のみ）
- モバイル表示のリグレッションがないこと（375px幅）を各フェーズで確認する
