export const metadata = { title: "利用規約 | AXEL" }

// NOTE: This is a structural template. The final legal wording should be
// supplied/approved by the client (and ideally reviewed by counsel).
export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-10 text-[#1a1a1a]">
      <h1 className="mb-6 text-2xl font-bold">利用規約</h1>
      <p className="mb-6 text-sm text-gray-500">最終更新日：2026年8月</p>

      <section className="space-y-5 text-sm leading-relaxed">
        <div>
          <h2 className="mb-1 font-bold">第1条（適用）</h2>
          <p>本規約は、AXEL（以下「本サービス」）の利用条件を定めるものです。利用者は本規約に同意のうえ本サービスを利用するものとします。</p>
        </div>
        <div>
          <h2 className="mb-1 font-bold">第2条（サービス内容）</h2>
          <p>本サービスは、AIによる相談支援、健康・栄養に関する情報提供、遺伝子検査結果や性格診断に基づく助言等を提供します。提供内容は医療行為・診断ではありません。</p>
        </div>
        <div>
          <h2 className="mb-1 font-bold">第3条（料金・支払い）</h2>
          <p>利用者は所定の料金を、指定の方法（クレジットカード決済等）により支払うものとします。詳細は各プランの案内に従います。</p>
        </div>
        <div>
          <h2 className="mb-1 font-bold">第4条（禁止事項）</h2>
          <p>法令違反、第三者の権利侵害、本サービスの運営を妨げる行為等を禁止します。</p>
        </div>
        <div>
          <h2 className="mb-1 font-bold">第5条（免責）</h2>
          <p>本サービスの助言は参考情報であり、最終的な判断・行動は利用者の責任において行われます。健康上の重大な懸念がある場合は医療機関にご相談ください。</p>
        </div>
        <div>
          <h2 className="mb-1 font-bold">第6条（規約の変更）</h2>
          <p>本サービスは、必要に応じて本規約を変更することがあります。変更後の規約は本ページに掲示した時点から効力を生じます。</p>
        </div>
        <p className="pt-4 text-xs text-gray-400">
          ※ 本文は雛形です。正式な条項は運営者の定める内容に置き換えてください。
        </p>
      </section>
    </main>
  )
}
