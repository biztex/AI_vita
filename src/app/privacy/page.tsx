export const metadata = { title: "プライバシーポリシー | AXEL" }

// NOTE: Full draft for client review (2026-09-15). Operator legal name/address
// to be confirmed by the client before 本番公開. Genetic-test results and
// health records are 要配慮個人情報 under 個人情報保護法 — the explicit-consent
// language in §4 is deliberate and should be kept through legal review.
// Styling: white cards on the site's navy background (readability).

const SECTIONS: { title: string; body?: string[]; list?: string[] }[] = [
  {
    title: "1. 基本方針",
    body: [
      "本サービスの運営者（以下「当社」といいます）は、AIコンシェルジュサービス「AXEL」ならびに「ExecuWell」および「VitaAI」（以下「本サービス」といいます）の提供にあたり、個人情報の保護に関する法律（以下「個人情報保護法」といいます）その他の関係法令を遵守し、利用者の個人情報を適正に取り扱います。",
    ],
  },
  {
    title: "2. 取得する情報",
    body: ["当社は、本サービスの提供にあたり、次の情報を取得します。"],
    list: [
      "登録情報：氏名、メールアドレス、会社名・役職等、ご登録時にご提供いただく情報",
      "LINEアカウント情報：LINEユーザーID、表示名等",
      "相談・会話情報：本AIとの会話内容（テキスト・画像・音声を含む）、相談履歴、判断の記録",
      "健康関連情報：体調・疲労の記録、生活習慣、健康上の関心事項",
      "遺伝子検査情報：提携検査機関による遺伝子解析結果",
      "診断情報：性格診断の回答および結果",
      "専門家関連情報：管理栄養士によるカウンセリング内容・個別プラン",
      "決済情報：契約プラン、決済状況（クレジットカード番号そのものは決済代行事業者が管理し、当社は保持しません）",
      "利用状況情報：アクセスログ、利用日時、端末情報等",
    ],
  },
  {
    title: "3. 利用目的",
    body: ["取得した情報は、次の目的で利用します。"],
    list: [
      "本サービスの提供・運営・本人確認のため",
      "利用者一人ひとりの状況に応じた、個別最適化された応答・助言を生成するため",
      "遺伝子検査結果・性格診断・専門家の知見を組み合わせた健康・栄養サポートのため",
      "利用料金の請求・決済のため",
      "お問い合わせへの対応のため",
      "本サービスの品質向上・不具合対応・新機能開発のため",
      "利用規約に違反する行為への対応のため",
      "その他、上記に付随する目的のため",
    ],
  },
  {
    title: "4. 要配慮個人情報の取扱い",
    body: [
      "遺伝子検査結果、健康状態・体調に関する記録等は、個人情報保護法上の要配慮個人情報に該当します。当社は、これらの情報を、利用者ご本人の明示的な同意に基づいて取得し、本サービスの提供に必要な範囲でのみ利用します。",
      "当社は、これらの情報を、ご本人の同意なく目的外に利用せず、また法令に定める場合を除き第三者に提供しません。",
    ],
  },
  {
    title: "5. 業務委託および外部サービスの利用",
    body: [
      "当社は、本サービスの提供に必要な範囲で、個人情報の取扱いを含む業務の一部を外部事業者に委託しています。委託先には、AI応答の生成処理（OpenAI等）、決済処理（Stripe）、メッセージ配信基盤（LINEヤフー）、認証・データ基盤、遺伝子検査の実施（提携検査機関）、栄養カウンセリング（提携管理栄養士）が含まれます。",
      "委託先の一部は外国（米国等）に所在します。当社は、個人情報保護法の定めに従い、委託先について必要かつ適切な監督を行い、安全管理措置が講じられるよう努めます。",
      "AI応答の生成にあたり会話内容等が処理されますが、当社が利用するAPIにおいて、これらのデータがAIモデルの学習に利用されない設定・契約条件を採用しています。",
    ],
  },
  {
    title: "6. 第三者提供",
    body: [
      "当社は、次の場合を除き、個人情報をご本人の同意なく第三者に提供しません。（1）法令に基づく場合、（2）人の生命、身体または財産の保護のために必要がある場合であって、ご本人の同意を得ることが困難であるとき、（3）その他個人情報保護法が認める場合。",
    ],
  },
  {
    title: "7. 安全管理措置",
    body: [
      "当社は、取り扱う個人情報の漏えい、滅失または毀損の防止その他個人情報の安全管理のため、アクセス制御、通信の暗号化、データの定期的なバックアップ等、必要かつ適切な措置を講じます。",
    ],
  },
  {
    title: "8. 保存期間および削除",
    body: [
      "当社は、利用目的の達成に必要な範囲で個人情報を保存し、利用契約の終了後は、法令上の保存義務がある場合を除き、合理的な期間内に適切な方法で削除または匿名化します。",
      "利用者は、契約終了時に自己のデータの削除を申し出ることができます。",
    ],
  },
  {
    title: "9. 開示・訂正・利用停止等のご請求",
    body: [
      "利用者は、当社に対し、個人情報保護法の定めに従い、自己の個人情報の開示・訂正・追加・削除・利用停止等を請求することができます。ご請求の際は、下記お問い合わせ窓口までご連絡ください。ご本人確認のうえ、法令に従い遅滞なく対応いたします。",
    ],
  },
  {
    title: "10. Cookie等の利用",
    body: [
      "本サービスは、ログイン状態の維持その他サービスの提供に必要な範囲でCookieおよび類似技術を使用します。現在、広告配信を目的とした第三者Cookieは使用していません。",
    ],
  },
  {
    title: "11. 未成年者の利用",
    body: [
      "未成年者が本サービスを利用する場合は、親権者その他の法定代理人の同意を得たうえでご利用ください。",
    ],
  },
  {
    title: "12. 本ポリシーの改定",
    body: [
      "当社は、法令の改正またはサービス内容の変更等に応じて、本ポリシーを改定することがあります。重要な変更を行う場合は、本ページへの掲載その他適切な方法により事前にお知らせします。",
    ],
  },
  {
    title: "13. お問い合わせ窓口",
    body: [
      "個人情報の取扱いに関するご質問・ご請求は、お問い合わせページよりご連絡ください。",
    ],
  },
]

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      {/* Header card */}
      <div className="rounded-2xl bg-gradient-to-br from-[#1E3A5F] to-[#0F2342] px-8 py-10 shadow-lg ring-1 ring-white/10">
        <p className="text-xs font-bold tracking-[0.35em] text-[#C9A86A]">AXEL</p>
        <h1 className="mt-2 text-3xl font-bold text-white">プライバシーポリシー</h1>
        <p className="mt-3 text-sm leading-relaxed text-white/70">
          当社は、遺伝子情報・健康情報という特に大切な情報をお預かりするサービスとして、
          個人情報の保護を最も重要な責務のひとつと考えています。
        </p>
        <p className="mt-4 border-t border-white/15 pt-3 text-xs text-white/50">制定日：2026年9月15日</p>
      </div>

      {/* Body on white cards — the site background is dark navy, so legal text
          always sits on a light surface for readability */}
      <div className="mt-6 space-y-4">
        {SECTIONS.map((s) => (
          <section key={s.title} className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="text-[15px] font-bold text-[#1E3A5F]">{s.title}</h2>
            {s.body?.map((p, i) => (
              <p key={i} className="mt-2 text-[13.5px] leading-relaxed text-gray-700">{p}</p>
            ))}
            {s.list && (
              <ul className="mt-2 space-y-1.5">
                {s.list.map((li, i) => (
                  <li key={i} className="flex gap-2 text-[13.5px] leading-relaxed text-gray-700">
                    <span className="mt-[7px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#C9A86A]" />
                    {li}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}

        <div className="rounded-xl bg-white/10 p-5 text-center">
          <p className="text-xs text-white/60">
            個人情報の取扱いに関するお問い合わせは、<a href="/contact" className="underline text-[#C9A86A]">お問い合わせページ</a>よりご連絡ください。
          </p>
        </div>
      </div>
    </main>
  )
}
