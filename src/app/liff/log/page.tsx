"use client"

import { useState } from "react"
import { API_CONFIG } from "@/lib/config/api"
import { Loader2, CheckCircle2, AlertCircle, PenLine } from "lucide-react"
import { useLiff } from "../_hooks/useLiff"

const LEVELS = [
  { v: 1 as const, label: "良い" },
  { v: 2 as const, label: "普通" },
  { v: 3 as const, label: "重い" },
]

export default function LiffLogPage() {
  const liff = useLiff()

  const [stateLevel, setStateLevel] = useState<1 | 2 | 3 | null>(null)
  const [fatigueLevel, setFatigueLevel] = useState<1 | 2 | 3 | null>(null)
  const [comment, setComment] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [advice, setAdvice] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (liff.status !== "ready") return
    if (stateLevel == null || fatigueLevel == null) return
    setSubmitting(true)
    setError(null)
    setAdvice(null)
    try {
      const res = await fetch(`${API_CONFIG.BASE_URL}/line/liff/log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lineUserId: liff.lineUserId,
          stateLevel,
          fatigueLevel,
          comment: comment.trim() || undefined,
        }),
      })
      if (!res.ok) throw new Error("保存に失敗しました。もう一度お試しください。")

      let adviceText: string | null = null
      try {
        const advRes = await fetch(`${API_CONFIG.BASE_URL}/line/liff/advice`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lineUserId: liff.lineUserId }),
        })
        if (advRes.ok) {
          const data = await advRes.json()
          if (typeof data.advice === "string" && data.advice.trim()) {
            adviceText = data.advice.trim()
          }
        }
      } catch {
        // Advice is optional; ignore failures.
      }

      setAdvice(adviceText)
      setDone(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "保存に失敗しました。")
    } finally {
      setSubmitting(false)
    }
  }

  if (liff.status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#f0f4f8" }}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin" style={{ color: "#2D5A8E" }} />
          <p className="text-sm text-gray-500">読み込み中...</p>
        </div>
      </div>
    )
  }

  if (liff.status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "#f0f4f8" }}>
        <div className="flex w-full max-w-sm flex-col items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <AlertCircle className="h-10 w-10 text-amber-500" />
          <p className="text-center text-sm text-amber-900">{liff.message}</p>
        </div>
      </div>
    )
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "#f0f4f8" }}>
        <div className="w-full max-w-sm space-y-4 text-center">
          <CheckCircle2 className="mx-auto h-14 w-14" style={{ color: "#2D5A8E" }} />
          <p className="text-lg font-semibold" style={{ color: "#1E3A5F" }}>記録しました</p>
          {advice ? (
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-left text-sm leading-relaxed text-slate-800 shadow-sm">
              <p className="mb-1 text-xs font-semibold text-slate-500">即時フィードバック</p>
              <p>{advice}</p>
            </div>
          ) : (
            <p className="text-sm text-gray-500">今日のログが保存されました。</p>
          )}
          <button
            type="button"
            onClick={() => {
              setDone(false)
              setStateLevel(null)
              setFatigueLevel(null)
              setComment("")
              setAdvice(null)
            }}
            className="mt-2 w-full rounded-xl py-3 text-sm font-semibold text-white"
            style={{ background: "#2D5A8E" }}
          >
            もう一度記録する
          </button>
        </div>
      </div>
    )
  }

  const canSubmit = stateLevel != null && fatigueLevel != null

  return (
    <div className="min-h-screen pb-10" style={{ background: "#f0f4f8" }}>
      <div className="px-4 pt-8 pb-4" style={{ background: "#1E3A5F" }}>
        <div className="flex items-center gap-2 text-white">
          <PenLine className="h-5 w-5" />
          <span className="text-xs font-medium opacity-80">VitaAI / 今日の記録</span>
        </div>
        <h1 className="mt-1 text-xl font-bold text-white">5秒コンディション</h1>
        <p className="mt-1 text-xs text-white/60">{liff.displayName} さん — 状態と疲労をタップ</p>
      </div>

      <form onSubmit={handleSubmit} className="mx-auto mt-4 w-full max-w-md space-y-4 px-4">
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="mb-3 text-xs font-semibold" style={{ color: "#2D5A8E" }}>今日の状態（3段階）</p>
          <div className="grid grid-cols-3 gap-2">
            {LEVELS.map(({ v, label }) => (
              <button
                key={`s-${v}`}
                type="button"
                onClick={() => setStateLevel(v)}
                className={`rounded-lg py-3 text-sm font-semibold transition ${
                  stateLevel === v ? "text-white ring-2 ring-offset-2 ring-blue-300" : "bg-gray-50 text-gray-700"
                }`}
                style={stateLevel === v ? { background: "#2D5A8E" } : undefined}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="mb-3 text-xs font-semibold" style={{ color: "#2D5A8E" }}>疲労（3段階）</p>
          <div className="grid grid-cols-3 gap-2">
            {LEVELS.map(({ v, label }) => (
              <button
                key={`f-${v}`}
                type="button"
                onClick={() => setFatigueLevel(v)}
                className={`rounded-lg py-3 text-sm font-semibold transition ${
                  fatigueLevel === v ? "text-white ring-2 ring-offset-2 ring-blue-300" : "bg-gray-50 text-gray-700"
                }`}
                style={fatigueLevel === v ? { background: "#1E3A5F" } : undefined}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-white p-4 shadow-sm">
          <label className="mb-2 block text-xs font-semibold" style={{ color: "#2D5A8E" }}>
            一言（任意）
          </label>
          <textarea
            rows={2}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="睡眠・会議・体調の補足など"
            className="w-full resize-none rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
          />
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <p className="text-xs text-amber-800">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || !canSubmit}
          className="w-full rounded-xl py-3.5 text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: submitting ? "#2D5A8E99" : "#1E3A5F" }}
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              保存とフィードバック取得中...
            </span>
          ) : (
            "記録してフィードバックを見る"
          )}
        </button>
      </form>
    </div>
  )
}
