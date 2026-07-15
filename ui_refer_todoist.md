---
name: Todoist風UI改善計画
overview: goal-app(ステージ)のUIを、Todoistを参考に「明るくクリーンなビジュアル」「ボトムタブ+クイック追加のナビゲーション」「優先度・期限つきのタスク管理UX」へ段階的に刷新する。
todos:
  - id: theme-tokens
    content: index.css / index.html をTodoist風ライトテーマのトークンに全面差し替え
    status: completed
  - id: theme-sweep
    content: 全ページ・コンポーネントの旧トークン(night/gold/ink/font-display)を新トークンへ置換
    status: completed
  - id: app-shell
    content: AppShell(ボトムタブバー+FAB)を新設しルーティングを再構成
    status: completed
  - id: quick-add
    content: QuickAddSheet(ボトムシート型クイック追加)を実装
    status: completed
  - id: task-item
    content: "TaskItem再設計: 丸チェックアニメーション・インライン編集・スワイプ操作・Undoトースト"
    status: completed
  - id: confirm-dialog
    content: window.confirmを共通確認ダイアログに置換
    status: completed
  - id: task-model
    content: Task型にid/priorityを追加し読み込み時デフォルト補完を実装
    status: completed
  - id: upcoming-view
    content: 「予定」タブ(/upcoming)と日付指定付きタスク追加を実装
    status: completed
  - id: task-detail
    content: タスク詳細ボトムシート(編集・優先度・日付移動・削除)を実装
    status: completed
isProject: false
---

# Todoist風UI改善計画

## 現状の把握

- React 19 + Vite + Tailwind v4、コンポーネントライブラリなし、モバイル1カラム(`max-w-md`)構成。
- テーマはダーク×ゴールドの「舞台」テーマ([src/index.css](goal-app/src/index.css))。ライトモードなし。
- ナビはHomeからのリンクのみ(サイドバー・タブバーなし)。モーダルは `window.confirm` のみ。
- タスクは `DailyLog.tasks` に埋め込まれた `Task { text, done, isFirstTask }`([src/lib/types.ts](goal-app/src/lib/types.ts))。ID・優先度・期限・プロジェクトなし。手動追加UIもなし(AI対話 or クイックスタートで生成)。

AI対話(朝・夜)というアプリの核は維持し、その周囲のタスク表示・操作・ナビゲーションをTodoist流に置き換える方針。

## フェーズ1: ビジュアル刷新(ライト×クリーンなテーマ)

[src/index.css](goal-app/src/index.css) の `@theme` トークンをTodoist風に全面差し替え:

- 背景: 白 `#ffffff` / サーフェス `#fafafa`、テキスト `#202020` / セカンダリ `#808080`、ヘアライン `#eeeeee`
- アクセント: Todoist系の赤 `#dc4c3e`(ブランド・主要ボタン・FAB)
- 優先度カラー: P1 `#d1453b` / P2 `#eb8909` / P3 `#246fe0` / P4 グレー(フェーズ4で使用)
- フォント: 明朝(Shippori Mincho)の見出しをやめ、Zen Kaku Gothic New に統一。[index.html](goal-app/index.html) のフォント読み込みと `theme-color` を更新
- `.spotlight` は「最初の一歩」の識別子として、赤アクセントの薄い背景+左ボーダーのカードに再定義

全ページ(`Home` / `Morning` / `Evening` / `Weekly` / `Settings` / `Welcome` / `Onboarding` / `Chat` / `PageHeader` / `ScoreChart` / `App.tsx`)の `night-*` / `gold-*` / `ink-*` / `font-display` クラスを新トークンへ一括で置き換える。文言の演劇メタファー(「今日の演目」等)は変更しない。

## フェーズ2: ナビゲーション(ボトムタブ + クイック追加FAB)

新規 `src/components/AppShell.tsx` を作り、オンボーディング済みルートを包む:

- ボトムタブバー: 「今日」(`/`) / 「予定」(`/upcoming`、フェーズ4で実装。それまでは非表示) / 「振り返り」(`/weekly`) / 「設定」(`/settings`)
- 右下に赤い「+」FAB → クイック追加シート(フェーズ3)を開く
- [src/App.tsx](goal-app/src/App.tsx) のルート定義をAppShell配下に移動し、`PageHeader` の戻るナビはMorning/Eveningなどタブ外のフローだけに残す
- [src/pages/Home.tsx](goal-app/src/pages/Home.tsx) 末尾の「週次振り返り」リンクと設定ギアはタブに吸収して削除

## フェーズ3: タスク操作UX(Todoistの操作感)

- 新規 `src/components/QuickAddSheet.tsx`: 画面下からスライドするボトムシート。テキスト入力+「最初の一歩にする」トグル(+フェーズ4で優先度・日付チップ)。保存で当日の `DailyLog.tasks` に追記
- [src/components/TaskList.tsx](goal-app/src/components/TaskList.tsx) を `TaskItem` ベースに再設計:
  - Todoist風の丸チェックボックス(優先度色のアウトライン、タップでフィル+チェックのアニメーション、完了時に打ち消し線がスッと入る)
  - テキスト部タップでインライン編集(input化してblur/Enterで保存)
  - 右スワイプで完了、左スワイプで削除(ポインタイベントで実装、ライブラリ追加なし)
  - 削除時は下部トーストで「元に戻す」(数秒間)
- 休演日の `window.confirm` を共通の確認ボトムシート/ダイアログに置き換え
- タスク配列操作(追加・編集・削除・トグル)は `Home.tsx` 内のロジックを `src/lib/tasks.ts` に切り出し、`saveDailyLog` 経由で保存

## フェーズ4: タスク管理機能の拡張(データモデル変更)

`Task` を拡張(既存データは読み込み時にデフォルト補完し、後方互換を維持):

```ts
interface Task {
  id: string;          // 新規: crypto.randomUUID()
  text: string;
  done: boolean;
  isFirstTask: boolean;
  priority?: 1 | 2 | 3 | 4;  // 新規: 既定4
}
```

- タスクの置き場所は引き続き `DailyLog.tasks`(日付=期限)とし、**将来日付の `DailyLog` にタスクを書けるようにする**ことで期限・予定を表現する。トップレベルの tasks コレクションへの移行は行わない(AI対話が日次ログ前提のため)
- 「予定」タブ(`/upcoming`): 今日以降のログを `getRecentLogs` 相当の範囲クエリで取得し、日付セクション付きリストで表示。クイック追加シートに日付チップ(今日/明日/日付選択)を追加
- 優先度: クイック追加とタスク詳細で P1〜P4 を選択、チェックボックスの色に反映
- タスク詳細ボトムシート: タスクタップ長押し or 詳細アイコンで表示。テキスト・優先度・日付(移動)・削除を編集
- プロジェクト機能はこのアプリでは「理想の自分×日次」構造と競合するため導入しない(習慣タグ的な軽いラベルが欲しくなったら別途検討)
- AI生成側([functions/src](goal-app/functions/src))はタスクを`text`のみで返す現状を維持し、クライアント側で `id`/`priority` を補完する

## 進め方

フェーズ1→2→3→4の順で、各フェーズ完了ごとに `npm run dev` で動作確認しながら進める。1〜3はUI層のみの変更、4のみ型とFirestoreの書き込み内容に影響する(読み込み時デフォルト補完のためマイグレーション不要)。