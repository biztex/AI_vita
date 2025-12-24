"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, Loader2, ArrowRight } from "lucide-react"
import { ProtectedRoute } from "@/features/auth/components/protected-route"
import { toast } from "react-toastify"
import Link from "next/link"
import { apiClient } from "@/lib/api"

function SuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const sessionId = searchParams.get("session_id")
  const [loading, setLoading] = useState(true)
  const [subscription, setSubscription] = useState<any>(null)

  useEffect(() => {
    if (!sessionId) {
      toast.error("セッションIDが見つかりません", {
        position: "top-right",
        autoClose: 3000,
      })
      router.push("/subscription")
      return
    }

    // Wait a moment for webhook to process, then fetch subscription
    const checkSubscription = async () => {
      try {
        console.log("[StripeSuccess] Waiting for webhook to process...")
        // Wait 3 seconds for webhook to process and auth to stabilize
        await new Promise((resolve) => setTimeout(resolve, 3000))
        
        console.log("[StripeSuccess] Fetching subscription...")
        const data = await apiClient.stripe.getSubscription()
        console.log("[StripeSuccess] Subscription data:", data)
        
        if (data.active && data.subscription) {
          setSubscription(data.subscription)
          toast.success("サブスクリプションが正常にアクティベートされました", {
            position: "top-right",
            autoClose: 3000,
          })
        } else {
          console.log("[StripeSuccess] Subscription not active yet, retrying in 3 seconds...")
          // Retry once more after another 3 seconds
          await new Promise((resolve) => setTimeout(resolve, 3000))
          const retryData = await apiClient.stripe.getSubscription()
          console.log("[StripeSuccess] Retry subscription data:", retryData)
          
          if (retryData.active && retryData.subscription) {
            setSubscription(retryData.subscription)
            toast.success("サブスクリプションが正常にアクティベートされました", {
              position: "top-right",
              autoClose: 3000,
            })
          } else {
            toast.warning("サブスクリプションの確認に時間がかかっています。しばらくお待ちください。", {
              position: "top-right",
              autoClose: 5000,
            })
          }
        }
      } catch (error) {
        console.error("[StripeSuccess] Failed to fetch subscription:", error)
        toast.error("サブスクリプション情報の取得に失敗しました", {
          position: "top-right",
          autoClose: 5000,
        })
      } finally {
        setLoading(false)
      }
    }

    checkSubscription()
  }, [sessionId, router])

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            {loading ? (
              <>
                <Loader2 className="h-16 w-16 mx-auto mb-4 animate-spin text-primary" />
                <CardTitle className="text-2xl">処理中...</CardTitle>
                <CardDescription>
                  サブスクリプションを確認しています
                </CardDescription>
              </>
            ) : subscription ? (
              <>
                <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-green-500" />
                <CardTitle className="text-2xl">ご登録ありがとうございます！</CardTitle>
                <CardDescription>
                  サブスクリプションが正常にアクティベートされました
                </CardDescription>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-yellow-500" />
                <CardTitle className="text-2xl">決済が完了しました</CardTitle>
                <CardDescription>
                  サブスクリプションの確認に時間がかかっている場合があります
                </CardDescription>
              </>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {subscription && (
              <div className="rounded-lg border border-border/50 bg-card/50 p-4">
                <h3 className="font-semibold mb-2">サブスクリプション情報</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">プラン:</span>
                    <span className="font-medium">{subscription.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ステータス:</span>
                    <span className="font-medium text-green-500">アクティブ</span>
                  </div>
                  {subscription.currentPeriodEnd && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">次回請求日:</span>
                      <span className="font-medium">
                        {new Date(subscription.currentPeriodEnd).toLocaleDateString("ja-JP")}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <Button asChild size="lg" className="w-full">
                <Link href="/dashboard">
                  ダッシュボードに戻る
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" asChild className="w-full">
                <Link href="/subscription">
                  プランページに戻る
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function SuccessPage() {
  return (
    <ProtectedRoute>
      <SuccessContent />
    </ProtectedRoute>
  )
}

