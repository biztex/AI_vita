"use client"

import { useEffect, useState } from "react"
import { API_CONFIG } from "@/lib/config/api"
import { Loader2, AlertCircle, User, Settings, CreditCard, Brain, HeartPulse, Check, Sparkles, ArrowRight } from "lucide-react"
import { useLiff } from "../_hooks/useLiff"

type AxelHomeSnapshot = {
  today: {
    stateLevel: number | null
    fatigueLevel: number | null
    comment: string | null
    recordedAt: string
  } | null
  lastDecision: {
    hasImportantDecision: boolean
    hesitationLevel: number | null
    content: string
    recordedAt: string
  } | null
  lastAxelReply: {
    snippet: string
    receivedAt: string
  } | null
  nextAction: { label: string; detail: string; url?: string }
}

type MyPageData = {
  displayName: string | null
  userMode: "EXECUWELL" | "VITAAI"
  morningPushEnabled: boolean
  email: string | null
  name: string | null
  subscription: string | null
  activeStripeSubscription: {
    subscriptionType: string
    status: string
    currentPeriodEnd: string | null
  } | null
  home?: AxelHomeSnapshot
}

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

// 利用開始までの流れ（client item 10: プラン選択は契約時に完了しているため
// 表示から除外。「体験開始」→「利用開始」。ACTIVE 到達後はカードごと非表示）
const FLOW_STEPS = ["アカウント連携", "遺伝子検査", "管理栄養士面談", "AXEL 利用開始"]
const FLOW_INDEX: Record<OnboardingState["step"], number> = {
  PENDING: 0,
  LINKED: 1,
  PLAN_ACTIVE: 1,
  REPORT_READY: 2,
  ACTIVE: 4,
}

function formatDate(iso: string | null): string {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" })
  } catch { return iso }
}

const SUBSCRIPTION_LABEL: Record<string, string> = {
  VITAAI: "VitaAI",
  EXECUWELL: "ExecuWell",
  INTEGRATED: "AXEL（統合プラン）",
}

export default function LiffMyPage() {
  const liff = useLiff()
  const [data, setData] = useState<MyPageData | null>(null)
  const [onb, setOnb] = useState<OnboardingState | null>(null)
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const [toast, setToast] = useState<string | null>(null)
  // item 10: after onboarding completes the flow card hides; this reopens it on demand
  const [showFlow, setShowFlow] = useState(false)

  useEffect(() => {
    if (liff.status !== "ready") return
    setLoading(true)
    Promise.all([
      fetch(`${API_CONFIG.BASE_URL}/line/liff/mypage?lineUserId=${encodeURIComponent(liff.lineUserId)}`)
        .then((res) => {
          if (!res.ok) throw new Error(res.status === 404 ? "ユーザーが見つかりません。" : "読み込みに失敗しました。")
          return res.json() as Promise<MyPageData>
        }),
      fetch(`${API_CONFIG.BASE_URL}/line/liff/onboarding-state?lineUserId=${encodeURIComponent(liff.lineUserId)}`)
        .then((res) => res.ok ? (res.json() as Promise<OnboardingState>) : null)
        .catch(() => null),
    ])
      .then(([d, o]) => { setData(d); if (o) setOnb(o) })
      .catch((err) => setFetchError(err.message || "読み込みに失敗しました。"))
      .finally(() => setLoading(false))
  }, [liff.status])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast((curr) => (curr === msg ? null : curr)), 2200)
  }

  // Mode switching (item 9) and the morning-push toggle (item 11) were removed
  // per client direction: AXEL routes ExecuWell/VitaAI knowledge internally and
  // no scheduled morning notification is in use.

  async function openBillingPortal() {
    if (liff.status !== "ready") return
    try {
      const res = await fetch(
        `${API_CONFIG.BASE_URL}/line/liff/billing-portal?lineUserId=${encodeURIComponent(liff.lineUserId)}`,
      )
      const json = await res.json()
      if (json.available && json.url) {
        window.location.href = json.url
      } else {
        showToast("お支払い情報が見つかりませんでした。")
      }
    } catch {
      showToast("お支払い管理を開けませんでした。もう一度お試しください。")
    }
  }

  if (liff.status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#f0f4f8" }}>
        <Loader2 className="h-10 w-10 animate-spin" style={{ color: "#2D5A8E" }} />
      </div>
    )
  }

  const errorMsg = liff.status === "error" ? liff.message : fetchError
  if (errorMsg) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "#f0f4f8" }}>
        <div className="flex w-full max-w-sm flex-col items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <AlertCircle className="h-10 w-10 text-amber-500" />
          <p className="text-center text-sm text-amber-900">{errorMsg}</p>
        </div>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="min-h-screen pb-10" style={{ background: "#f0f4f8" }}>
      <div className="px-4 pt-8 pb-5" style={{ background: "#1E3A5F" }}>
        <div className="flex items-center gap-2 text-white">
          <User className="h-5 w-5" />
          <span className="text-xs font-medium opacity-80">マイページ</span>
        </div>
        <h1 className="mt-1 text-xl font-bold text-white">
          {liff.status === "ready" ? liff.displayName : (data.displayName ?? data.name ?? "ゲスト")}
        </h1>
        {data.email && <p className="mt-1 text-xs text-white/60">{data.email}</p>}
      </div>

      <div className="mx-auto mt-4 w-full max-w-md space-y-4 px-4">

        {/* ご利用の流れ — 完了後は非表示（設定カードのリンクから再表示可能） */}
        {onb && (onb.step !== "ACTIVE" || showFlow) && (
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <ArrowRight className="h-4 w-4" style={{ color: "#2D5A8E" }} />
              <p className="text-xs font-semibold" style={{ color: "#2D5A8E" }}>AXEL ご利用の流れ</p>
              <span className="ml-auto rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
                {Math.min(FLOW_INDEX[onb.step], FLOW_STEPS.length)} / {FLOW_STEPS.length}
              </span>
            </div>
            <ol className="space-y-2">
              {FLOW_STEPS.map((label, i) => {
                const currentIdx = FLOW_INDEX[onb.step]
                const status: "done" | "current" | "todo" = i < currentIdx ? "done" : i === currentIdx ? "current" : "todo"
                return (
                  <li key={label} className="flex items-center gap-3 text-[13px]">
                    <span
                      className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                        status === "done"
                          ? "bg-[#1E3A5F] text-white"
                          : status === "current"
                          ? "bg-[#C9A86A] text-white ring-2 ring-[#C9A86A]/30"
                          : "bg-gray-200 text-gray-400"
                      }`}
                    >
                      {status === "done" ? "✓" : i + 1}
                    </span>
                    <span
                      className={`${
                        status === "done"
                          ? "text-gray-400 line-through"
                          : status === "current"
                          ? "font-semibold text-[#1E3A5F]"
                          : "text-gray-400"
                      }`}
                    >
                      {label}
                    </span>
                  </li>
                )
              })}
            </ol>
            <a
              href="https://liff.line.me/2009125242-ka7XZSEQ/onboarding"
              className="mt-3 inline-block text-[11px] font-semibold text-[#2D5A8E]"
            >
              ご利用の流れを詳しく見る →
            </a>
          </div>
        )}

        {/* Subscription */}
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <CreditCard className="h-4 w-4" style={{ color: "#2D5A8E" }} />
            <p className="text-xs font-semibold" style={{ color: "#2D5A8E" }}>ご契約プラン</p>
          </div>
          {data.subscription ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">プラン名</span>
                <span className="font-semibold" style={{ color: "#1E3A5F" }}>
                  {SUBSCRIPTION_LABEL[data.subscription] ?? data.subscription}
                </span>
              </div>
              {data.activeStripeSubscription && (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">ステータス</span>
                    <span className="inline-flex items-center gap-1 font-medium text-green-600">
                      <Check className="h-3.5 w-3.5" /> 有効
                    </span>
                  </div>
                  {data.activeStripeSubscription.currentPeriodEnd && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">次回更新日</span>
                      <span className="text-gray-700">{formatDate(data.activeStripeSubscription.currentPeriodEnd)}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <p className="py-2 text-sm leading-relaxed text-gray-500">
              ご契約情報を確認できませんでした。LINEアカウントの連携がお済みでない可能性があります。お手数ですが、お問い合わせよりご連絡ください。
            </p>
          )}
        </div>

        {/* 登録情報 */}
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <User className="h-4 w-4" style={{ color: "#2D5A8E" }} />
            <p className="text-xs font-semibold" style={{ color: "#2D5A8E" }}>登録情報</p>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">お名前</span>
              <span className="text-gray-700">{data.name ?? data.displayName ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">メールアドレス</span>
              <span className="max-w-[60%] truncate text-gray-700">{data.email ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">LINE連携</span>
              {data.email || data.name ? (
                <span className="inline-flex items-center gap-1 font-medium text-green-600">
                  <Check className="h-3.5 w-3.5" /> 連携済み
                </span>
              ) : (
                <span className="text-[12px] text-amber-600">未連携（アカウント連携がお済みでない可能性があります）</span>
              )}
            </div>
          </div>
        </div>

        {/* お支払い */}
        {data.activeStripeSubscription && (
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <CreditCard className="h-4 w-4" style={{ color: "#2D5A8E" }} />
              <p className="text-xs font-semibold" style={{ color: "#2D5A8E" }}>お支払い</p>
            </div>
            <p className="mb-2 text-[11px] leading-relaxed text-gray-400">
              お支払い方法の変更・ご請求履歴の確認・解約のお手続きができます。
            </p>
            <button
              type="button"
              onClick={openBillingPortal}
              className="w-full rounded-lg border border-[#1E3A5F] px-4 py-2 text-xs font-semibold text-[#1E3A5F]"
            >
              お支払い・解約の管理
            </button>
          </div>
        )}

        {/* AXELの2つの知見（旧サービスモードの置き換え） */}
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4" style={{ color: "#C9A86A" }} />
            <p className="text-xs font-semibold" style={{ color: "#2D5A8E" }}>AXELの2つの知見</p>
          </div>
          <div className="space-y-2.5">
            <div className="flex items-start gap-2.5">
              <Brain className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-400" />
              <div>
                <p className="text-[13px] font-semibold text-gray-700">ExecuWell — 相談コンシェルジュ</p>
                <p className="text-[11px] leading-relaxed text-gray-400">経営・仕事・大切な判断のご相談を受け持ちます。</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <HeartPulse className="mt-0.5 h-4 w-4 flex-shrink-0 text-rose-400" />
              <div>
                <p className="text-[13px] font-semibold text-gray-700">VitaAI — 健康コンシェルジュ</p>
                <p className="text-[11px] leading-relaxed text-gray-400">健康・食事・運動・睡眠のご相談を受け持ちます。</p>
              </div>
            </div>
          </div>
          <p className="mt-3 border-t border-gray-100 pt-2.5 text-[11px] leading-relaxed text-gray-400">
            ご相談の内容に応じて、AXELが必要な知見を自動で使い分けます。切り替えの操作は不要です。
          </p>
        </div>

        {/* サポート・各種設定 */}
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Settings className="h-4 w-4" style={{ color: "#2D5A8E" }} />
            <p className="text-xs font-semibold" style={{ color: "#2D5A8E" }}>サポート・各種設定</p>
          </div>
          <div className="space-y-1 text-sm">
            <a href="https://execuwell.jp/contact" className="flex items-center justify-between rounded-lg px-2 py-2 text-gray-700 active:bg-gray-50">
              お問い合わせ <ArrowRight className="h-3.5 w-3.5 text-gray-300" />
            </a>
            {onb?.step === "ACTIVE" && !showFlow && (
              <button
                type="button"
                onClick={() => setShowFlow(true)}
                className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-gray-700 active:bg-gray-50"
              >
                ご利用の流れを確認する <ArrowRight className="h-3.5 w-3.5 text-gray-300" />
              </button>
            )}
          </div>
        </div>

        {/* Legal */}
        <div className="flex items-center justify-center gap-4 pt-1 text-[11px]">
          <a href="https://execuwell.jp/terms" target="_blank" rel="noopener noreferrer" className="text-gray-500 underline">
            利用規約
          </a>
          <a href="https://execuwell.jp/privacy" target="_blank" rel="noopener noreferrer" className="text-gray-500 underline">
            プライバシーポリシー
          </a>
        </div>

        <p className="pt-2 text-center text-[11px] text-gray-400">エグゼ＆ビータ｜公式 @389rupfv</p>
      </div>

      {/* toast */}
      {toast && (
        <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
          <div className="rounded-full bg-gray-900/90 px-5 py-2.5 text-sm font-medium text-white shadow-lg">
            {toast}
          </div>
        </div>
      )}
    </div>
  )
}
