import { Suspense } from "react"
import InquiryForm from "./inquiry-form"

export const metadata = {
  title: "お問い合わせ・資料請求 | ExecuWell × VitaAI",
  description:
    "ExecuWell × VitaAI に関するお問い合わせ・資料請求フォームです。導入のご相談、資料のご請求を承ります。",
}

export default function ContactPage() {
  return (
    <Suspense fallback={null}>
      <InquiryForm />
    </Suspense>
  )
}
