"use client"

import { useEffect, useState } from "react"
import { API_CONFIG } from "@/lib/config/api"
import { Loader2, AlertCircle, User, Bell, CreditCard, Repeat2, Brain, HeartPulse, Check, Sparkles, ArrowRight, Activity, MessageSquare } from "lucide-react"
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

const ONBOARDING_STEPS: { key: OnboardingState["step"]; label: string }[] = [
  { key: "PENDING",      label: "アカウント連携" },
  { key: "LINKED",       label: "プラン選択" },
  { key: "PLAN_ACTIVE",  label: "遺伝子検査" },
  { key: "REPORT_READY", label: "管理栄養士面談" },
  { key: "ACTIVE",       label: "AXEL 体験開始" },
]

function formatDate(iso: string | null): string {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" })
  } catch { return iso }
}

const SUBSCRIPTION_LABEL: Record<string, string> = {
  VITAAI: "VitaAI",
  EXECUWELL: "ExecuWell",
  INTEGRATED: "統合プラン（ExecuWell + VitaAI）",
}

export default function LiffMyPage() {
  const liff = useLiff()
  const [data, setData] = useState<MyPageData | null>(null)
  const [onb, setOnb] = useState<OnboardingState | null>(null)
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Local state for interactive controls (so UI updates immediately)
  const [updatingMode, setUpdatingMode] = useState(false)
  const [updatingPush, setUpdatingPush] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

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

  async function setMode(mode: "EXECUWELL" | "VITAAI") {
    if (liff.status !== "ready" || !data || data.userMode === mode || updatingMode) return
    setUpdatingMode(true)
    const prev = data.userMode
    setData({ ...data, userMode: mode }) // optimistic
    try {
      const res = await fetch(`${API_CONFIG.BASE_URL}/line/liff/mode`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lineUserId: liff.lineUserId, mode }),
      })
      if (!res.ok) throw new Error("変更に失敗しました")
      showToast(`${mode === "VITAAI" ? "VitaAI" : "ExecuWell"} に切り替えました`)
    } catch (err) {
      setData({ ...data, userMode: prev }) // revert
      showToast("変更に失敗しました。もう一度お試しください。")
    } finally {
      setUpdatingMode(false)
    }
  }

  async function setMorningPush(enabled: boolean) {
    if (liff.status !== "ready" || !data || data.morningPushEnabled === enabled || updatingPush) return
    setUpdatingPush(true)
    const prev = data.morningPushEnabled
    setData({ ...data, morningPushEnabled: enabled }) // optimistic
    try {
      const res = await fetch(`${API_CONFIG.BASE_URL}/line/liff/morning-push`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lineUserId: liff.lineUserId, enabled }),
      })
      if (!res.ok) throw new Error("変更に失敗しました")
      showToast(enabled ? "朝のプッシュ通知を ON にしました" : "朝のプッシュ通知を OFF にしました")
    } catch (err) {
      setData({ ...data, morningPushEnabled: prev }) // revert
      showToast("変更に失敗しました。もう一度お試しください。")
    } finally {
      setUpdatingPush(false)
    }
  }

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

        {/* AXEL banner — shown when active INTEGRATED subscription exists */}
        {data.activeStripeSubscription?.subscriptionType === "INTEGRATED" && (
          <div className="rounded-2xl border border-[#C9A86A]/40 bg-gradient-to-br from-[#1E3A5F] to-[#0F2342] p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#C9A86A]" />
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#C9A86A]">AXEL ACTIVE</p>
            </div>
            <p className="mt-2 font-serif text-base text-white">
              判断力と健康を統合的に支援する <span className="font-bold text-[#C9A86A]">AXEL モード</span>で稼働中です。
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-white/65">
              LINE チャットでは、思考特性 ／ 遺伝子傾向 ／ 直近ログを横断した1つの応答をお返しします。
            </p>
          </div>
        )}

        {/* AXEL HOME — unified 判断+体調+next-action snapshot.
            Single board so the user sees their current state and the one explicit
            "next thing to do", rather than being lost in feature menus. */}
        {data.home && (
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#C9A86A]" />
              <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#2D5A8E]">AXEL HOME</p>
              <span className="ml-auto text-[10px] text-gray-400">
                {new Date().toLocaleDateString("ja-JP", { month: "long", day: "numeric", weekday: "short" })}
              </span>
            </div>

            {/* Today's body + decision side-by-side */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-gray-100 bg-gradient-to-br from-rose-50/40 to-white p-3">
                <div className="flex items-center gap-1.5">
                  <HeartPulse className="h-3.5 w-3.5 text-rose-400" />
                  <p className="text-[10px] font-bold tracking-wider text-gray-500">体調</p>
                </div>
                {data.home.today ? (
                  <>
                    <div className="mt-2 flex items-baseline gap-1.5">
                      <span className="text-2xl font-bold tabular-nums" style={{ color: data.home.today.stateLevel != null && data.home.today.stateLevel >= 3 ? "#EF4444" : data.home.today.stateLevel === 2 ? "#F59E0B" : "#10B981" }}>
                        {data.home.today.stateLevel ?? "—"}
                      </span>
                      <span className="text-[9px] text-gray-400">/5</span>
                      <span className="ml-1 text-[10px] text-gray-500">疲労 {data.home.today.fatigueLevel ?? "—"}</span>
                    </div>
                    {data.home.today.comment && (
                      <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-gray-500">{data.home.today.comment}</p>
                    )}
                  </>
                ) : (
                  <p className="mt-2 text-[10.5px] text-gray-400">本日未記録</p>
                )}
              </div>
              <div className="rounded-xl border border-gray-100 bg-gradient-to-br from-blue-50/40 to-white p-3">
                <div className="flex items-center gap-1.5">
                  <Brain className="h-3.5 w-3.5 text-blue-400" />
                  <p className="text-[10px] font-bold tracking-wider text-gray-500">判断</p>
                </div>
                {data.home.lastDecision ? (
                  <>
                    <div className="mt-2 flex items-baseline gap-1.5">
                      <span className="text-[11px] font-semibold" style={{ color: data.home.lastDecision.hasImportantDecision ? "#1E3A5F" : "#9CA3AF" }}>
                        {data.home.lastDecision.hasImportantDecision ? "重要" : "通常"}
                      </span>
                      {data.home.lastDecision.hesitationLevel != null && (
                        <span className="text-[10px] text-gray-500">迷い度 {data.home.lastDecision.hesitationLevel}</span>
                      )}
                    </div>
                    {data.home.lastDecision.content && (
                      <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-gray-500">{data.home.lastDecision.content}</p>
                    )}
                  </>
                ) : (
                  <p className="mt-2 text-[10.5px] text-gray-400">判断ログなし</p>
                )}
              </div>
            </div>

            {/* Last AXEL reply preview */}
            {data.home.lastAxelReply && (
              <div className="mt-2.5 rounded-xl border border-[#C9A86A]/30 bg-gradient-to-br from-[#FAF7F0] to-white p-3">
                <div className="flex items-center gap-1.5">
                  <MessageSquare className="h-3 w-3 text-[#C9A86A]" />
                  <p className="text-[10px] font-bold tracking-wider text-[#9B7C3F]">前回の AXEL からの応答</p>
                </div>
                <p className="mt-1.5 line-clamp-2 text-[11px] leading-snug text-gray-700">{data.home.lastAxelReply.snippet}…</p>
              </div>
            )}

            {/* Next action — single explicit CTA */}
            <div className="mt-3 rounded-xl bg-[#1E3A5F] p-3">
              <p className="text-[9.5px] font-bold tracking-[0.3em] text-[#C9A86A]">NEXT ACTION</p>
              <p className="mt-1 text-[13px] font-semibold text-white">{data.home.nextAction.label}</p>
              <p className="mt-1 text-[10.5px] leading-relaxed text-white/70">{data.home.nextAction.detail}</p>
              {data.home.nextAction.url && (
                <a
                  href={data.home.nextAction.url}
                  className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#C9A86A] px-3 py-1.5 text-[10.5px] font-bold text-[#1E3A5F]"
                >
                  進む <ArrowRight className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        )}

        {/* Onboarding progress — shown until ACTIVE */}
        {onb && onb.step !== "ACTIVE" && (
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <ArrowRight className="h-4 w-4" style={{ color: "#2D5A8E" }} />
              <p className="text-xs font-semibold" style={{ color: "#2D5A8E" }}>AXEL ご利用の流れ</p>
              <span className="ml-auto rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
                {ONBOARDING_STEPS.findIndex((s) => s.key === onb.step) + 1} / {ONBOARDING_STEPS.length}
              </span>
            </div>
            <ol className="space-y-2">
              {ONBOARDING_STEPS.map((s, i) => {
                const currentIdx = ONBOARDING_STEPS.findIndex((x) => x.key === onb.step)
                const status: "done" | "current" | "todo" = i < currentIdx ? "done" : i === currentIdx ? "current" : "todo"
                return (
                  <li key={s.key} className="flex items-center gap-3 text-[13px]">
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
                      {s.label}
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

        {/* Mode — interactive segmented control */}
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Repeat2 className="h-4 w-4" style={{ color: "#2D5A8E" }} />
            <p className="text-xs font-semibold" style={{ color: "#2D5A8E" }}>サービスモード</p>
            {updatingMode && <Loader2 className="ml-auto h-3.5 w-3.5 animate-spin text-gray-400" />}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={updatingMode}
              onClick={() => setMode("EXECUWELL")}
              className={`flex items-center justify-center gap-2 rounded-xl border-2 px-3 py-3 text-sm font-semibold transition-all ${
                data.userMode === "EXECUWELL"
                  ? "border-[#1E3A5F] bg-[#1E3A5F] text-white shadow-md"
                  : "border-gray-200 bg-gray-50 text-gray-500"
              }`}
            >
              <Brain className="h-4 w-4" />
              ExecuWell
            </button>
            <button
              type="button"
              disabled={updatingMode}
              onClick={() => setMode("VITAAI")}
              className={`flex items-center justify-center gap-2 rounded-xl border-2 px-3 py-3 text-sm font-semibold transition-all ${
                data.userMode === "VITAAI"
                  ? "border-[#1E3A5F] bg-[#1E3A5F] text-white shadow-md"
                  : "border-gray-200 bg-gray-50 text-gray-500"
              }`}
            >
              <HeartPulse className="h-4 w-4" />
              VitaAI
            </button>
          </div>
          <p className="mt-2.5 text-[11px] leading-relaxed text-gray-400">
            {data.activeStripeSubscription?.subscriptionType === "INTEGRATED"
              ? "統合プラン契約中 — AXELが自動有効。ここでは単独モードに切り替えも可能です。"
              : "タップで即時切り替え。LINEでも「/switch」で切り替えできます。"}
          </p>
        </div>

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
              <button
                type="button"
                onClick={openBillingPortal}
                className="mt-2 w-full rounded-lg border border-[#1E3A5F] px-4 py-2 text-xs font-semibold text-[#1E3A5F]"
              >
                お支払い・解約の管理
              </button>
            </div>
          ) : (
            <div className="py-2 text-center">
              <p className="text-sm text-gray-400">有効なプランがありません</p>
              <a
                href="https://execuwell.jp/subscription"
                className="mt-2 inline-block rounded-lg bg-[#1E3A5F] px-4 py-2 text-xs font-semibold text-white"
              >
                プランを見る
              </a>
            </div>
          )}
        </div>

        {/* Notifications — interactive toggle */}
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Bell className="h-4 w-4" style={{ color: "#2D5A8E" }} />
            <p className="text-xs font-semibold" style={{ color: "#2D5A8E" }}>通知設定</p>
            {updatingPush && <Loader2 className="ml-auto h-3.5 w-3.5 animate-spin text-gray-400" />}
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-700">朝のプッシュ通知</p>
              <p className="mt-0.5 text-[11px] text-gray-400">毎朝の状態確認を促す通知</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={data.morningPushEnabled}
              disabled={updatingPush}
              onClick={() => setMorningPush(!data.morningPushEnabled)}
              className="flex-shrink-0"
              style={{
                position: "relative",
                display: "inline-block",
                width: "52px",
                height: "32px",
                borderRadius: "999px",
                border: "none",
                padding: 0,
                margin: 0,
                cursor: updatingPush ? "default" : "pointer",
                background: data.morningPushEnabled ? "#1E3A5F" : "#cbd5e1",
                transition: "background-color 200ms ease",
                opacity: updatingPush ? 0.6 : 1,
                WebkitAppearance: "none",
                appearance: "none",
                outline: "none",
                boxSizing: "border-box",
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: "3px",
                  left: "3px",
                  width: "26px",
                  height: "26px",
                  borderRadius: "50%",
                  background: "#ffffff",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.18), 0 1px 2px rgba(0,0,0,0.12)",
                  transition: "transform 200ms ease",
                  transform: data.morningPushEnabled ? "translateX(20px)" : "translateX(0)",
                  boxSizing: "border-box",
                  pointerEvents: "none",
                }}
              />
            </button>
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
