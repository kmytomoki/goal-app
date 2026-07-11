# ローカル開発の起動・停止手順メモ

日常の開発で使うコマンドと、トラブル時の対処をまとめる。
コマンドはすべてプロジェクトルート（`C:\Users\PC2202\dev\goal-app`）で実行する。

## 起動（ターミナルを2つ使う）

| ターミナル | コマンド | 役割 | 起動確認 |
|---|---|---|---|
| ① | `npm run emulators` | Firebase エミュレータ（Auth/Firestore/Functions） | 「All emulators ready!」と表示される |
| ② | `npm run dev` | Vite 開発サーバー | `http://localhost:5173` が表示される |

起動後、ブラウザで **http://127.0.0.1:5173** を開く。

- ①と②は**両方**起動している必要がある。エミュレータなしで dev サーバーだけ動かすと
  「client is offline」系のエラーになる。
- 起動順はどちらが先でもよい。

## 停止

各ターミナルをクリックして **`Ctrl + C`** を押す（①は確認を求められたら `y`）。

## 環境変数を変更したら再起動が必要

| 変更したファイル | 再起動するもの |
|---|---|
| `functions/.env`（GEMINI_API_KEY など） | ① エミュレータ |
| `.env.local`（VITE_ で始まる変数） | ② dev サーバー |

エミュレータや dev サーバーは**起動時にしか env ファイルを読まない**。
変更を保存しただけでは反映されないので注意（「AIの応答に失敗しました」の典型原因）。

## ターミナルを見失った・閉じてしまった場合の強制停止

プロセスが残ってポートを掴んだままだと、次の起動時に
`Error: Could not start Emulator UI, port taken.` で失敗する。
その場合は PowerShell で以下を実行してポートを解放する。

```powershell
# エミュレータ + dev サーバーが使うポートのプロセスを強制終了
foreach ($p in 9099, 8088, 5001, 4000, 5173) {
  $c = Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue
  if ($c) { Stop-Process -Id ($c.OwningProcess | Select-Object -First 1) -Force }
}
```

### WSL 側で起動していた場合

上のコマンドでプロセス名が `wslrelay` と出る場合、本体は WSL 内で動いている。
Windows 側から止めるには:

```powershell
wsl -e bash -c "pkill -f 'emulators:start'; pkill -f 'cloud-firestore-emulator'; pkill -f vite"
```

## ポート一覧

| ポート | 用途 |
|---|---|
| 5173 | Vite 開発サーバー（アプリ本体） |
| 9099 | Auth エミュレータ |
| 8088 | Firestore エミュレータ |
| 5001 | Functions エミュレータ（chat / assist） |
| 4000 | Emulator UI（http://127.0.0.1:4000 でデータ確認可） |

## 注意事項

- エミュレータのデータ（ユーザー・日次ログ）は**停止すると消える**。テストデータは使い捨て前提。
- AI 対話には `functions/.env` に有効な `GEMINI_API_KEY` が必要（エミュレータでも本物のキーを使う）。
- AI がエラーになるときは、①のターミナルに `chat stream failed ...` という詳細ログが出るのでそれを確認する。
