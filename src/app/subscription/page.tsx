"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Check, HeartPulse, Brain, Crown, ArrowRight, Loader2, CreditCard } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { ProtectedRoute } from "@/features/auth/components/protected-route"
import { toast } from "react-toastify"
import { apiClient } from "@/lib/api"
import Link from "next/link"
import { supabase } from "@/lib/supabase"

type PlanType = "VITAAI" | "EXECUWELL" | "INTEGRATED"

type Plan = {
  id: PlanType
  name: string
  nameEn: string
  subtitle: string
  monthlyPrice: number
  enrollmentFee: number
  icon: React.ReactNode
  features: string[]
  description: string
  gradient: string
  buttonColor: string
}

const plans: Plan[] = [
  {
    id: "VITAAI",
    name: "VitaAI",
    nameEn: "VitaAI",
    subtitle: "コンディション最適化",
    monthlyPrice: 10000,
    enrollmentFee: 20000,
    icon: <HeartPulse className="h-8 w-8 text-[#0F2342]" />,
    features: [
      "パーソナライズされたコンディション最適化",
      "遺伝子解析と日々のアドバイス",
      "月次パフォーマンスレビュー",
    ],
    description: "管理栄養士(戦略) × AI (実行)",
    gradient: "from-[#00D1B2] to-[#00A693]",
    buttonColor: "bg-[#00D1B2] hover:bg-[#00A693]",
  },
  {
    id: "EXECUWELL",
    name: "ExecuWell",
    nameEn: "ExecuWell",
    subtitle: "意思決定支援",
    monthlyPrice: 10000,
    enrollmentFee: 20000,
    icon: <Brain className="h-8 w-8 text-[#0F2342]" />,
    features: [
      "パーソナライズされた経営アドバイス",
      "日々の意思決定サポート",
      "週次エグゼクティブレポートと分析",
    ],
    description: "コンサル(戦略) × AI (相談相手)",
    gradient: "from-[#7C3AED] to-[#5B21B6]",
    buttonColor: "bg-[#7C3AED] hover:bg-[#5B21B6]",
  },
  {
    id: "INTEGRATED",
    name: "統合プラン",
    nameEn: "統合プラン",
    subtitle: "判断 × 健康の統合プラン",
    monthlyPrice: 18000,
    enrollmentFee: 30000,
    icon: <Crown className="h-8 w-8 text-[#0F2342]" />,
    features: [
      "ExecuWell・VitaAI 両方の全機能",
      "プレミアムサポートとカスタマイズ戦略",
      "統合ダッシュボード",
      "優先サポート",
    ],
    description: "VitaAI + ExecuWell セット提供",
    gradient: "from-[#FFD700] to-[#FFA500]",
    buttonColor: "bg-gradient-to-r from-[#FFD700] to-[#FFA500] hover:from-[#FFA500] hover:to-[#FFD700]",
  },
]

function SubscriptionContent() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  // When opened from LINE (plan carousel), the recipient's LINE id is threaded
  // through so the Stripe webhook can auto-link this payment to their account.
  const lineUserId = searchParams.get("lineUserId") || undefined
  // ?plan= (e.g. from the LINE carousel) pre-highlights the matching plan card.
  const planParam = searchParams.get("plan")
  const highlightedPlan = plans.some((p) => p.id === planParam) ? (planParam as PlanType) : null
  // ?canceled=true means the user backed out of Stripe Checkout.
  const canceled = searchParams.get("canceled") === "true"
  const [loading, setLoading] = useState<string | null>(null)
  const [subscriptionData, setSubscriptionData] = useState<any>(null)
  const [loadingSubscription, setLoadingSubscription] = useState(true)

  // Scroll the pre-selected plan card into view
  useEffect(() => {
    if (!highlightedPlan) return
    document
      .getElementById(`plan-${highlightedPlan}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" })
  }, [highlightedPlan])

  // One-time notice after a canceled checkout
  useEffect(() => {
    if (!canceled) return
    toast.info("お手続きはキャンセルされました。プランはいつでもお申し込みいただけます。", {
      position: "top-right",
      autoClose: 5000,
    })
  }, [canceled])

  // Fetch current subscription status
  useEffect(() => {
    const fetchSubscription = async () => {
      if (!user) {
        setLoadingSubscription(false)
        return
      }

      try {
        // Ensure we have a valid session token before making the API call
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError || !session?.access_token) {
          console.error("No valid session found:", sessionError)
          throw new Error("認証が必要です")
        }

        // Update API client with the current session token
        apiClient.setAuthToken(session.access_token)
        
        const data = await apiClient.stripe.getSubscription()
        setSubscriptionData(data)
      } catch (error) {
        console.error("Failed to fetch subscription:", error)
      } finally {
        setLoadingSubscription(false)
      }
    }

    fetchSubscription()
  }, [user])

  const currentPlan = subscriptionData?.subscription?.type || user?.subscription || null
  const isIntegrated = currentPlan === "INTEGRATED"
  const hasVitaAI = currentPlan === "VITAAI" || isIntegrated
  const hasExecuWell = currentPlan === "EXECUWELL" || isIntegrated

  const handleSubscribe = async (planId: PlanType) => {
    if (currentPlan === planId) {
      toast.info("このプランは既にご利用中です", {
        position: "top-right",
        autoClose: 3000,
      })
      return
    }

    if (!user) {
      toast.error("ログインが必要です", {
        position: "top-right",
        autoClose: 3000,
      })
      return
    }

    setLoading(planId)
    try {
      const response = await apiClient.stripe.createCheckoutSession(planId, lineUserId)
      
      // Redirect to Stripe Checkout
      if (response.url) {
        window.location.href = response.url
      } else {
        throw new Error("Checkout session URL not received")
      }
    } catch (error: any) {
      console.error("Checkout error:", error)
      toast.error(error?.response?.data?.error || "決済セッションの作成に失敗しました", {
        position: "top-right",
        autoClose: 5000,
      })
      setLoading(null)
    }
  }

  const handleManageBilling = async () => {
    if (!user) return

    setLoading("billing")
    try {
      const response = await apiClient.stripe.createPortalSession()
      if (response.url) {
        window.location.href = response.url
      }
    } catch (error: any) {
      console.error("Portal session error:", error)
      toast.error(error?.response?.data?.error || "請求管理ページの作成に失敗しました", {
        position: "top-right",
        autoClose: 5000,
      })
      setLoading(null)
    }
  }

  const getButtonText = (planId: PlanType) => {
    if (currentPlan === planId) return "現在のプラン"
    if (planId === "INTEGRATED" && (hasVitaAI || hasExecuWell)) return "アップグレード"
    if (planId === "VITAAI" && hasVitaAI) return "現在のプラン"
    if (planId === "EXECUWELL" && hasExecuWell) return "現在のプラン"
    return "プランを選択"
  }

  const isCurrentPlan = (planId: PlanType) => {
    return currentPlan === planId
  }

  const canUpgrade = (planId: PlanType) => {
    if (planId === "INTEGRATED") return true
    if (planId === "VITAAI" && !hasVitaAI) return true
    if (planId === "EXECUWELL" && !hasExecuWell) return true
    return false
  }

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
          プランを選択
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-4">
          あなたのニーズに最適なプランをお選びください
        </p>
        
        {/* Current Subscription Status */}
        {subscriptionData?.active && subscriptionData?.subscription && (
          <div className="inline-flex items-center gap-2 rounded-lg border border-primary/50 bg-primary/10 px-4 py-2 mb-4">
            <Check className="h-5 w-5 text-primary" />
            <div className="text-sm">
              <span className="font-semibold text-foreground">
                {plans.find((p) => p.id === subscriptionData.subscription.type)?.name}
              </span>
              <span className="text-muted-foreground ml-2">
                プラン利用中
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleManageBilling}
              disabled={loading === "billing"}
              className="ml-2"
            >
              {loading === "billing" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  処理中...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  請求を管理
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Plans Grid */}
      <div className="grid gap-8 md:grid-cols-3 items-stretch max-w-7xl mx-auto">
        {plans.map((plan) => {
          const isCurrent = isCurrentPlan(plan.id)
          const canUpgradePlan = canUpgrade(plan.id)
          const isRecommended = plan.id === "INTEGRATED"
          const discount = plan.id === "INTEGRATED" ? 10 : 0
          const originalPrice = plan.id === "INTEGRATED" ? 20000 : plan.monthlyPrice

          return (
            <Card
              key={plan.id}
              id={`plan-${plan.id}`}
              className={`group relative overflow-hidden border-2 transition-all duration-500 hover:shadow-2xl hover:scale-105 hover:-translate-y-2 flex flex-col h-full ${
                isRecommended
                  ? "border-[#FFD700] shadow-lg shadow-[#FFD700]/20"
                  : "border-border/50"
              } ${
                isCurrent
                  ? "ring-2 ring-primary"
                  : plan.id === highlightedPlan
                    ? "ring-2 ring-[#FFD700] ring-offset-2 ring-offset-background"
                    : ""
              }`}
            >
              {/* RECOMMENDED Badge */}
              {isRecommended && (
                <div className="absolute top-0 right-0 bg-[#FFD700] text-[#0F2342] px-4 py-1 text-xs font-bold rounded-bl-lg shadow-lg z-10">
                  RECOMMENDED
                </div>
              )}

              {/* Current Plan Badge */}
              {isCurrent && (
                <div className="absolute top-0 left-0 bg-primary text-primary-foreground px-4 py-1 text-xs font-bold rounded-br-lg shadow-lg z-10">
                  現在のプラン
                </div>
              )}

              {/* Set Discount Badge for Integrated Plan */}
              {plan.id === "INTEGRATED" && discount > 0 && (
                <div className="absolute top-12 right-0 bg-red-500 text-white px-3 py-1 text-xs font-bold rounded-l-lg shadow-lg z-10">
                  セット割
                </div>
              )}

              <CardHeader className="relative text-center pt-8">
                <div
                  className={`mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#FFD700] mx-auto shadow-lg ${
                    isCurrent ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
                  }`}
                >
                  {plan.icon}
                </div>
                <CardTitle className="text-2xl text-foreground font-bold">
                  {plan.name}
                </CardTitle>
                <CardDescription className="text-base text-[#FFD700] font-semibold uppercase">
                  {plan.subtitle}
                </CardDescription>
              </CardHeader>

              <CardContent className="relative flex flex-col flex-1">
                {/* Pricing */}
                <div className="text-center mb-6">
                  {plan.id === "INTEGRATED" && discount > 0 && (
                    <p className="text-sm text-muted-foreground mb-1">
                      単独プラン合計 ¥{originalPrice.toLocaleString()} → セットで ¥
                      {plan.monthlyPrice.toLocaleString()}
                    </p>
                  )}
                  <div className="flex items-baseline justify-center gap-2 mb-2">
                    <span
                      className={`text-4xl font-bold ${
                        isRecommended ? "text-[#FFD700]" : "text-foreground"
                      }`}
                    >
                      ¥{plan.monthlyPrice.toLocaleString()}
                    </span>
                    <span className="text-muted-foreground">/月（税別）</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    入会金 ¥{plan.enrollmentFee.toLocaleString()}（税別）
                    {plan.id === "INTEGRATED" && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        セット割
                      </Badge>
                    )}
                  </p>
                </div>

                {/* Description */}
                <p className="text-center text-sm text-muted-foreground mb-6">
                  {plan.description}
                </p>

                {/* Features */}
                <div className="flex-1 space-y-4 mb-6">
                  <h3 className="text-sm font-semibold text-foreground">含まれる内容:</h3>
                  <ul className="space-y-3">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <Check className="mr-3 h-5 w-5 text-[#FFD700] flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Button */}
                <Button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={isCurrent || loading !== null || loadingSubscription}
                  className={`w-full ${
                    isCurrent
                      ? "bg-muted text-muted-foreground cursor-not-allowed"
                      : plan.buttonColor + " text-white"
                  } transition-all duration-300`}
                  size="lg"
                >
                  {loading === plan.id ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      処理中...
                    </>
                  ) : (
                    <>
                      {getButtonText(plan.id)}
                      {!isCurrent && canUpgradePlan && (
                        <ArrowRight className="ml-2 h-4 w-4" />
                      )}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Back to Dashboard */}
      <div className="mt-8 text-center">
        <Button variant="outline" asChild>
          <Link href="/dashboard">
            <ArrowRight className="mr-2 h-4 w-4 rotate-180" />
            ダッシュボードに戻る
          </Link>
        </Button>
      </div>
    </div>
  )
}

export default function SubscriptionPage() {
  return (
    <ProtectedRoute>
      <Suspense>
        <SubscriptionContent />
      </Suspense>
    </ProtectedRoute>
  )
}

