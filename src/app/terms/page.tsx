import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-10">
      <h1 className="font-display text-2xl font-semibold">利用規約</h1>
      <p className="mt-2 text-sm text-fg-muted">
        最終更新: 2026-07-02
      </p>

      <div className="mt-6 space-y-5 text-sm leading-relaxed">
        <section>
          <h2 className="font-semibold">1. サービス概要</h2>
          <p className="mt-1">
            本サービスは、AIとの対話を用いて目標設定・日次行動・振り返りを支援する
            目標管理アプリです。
          </p>
        </section>
        <section>
          <h2 className="font-semibold">2. 利用者の責任</h2>
          <p className="mt-1">
            利用者は自身の責任において本サービスを利用するものとし、入力内容の正確性と
            適法性を担保してください。
          </p>
        </section>
        <section>
          <h2 className="font-semibold">3. AI応答に関する注意</h2>
          <p className="mt-1">
            AIの提案は意思決定の補助であり、結果を保証するものではありません。重要判断は
            利用者自身で行ってください。
          </p>
        </section>
        <section>
          <h2 className="font-semibold">4. アカウント削除</h2>
          <p className="mt-1">
            設定画面からアカウント削除を実行できます。削除後はデータ復旧できません。
          </p>
        </section>
      </div>

      <Link href="/signup" className="btn-primary mt-8 inline-flex">
        新規登録へ戻る
      </Link>
    </div>
  );
}
