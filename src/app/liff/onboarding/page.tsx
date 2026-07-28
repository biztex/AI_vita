"use client"

import { useEffect, useState } from "react"
import { API_CONFIG } from "@/lib/config/api"
import {
  Loader2, AlertCircle, Sparkles, Link2, CreditCard, Dna, Users, Activity, ArrowRight,
} from "lucide-react"
import { useLiff } from "../_hooks/useLiff"

type OnboardingState = {
  step: "PENDING" | "LINKED" | "PLAN_ACTIVE" | "REPORT_READY" | "ACTIVE"
  details: {
    hasAppUser: boolean
    activeSubscriptionType: "VITAAI" | "EXECUWELL" | "INTEGRATED" | null
    hasGeneData: boolean
    hasNutritionPlan: boolean
    nextReviewAt: string | null
  }
}

type Step = {
  key: OnboardingState["step"]
  label: string
  title: string
  desc: string
  icon: React.ReactNode
  cta?: { href: string; label: string }
}

const STEPS: Step[] = [
  {
    key: "PENDING",
    label: "STEP 1",
    title: "アカウント連携",
    desc:
      "ご契約用の会員アカウント（メール／パスワード）を作成し、LINE と連携いたします。",
    icon: <Link2 className="h-5 w-5" />,
    cta: { href: "https://execuwell.jp/auth/register", label: "アカウント作成" },
  },
  {
    key: "LINKED",
    label: "STEP 2",
    title: "プランを選ぶ",
    desc:
      "ExecuWell（判断支援）／ VitaAI（健康支援）／ AXEL（統合）から、ご契約プランをご選択いただきます。",
    icon: <CreditCard className="h-5 w-5" />,
    cta: { href: "https://execuwell.jp/subscription", label: "プランを見る" },
  },
  {
    key: "PLAN_ACTIVE",
    label: "STEP 3",
    title: "遺伝子検査キットお届け",
    desc:
      "ご自宅に検査キットをお届けし、ご返送いただきます。結果到着時に LINE で自動通知いたします。",
    icon: <Dna className="h-5 w-5" />,
  },
  {
    key: "REPORT_READY",
    label: "STEP 4",
    title: "管理栄養士による初回面談",
    desc:
      "遺伝子分析結果をもとに、管理栄養士が個別設計シートを作成。AI がその内容を即時参照します。",
    icon: <Users className="h-5 w-5" />,
  },
  {
    key: "ACTIVE",
    label: "STEP 5",
    title: "AXEL 体験スタート",
    desc:
      "判断と健康を統合的に支える AXEL の日常運用が開始されます。3ヶ月ごとに見直しを実施いたします。",
    icon: <Activity className="h-5 w-5" />,
  },
]

function getStatus(stepKey: OnboardingState["step"], currentStep: OnboardingState["step"]): "done" | "current" | "todo" {
  const order: OnboardingState["step"][] = ["PENDING", "LINKED", "PLAN_ACTIVE", "REPORT_READY", "ACTIVE"]
  const cur = order.indexOf(currentStep)
  const idx = order.indexOf(stepKey)
  if (idx < cur) return "done"
  if (idx === cur) return "current"
  return "todo"
}

export default function LiffOnboardingPage() {
  const liff = useLiff()
  const [onb, setOnb] = useState<OnboardingState | null>(null)
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    if (liff.status !== "ready") return
    setLoading(true)
    fetch(`${API_CONFIG.BASE_URL}/line/liff/onboarding-state?lineUserId=${encodeURIComponent(liff.lineUserId)}`)
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 404 ? "ユーザーが見つかりません。" : "読み込みに失敗しました。")
        return res.json() as Promise<OnboardingState>
      })
      .then(setOnb)
      .catch((err) => setFetchError(err.message || "読み込みに失敗しました。"))
      .finally(() => setLoading(false))
  }, [liff.status])

  if (liff.status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0F2342" }}>
        <Loader2 className="h-10 w-10 animate-spin" style={{ color: "#C9A86A" }} />
      </div>
    )
  }

  const errorMsg = liff.status === "error" ? liff.message : fetchError
  if (errorMsg) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "#0F2342" }}>
        <div className="flex w-full max-w-sm flex-col items-center gap-3 rounded-2xl border border-amber-200/50 bg-amber-50 p-6">
          <AlertCircle className="h-10 w-10 text-amber-500" />
          <p className="text-center text-sm text-amber-900">{errorMsg}</p>
        </div>
      </div>
    )
  }

  if (!onb) return null

  return (
    <div className="min-h-screen pb-10" style={{ background: "#0F2342" }}>
      <div className="px-5 pt-9 pb-7">
        <div className="flex items-center gap-2 text-[#C9A86A]">
          <Sparkles className="h-4 w-4" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.3em]">AXEL Journey</span>
        </div>
        <h1 className="mt-3 font-serif text-2xl leading-snug text-white">
          判断と健康を統合的に支える、
          <br />
          <span className="text-[#C9A86A]">AXEL</span> の始め方。
        </h1>
        <p className="mt-3 text-[13px] leading-relaxed text-white/65">
          5ステップで、AXEL の日常運用が始まります。各段階の進捗をご確認いただけます。
        </p>
      </div>

      <div className="mx-auto w-full max-w-md px-5">
        <ol className="relative space-y-4">
          {/* Vertical connector line behind icons */}
          <div className="pointer-events-none absolute left-[26px] top-7 bottom-7 w-px bg-white/15" />
          {STEPS.map((s) => {
            const status = getStatus(s.key, onb.step)
            return (
              <li key={s.key} className="relative flex gap-4">
                <span
                  className={`relative z-10 flex h-[54px] w-[54px] flex-shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                    status === "done"
                      ? "border-[#1E3A5F] bg-[#1E3A5F] text-white"
                      : status === "current"
                      ? "border-[#C9A86A] bg-[#C9A86A] text-[#0F2342] shadow-[0_0_24px_-4px_rgba(201,168,106,0.6)]"
                      : "border-white/20 bg-[#0F2342] text-white/40"
                  }`}
                >
                  {status === "done" ? <span className="text-base font-bold">✓</span> : s.icon}
                </span>
                <div
                  className={`flex-1 rounded-2xl border p-4 transition-colors ${
                    status === "done"
                      ? "border-white/10 bg-white/[0.03]"
                      : status === "current"
                      ? "border-[#C9A86A]/40 bg-white/[0.04]"
                      : "border-white/10 bg-white/[0.02]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-white/40">
                      {s.label}
                    </span>
                    {status === "current" && (
                      <span className="rounded-full bg-[#C9A86A] px-2 py-0.5 text-[10px] font-bold text-[#0F2342]">
                        NOW
                      </span>
                    )}
                    {status === "done" && (
                      <span className="text-[10px] font-semibold text-emerald-400">完了</span>
                    )}
                  </div>
                  <p
                    className={`mt-1.5 font-serif text-base ${
                      status === "todo" ? "text-white/50" : "text-white"
                    }`}
                  >
                    {s.title}
                  </p>
                  <p className="mt-2 text-[12.5px] leading-relaxed text-white/55">{s.desc}</p>
                  {s.cta && status === "current" && (
                    <a
                      href={s.cta.href}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#C9A86A] px-4 py-2 text-xs font-bold text-[#0F2342]"
                    >
                      {s.cta.label}
                      <ArrowRight className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </li>
            )
          })}
        </ol>

        {onb.step === "ACTIVE" && (
          <div className="mt-6 rounded-2xl border border-[#C9A86A]/40 bg-gradient-to-br from-[#C9A86A]/15 to-transparent p-5 text-center">
            <Sparkles className="mx-auto h-5 w-5 text-[#C9A86A]" />
            <p className="mt-2 font-serif text-base text-white">AXEL 体験スタート済み</p>
            <p className="mt-1 text-[12px] leading-relaxed text-white/65">
              リッチメニューから日々の運用にお進みください。
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
