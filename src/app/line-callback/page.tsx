"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { apiClient } from "@/lib/api/api-client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, XCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

/**
 * Inner content that uses useSearchParams — must be inside Suspense for Next.js prerender.
 */
function LineCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState<string>("")

  useEffect(() => {
    const code = searchParams.get("code")
    const state = searchParams.get("state")
    const error = searchParams.get("error")

    if (error) {
      setStatus("error")
      setMessage("LINEログインがキャンセルされたか、失敗しました。")
      return
    }

    if (!code || !state) {
      setStatus("error")
      setMessage("不正なアクセスです。もう一度お試しください。")
      return
    }

    const expectedState = sessionStorage.getItem("line_login_state")
    if (!expectedState || state !== expectedState) {
      setStatus("error")
      setMessage("セキュリティ確認に失敗しました。もう一度お試しください。")
      sessionStorage.removeItem("line_login_state")
      return
    }

    handleOAuthCallback(code, state, expectedState)
  }, [searchParams])

  async function handleOAuthCallback(code: string, state: string, expectedState: string) {
    try {
      const result = await apiClient.line.linkOAuth(code, state, expectedState)
      sessionStorage.removeItem("line_login_state")
      setStatus("success")
      setMessage(`LINEアカウントを連携しました（${result.displayName || result.lineUserId}さん）`)
      setTimeout(() => router.push("/profile?tab=line"), 2000)
    } catch (err: any) {
      console.error("[LINE Callback] Error:", err)
      setStatus("error")
      setMessage("連携処理に失敗しました。時間をおいて再度お試しください。")
      sessionStorage.removeItem("line_login_state")
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">LINE連携</CardTitle>
          <CardDescription>アカウントを連携しています...</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {status === "loading" && (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">処理中...</p>
            </>
          )}
          {status === "success" && (
            <>
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <p className="text-sm text-center font-medium text-green-700">{message}</p>
              <p className="text-xs text-muted-foreground">プロフィールページへ移動します...</p>
            </>
          )}
          {status === "error" && (
            <>
              <XCircle className="h-12 w-12 text-red-500" />
              <p className="text-sm text-center font-medium text-red-700">{message}</p>
              <Button onClick={() => router.push("/profile?tab=line")} className="mt-4">
                プロフィールに戻る
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * LINE Login OAuth callback page.
 * LINE redirects here after authorization: /line-callback?code=XXX&state=YYY
 */
export default function LineCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">LINE連携</CardTitle>
              <CardDescription>アカウントを連携しています...</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">読み込み中...</p>
            </CardContent>
          </Card>
        </div>
      }
    >
      <LineCallbackContent />
    </Suspense>
  )
}
