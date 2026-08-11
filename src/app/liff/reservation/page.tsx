"use client"

import { useCallback, useEffect, useState } from "react"
import { API_CONFIG } from "@/lib/config/api"
import {
  Loader2, AlertCircle, CalendarCheck, CalendarPlus, CalendarClock, RefreshCw, ExternalLink, ChevronRight, Stethoscope,
} from "lucide-react"
import { useLiff } from "../_hooks/useLiff"

type ReservationType = {
  key: string
  label: string
}

type ReservationData = {
  bookingUrl: string
  types: ReservationType[]
}

// Cycle through calendar icons so each type card gets a distinct visual cue.
const TYPE_ICONS = [CalendarPlus, CalendarCheck, CalendarClock] as const

function withCategory(url: string, key: string): string {
  const sep = url.includes("?") ? "&" : "?"
  return `${url}${sep}category=${encodeURIComponent(key)}`
}

export default function LiffReservationPage() {
  const liff = useLiff()
  const [data, setData] = useState<ReservationData | null>(null)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const load = useCallback(async (isRefresh = false) => {
    if (liff.status !== "ready") return
    if (isRefresh) setRefreshing(true); else setLoading(true)
    setFetchError(null)
    try {
      const res = await fetch(`${API_CONFIG.BASE_URL}/line/liff/reservation?lineUserId=${encodeURIComponent(liff.lineUserId)}`)
      if (!res.ok) throw new Error(res.status === 404 ? "ユーザーが見つかりません。" : "読み込みに失敗しました。")
      setData(await res.json() as ReservationData)
    } catch (err: unknown) {
      setFetchError(err instanceof Error ? err.message : "読み込みに失敗しました。")
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

  const types = data.types ?? []

  return (
    <div className="min-h-screen pb-10" style={{ background: "#f0f4f8" }}>
      <div className="px-4 pt-8 pb-5" style={{ background: "#1E3A5F" }}>
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <CalendarCheck className="h-5 w-5" />
            <span className="text-xs font-medium opacity-80">VitaAI / 面談予約</span>
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
        <h1 className="mt-1 text-xl font-bold text-white">面談予約</h1>
        <p className="mt-1 text-sm text-white/70">
          {liff.status === "ready" ? liff.displayName : "ゲスト"} さん
        </p>
      </div>

      <div className="mx-auto mt-4 w-full max-w-md space-y-4 px-4">

        {/* Intro */}
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center gap-2">
            <Stethoscope className="h-4 w-4" style={{ color: "#C9A86A" }} />
            <p className="text-xs font-semibold" style={{ color: "#2D5A8E" }}>カウンセリング予約</p>
          </div>
          <p className="text-[13px] leading-relaxed text-gray-600">
            管理栄養士とのカウンセリングを予約できます。ご希望の面談種別をお選びください。
          </p>
        </div>

        {/* Reservation types */}
        {types.length > 0 ? (
          <div className="space-y-3">
            <p className="px-1 text-[11px] font-bold uppercase tracking-widest" style={{ color: "#2D5A8E" }}>面談種別</p>
            {types.map((t, i) => {
              const Icon = TYPE_ICONS[i % TYPE_ICONS.length]
              return (
                <a
                  key={t.key}
                  href={withCategory(data.bookingUrl, t.key)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-colors hover:border-[#C9A86A]/40 hover:bg-[#C9A86A]/5 active:bg-gray-50"
                >
                  <span
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
                    style={{ background: "#1E3A5F" }}
                  >
                    <Icon className="h-5 w-5 text-white" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-gray-800">{t.label}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-[11px] text-gray-400">
                      <ExternalLink className="h-3 w-3" />
                      予約フォームを開く
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-300" />
                </a>
              )
            })}
          </div>
        ) : data.bookingUrl ? (
          // No specific types returned — offer a single generic booking entry.
          <a
            href={data.bookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-semibold text-white shadow-sm"
            style={{ background: "#1E3A5F" }}
          >
            <CalendarCheck className="h-4 w-4" />
            予約フォームを開く
          </a>
        ) : (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <CalendarCheck className="mx-auto h-10 w-10 text-gray-300" />
            <p className="mt-3 text-sm text-gray-500">現在ご予約いただける面談はありません。</p>
            <p className="mt-1 text-xs text-gray-400">準備が整い次第、LINE でご案内いたします。</p>
          </div>
        )}

        {/* Note */}
        <p className="px-1 text-[10px] leading-relaxed text-gray-400">
          ※ 現在は予約フォームが別画面で開きます。アプリ内で日時を選べる予約カレンダーは今後追加予定です。
        </p>
      </div>
    </div>
  )
}
