"use client"

import { useCallback, useEffect, useState } from "react"
import { API_CONFIG } from "@/lib/config/api"
import { Loader2, AlertCircle, BookOpen, RefreshCw, MessageSquare } from "lucide-react"
import { useLiff } from "../_hooks/useLiff"

type AiMessage = { id: string; content: string; createdAt: string }
type PlanData = { displayName: string | null; messages: AiMessage[] }

function formatDay(iso: string): string {
  try { return new Date(iso).toLocaleDateString("ja-JP", { month: "long", day: "numeric", weekday: "short" }) }
  catch { return iso }
}
function formatTime(iso: string): string {
  try { return new Date(iso).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" }) }
  catch { return "" }
}
function dayKey(iso: string): string { return iso.slice(0, 10) }

function trimContent(content: string) {
  const cleaned = content.replace(/\n{3,}/g, "\n\n").trim()
  if (cleaned.length <= 220) return { preview: cleaned, full: cleaned, truncated: false }
  return { preview: cleaned.slice(0, 220) + "…", full: cleaned, truncated: true }
}

export default function LiffPlanPage() {
  const liff = useLiff()
  const [data, setData] = useState<PlanData | null>(null)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const load = useCallback(async (isRefresh = false) => {
    if (liff.status !== "ready") return
    if (isRefresh) setRefreshing(true); else setLoading(true)
    setFetchError(null)
    try {
      const res = await fetch(`${API_CONFIG.BASE_URL}/line/liff/plan?lineUserId=${encodeURIComponent(liff.lineUserId)}`)
      if (!res.ok) throw new Error(res.status === 404 ? "ユーザーが見つかりません。" : "読み込みに失敗しました。")
      setData(await res.json())
    } catch (err: any) {
      setFetchError(err.message || "読み込みに失敗しました。")
    } finally {
      setLoading(false); setRefreshing(false)
    }
  }, [liff])

  useEffect(() => { load() }, [load])

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

  // Group by day
  const groups = new Map<string, AiMessage[]>()
  for (const m of data.messages) {
    const k = dayKey(m.createdAt)
    const arr = groups.get(k) ?? []
    arr.push(m)
    groups.set(k, arr)
  }

  return (
    <div className="min-h-screen pb-10" style={{ background: "#f0f4f8" }}>
      <div className="px-4 pt-8 pb-5" style={{ background: "#1E3A5F" }}>
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            <span className="text-xs font-medium opacity-80">ExecuWell / 戦略書</span>
          </div>
          <button
            type="button"
            onClick={() => load(true)}
            disabled={refreshing}
            className="rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20 disabled:opacity-60"
            aria-label="再読み込み"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
        <h1 className="mt-1 text-xl font-bold text-white">戦略書を見る</h1>
        <p className="mt-1 text-sm text-white/70">
          {liff.status === "ready" ? liff.displayName : data.displayName} さんへのAI提案
        </p>
      </div>

      <div className="mx-auto mt-4 w-full max-w-md px-4">
        {data.messages.length === 0 ? (
          <div className="mt-2 rounded-2xl bg-white p-8 text-center shadow-sm">
            <MessageSquare className="mx-auto h-10 w-10 text-gray-300" />
            <p className="mt-3 text-sm text-gray-500">AIからの提案がまだありません。</p>
            <p className="mt-1 text-xs text-gray-400">LINEでAIに相談すると、ここに自動で蓄積されます。</p>
            <button
              type="button"
              onClick={async () => {
                try {
                  // Same (already initialized) SDK instance loaded by useLiff.
                  const liffSdk = (await import("@line/liff")).default
                  liffSdk.closeWindow()
                } catch { /* noop — outside LIFF there is nothing to close */ }
              }}
              className="mt-4 inline-block rounded-lg bg-[#1E3A5F] px-4 py-2 text-xs font-semibold text-white"
            >
              LINEでAIに相談する
            </button>
          </div>
        ) : (
          <>
            <p className="mb-3 px-1 text-xs text-gray-500">
              {data.messages.length}件の提案（新しい順）
            </p>
            <div className="space-y-5">
              {Array.from(groups.entries()).map(([day, items]) => (
                <div key={day}>
                  <p className="mb-2 px-1 text-xs font-bold text-gray-400">{formatDay(items[0].createdAt)}</p>
                  <div className="space-y-3">
                    {items.map((msg) => {
                      const { preview, full, truncated } = trimContent(msg.content)
                      const isExpanded = !!expanded[msg.id]
                      return (
                        <div key={msg.id} className="rounded-2xl bg-white p-4 shadow-sm">
                          <p className="mb-2 text-[11px] font-medium text-gray-400">{formatTime(msg.createdAt)}</p>
                          <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
                            {isExpanded ? full : preview}
                          </p>
                          {truncated && (
                            <button
                              onClick={() => setExpanded((prev) => ({ ...prev, [msg.id]: !prev[msg.id] }))}
                              className="mt-2 text-xs font-semibold"
                              style={{ color: "#2D5A8E" }}
                            >
                              {isExpanded ? "折りたたむ" : "続きを読む"}
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
