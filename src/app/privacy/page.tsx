export const metadata = { title: "プライバシーポリシー | AXEL" }

// NOTE: Structural template. Final wording should be supplied/approved by the
// client (and ideally reviewed by counsel), especially the handling of
// sensitive data (genetic test results, health/condition data).
export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-10 text-[#1a1a1a]">
      <h1 className="mb-6 text-2xl font-bold">プライバシーポリシー</h1>
      <p className="mb-6 text-sm text-gray-500">最終更新日：2026年8月</p>

      <section className="space-y-5 text-sm leading-relaxed">
        <div>
          <h2 className="mb-1 font-bold">1. 取得する情報</h2>
          <p>氏名・連絡先等の登録情報、LINEアカウント情報、会話履歴、健康・体調記録、遺伝子検査結果、性格診断結果、決済に関する情報等を取得します。</p>
        </div>
        <div>
          <h2 className="mb-1 font-bold">2. 利用目的</h2>
          <p>本サービスの提供・個別最適化された助言の生成・品質向上・お問い合わせ対応・決済処理のために利用します。</p>
        </div>
        <div>
          <h2 className="mb-1 font-bold">3. 機微情報の取扱い</h2>
          <p>遺伝子検査結果や健康情報等の機微情報は、利用者本人への支援目的の範囲で慎重に取り扱い、本人の同意なく目的外に利用しません。</p>
        </div>
        <div>
          <h2 className="mb-1 font-bold">4. 第三者提供・委託</h2>
          <p>法令に基づく場合等を除き、本人の同意なく第三者へ提供しません。決済（Stripe）やAI処理等、業務の一部を外部に委託する場合があります。</p>
        </div>
        <div>
          <h2 className="mb-1 font-bold">5. 安全管理</h2>
          <p>取得した情報の漏洩・滅失等を防止するため、適切な安全管理措置を講じます。</p>
        </div>
        <div>
          <h2 className="mb-1 font-bold">6. 開示・訂正・削除</h2>
          <p>利用者は、自己の情報の開示・訂正・削除を求めることができます。お問い合わせ窓口までご連絡ください。</p>
        </div>
      </section>
    </main>
  )
}
