import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-10">
      <h1 className="font-display text-2xl font-semibold">プライバシーポリシー</h1>
      <p className="mt-2 text-sm text-fg-muted">最終更新: 2026-07-02</p>

      <div className="mt-6 space-y-5 text-sm leading-relaxed">
        <section>
          <h2 className="font-semibold">1. 取得する情報</h2>
          <p className="mt-1">
            メールアドレス、表示名、目標・タスク・振り返り・対話履歴など、サービス提供に
            必要な情報を取得します。
          </p>
        </section>
        <section>
          <h2 className="font-semibold">2. 利用目的</h2>
          <p className="mt-1">
            目標管理機能の提供、対話文脈の維持、達成率の計算、継続体験の改善に利用します。
          </p>
        </section>
        <section>
          <h2 className="font-semibold">3. 外部サービス</h2>
          <p className="mt-1">
            認証・データ保存にFirebase、AI応答生成にAnthropic APIを利用します。各サービス
            の規約・ポリシーにも従います。
          </p>
        </section>
        <section>
          <h2 className="font-semibold">4. データ削除</h2>
          <p className="mt-1">
            設定画面のアカウント削除機能から、保存データの削除を要求できます。
          </p>
        </section>
      </div>

      <Link href="/signup" className="btn-primary mt-8 inline-flex">
        新規登録へ戻る
      </Link>
    </div>
  );
}
