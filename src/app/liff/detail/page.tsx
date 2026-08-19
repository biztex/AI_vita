"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { API_CONFIG } from "@/lib/config/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, AlertCircle } from "lucide-react"

type Sections = {
  要点整理: string
  判断軸: string
  リスク: string
  推奨アクション: string
  補足: string
}

function DetailContent() {
  const searchParams = useSearchParams()

  const getParam = (name: string): string | null => {
    const direct = searchParams.get(name)
    if (direct) return direct

    // LIFF often stores original query under `liff.state`
    const state = searchParams.get("liff.state")
    if (!state) return null
    try {
      const decoded = decodeURIComponent(state)
      const query = decoded.startsWith("?") ? decoded.slice(1) : decoded
      return new URLSearchParams(query).get(name)
    } catch {
      return null
    }
  }

  const messageId = getParam("messageId")
  const lineUserId = getParam("lineUserId")

  const [sections, setSections] = useState<Sections | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!messageId || !lineUserId) {
      setError("パラメータが不足しています。LINEから「詳細を見る」をタップして開いてください。")
      setLoading(false)
      return
    }

    const url = `${API_CONFIG.BASE_URL}/line/message/${encodeURIComponent(messageId)}?lineUserId=${encodeURIComponent(lineUserId)}`
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 404 ? "メッセージが見つかりません。" : "読み込みに失敗しました。")
        return res.json()
      })
      .then((data: { sections: Sections }) => {
        setSections(data.sections)
      })
      .catch((err) => {
        setError(err.message || "読み込みに失敗しました。")
      })
      .finally(() => setLoading(false))
  }, [messageId, lineUserId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-stone-500" />
          <p className="text-sm text-stone-500">読み込み中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4">
        <Card className="max-w-md w-full border-amber-200 bg-amber-50/50">
          <CardContent className="pt-6 flex flex-col items-center gap-3">
            <AlertCircle className="h-10 w-10 text-amber-600" />
            <p className="text-sm text-center text-stone-700">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!sections) return null

  // Always render required sections for Phase1 (never blank).
  const sectionOrder: (keyof Sections)[] = ["要点整理", "判断軸", "リスク", "推奨アクション", "補足"]
  const fallbackText: Record<keyof Sections, string> = {
    要点整理: "この相談からは要点を自動整理できませんでした。",
    判断軸: "判断材料が不足しています。状況・制約・期限のうち1点だけ追記してください。",
    リスク: "リスクの整理はまだありません。気になる点をLINEでAXELに聞いてみてください。",
    推奨アクション: "次の一手はまだ整理されていません。LINEでAXELに相談すると、ここに反映されます。",
    補足: "",
  }

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-6">
      <div className="mx-auto w-full max-w-md">
        <Card className="border-border/60 bg-card shadow-sm">
          <CardHeader className="pb-3">
            <p className="text-xs font-medium text-muted-foreground">ExecuWell / 判断整理</p>
            <CardTitle className="mt-1 text-lg font-semibold text-foreground">今回の意思決定の整理</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            {sectionOrder.map((key) => {
              const value = (sections[key] || "").trim() || fallbackText[key]
              if (key === "補足" && !value.trim()) return null

              return (
                <div key={key} className="border-t border-border/50 pt-3 first:border-t-0 first:pt-0">
                  <p className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground">{key}</p>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{value}</p>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function LiffDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-stone-50">
          <Loader2 className="h-10 w-10 animate-spin text-stone-500" />
        </div>
      }
    >
      <DetailContent />
    </Suspense>
  )
}
