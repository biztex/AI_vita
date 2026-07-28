"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2, AlertCircle } from "lucide-react"

const ALLOWED_PATHS = ["/log", "/karte", "/plan", "/mypage", "/onboarding"]

function LiffRouter() {
  const params = useSearchParams()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const state = params.get("liff.state")

    if (!state || !ALLOWED_PATHS.includes(state)) {
      setError("無効なアクセスです。LINEのメニューからお開きください。")
      return
    }

    async function initAndRedirect() {
      try {
        // Process LIFF auth tokens here so the destination page can use
        // the cached auth state when it calls liff.init() via useLiff().
        const liff = (await import("@line/liff")).default
        await liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID_PAGES! })
      } catch {
        // If init fails, useLiff on the destination page will handle re-auth.
      }
      router.replace(`/liff${state}`)
    }

    initAndRedirect()
  }, [params, router])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "#f0f4f8" }}>
        <div className="flex w-full max-w-sm flex-col items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <AlertCircle className="h-10 w-10 text-amber-500" />
          <p className="text-center text-sm text-amber-900">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#f0f4f8" }}>
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-10 w-10 animate-spin" style={{ color: "#2D5A8E" }} />
        <p className="text-sm text-gray-500">読み込み中...</p>
      </div>
    </div>
  )
}

export default function LiffIndexPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ background: "#f0f4f8" }}>
          <Loader2 className="h-10 w-10 animate-spin" style={{ color: "#2D5A8E" }} />
        </div>
      }
    >
      <LiffRouter />
    </Suspense>
  )
}
