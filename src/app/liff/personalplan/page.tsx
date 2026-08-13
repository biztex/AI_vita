"use client"

import { useCallback, useEffect, useState } from "react"
import { API_CONFIG } from "@/lib/config/api"
import {
  Loader2, AlertCircle, ClipboardCheck, RefreshCw, CalendarClock, History, ChevronDown,
  Utensils, Moon, Dumbbell, Wine, Target, NotebookPen, GlassWater, type LucideIcon,
} from "lucide-react"
import { useLiff } from "../_hooks/useLiff"

type PlanPayload = Record<string, unknown>

type Plan = {
  version: number | null
  effectiveFrom: string | null
  nextReviewAt: string | null
  updatedAt: string | null
  payload: PlanPayload
}

type HistoryItem = {
  version: number | null
  effectiveFrom: string | null
  nextReviewAt: string | null
  isActive: boolean
}

type PersonalPlanData = {
  hasPlan: boolean
  plan: Plan | null
  history: HistoryItem[]
}

const ACCENT = "#C9A86A"

function formatFullDate(iso: string | null): string {
  if (!iso) return "未定"
  try { return new Date(iso).toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "short" }) }
  catch { return iso }
}
function formatShortDate(iso: string | null): string {
  if (!iso) return "—"
  try { return new Date(iso).toLocaleDateString("ja-JP", { year: "numeric", month: "numeric", day: "numeric" }) }
  catch { return iso }
}

// Pick a fitting icon for a Japanese payload key (substring match, ordered).
function iconForKey(key: string): LucideIcon {
  if (key.includes("会食") || key.includes("飲")) return Wine
  if (key.includes("食")) return Utensils
  if (key.includes("睡眠") || key.includes("休養") || key.includes("睡")) return Moon
  if (key.includes("運動") || key.includes("トレーニング")) return Dumbbell
  if (key.includes("水分") || key.includes("水")) return GlassWater
  if (key.includes("目標")) return Target
  if (key.includes("コメント") || key.includes("栄養士") || key.includes("メモ")) return NotebookPen
  return ClipboardCheck
}

// ── Robust payload value renderer ──────────────────────
function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v)
}
function primitiveToString(v: unknown): string | null {
  if (v == null) return null
  if (typeof v === "string") { const t = v.trim(); return t.length > 0 ? t : null }
  if (typeof v === "number" || typeof v === "boolean") return String(v)
  return null
}

function PayloadValue({ value }: { value: unknown }) {
  const prim = primitiveToString(value)
  if (prim !== null) {
    return <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{prim}</p>
  }

  if (Array.isArray(value)) {
    const items = value.filter((v) => v != null)
    if (items.length === 0) return <p className="text-sm text-gray-400">—</p>
    const allPrimitive = items.every((v) => primitiveToString(v) !== null)
    if (allPrimitive) {
      return (
        <ul className="space-y-1.5">
          {items.map((v, i) => (
            <li key={i} className="flex gap-2 text-sm leading-relaxed text-gray-700">
              <span className="mt-[7px] h-1 w-1 flex-shrink-0 rounded-full" style={{ background: ACCENT }} />
              <span className="whitespace-pre-wrap">{primitiveToString(v)}</span>
            </li>
          ))}
        </ul>
      )
    }
    return (
      <div className="space-y-2">
        {items.map((v, i) => (
          <div key={i} className="rounded-lg bg-gray-50 p-2.5">
            <PayloadValue value={v} />
          </div>
        ))}
      </div>
    )
  }

  if (isPlainObject(value)) {
    const entries = Object.entries(value)
    if (entries.length === 0) return <p className="text-sm text-gray-400">—</p>
    return (
      <div className="space-y-2">
        {entries.map(([k, v]) => (
          <div key={k}>
            <p className="text-[11px] font-semibold text-gray-400">{k}</p>
            <div className="mt-0.5"><PayloadValue value={v} /></div>
          </div>
        ))}
      </div>
    )
  }

  return <p className="text-sm text-gray-400">—</p>
}

// ── Main page ──────────────────────────────────────────
export default function LiffPersonalPlanPage() {
  const liff = useLiff()
  const [data, setData] = useState<PersonalPlanData | null>(null)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)

  const load = useCallback(async (isRefresh = false) => {
    if (liff.status !== "ready") return
    if (isRefresh) setRefreshing(true); else setLoading(true)
    setFetchError(null)
    try {
      const res = await fetch(`${API_CONFIG.BASE_URL}/line/liff/personalplan?lineUserId=${encodeURIComponent(liff.lineUserId)}`)
      if (!res.ok) throw new Error(res.status === 404 ? "ユーザーが見つかりません。" : "読み込みに失敗しました。")
      setData(await res.json() as PersonalPlanData)
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

  const plan = data.plan
  const hasPlan = data.hasPlan && !!plan
  const payloadEntries = plan
    ? Object.entries(plan.payload).filter(([k]) => k !== "alert_thresholds")
    : []
  const history = data.history ?? []

  return (
    <div className="min-h-screen pb-10" style={{ background: "#f0f4f8" }}>
      {/* Header */}
      <div className="px-4 pt-8 pb-5" style={{ background: "#1E3A5F" }}>
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            <span className="text-xs font-medium opacity-80">VitaAI / パーソナルプラン</span>
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
        <h1 className="mt-1 text-xl font-bold text-white">パーソナルプラン</h1>
        <p className="mt-1 text-sm text-white/70">
          {liff.status === "ready" ? liff.displayName : ""} さん専用の栄養プラン
        </p>
      </div>

      <div className="mx-auto mt-4 w-full max-w-md space-y-4 px-4">
        {!hasPlan || !plan ? (
          // Empty state
          <div className="mt-2 rounded-2xl bg-white p-8 text-center shadow-sm">
            <ClipboardCheck className="mx-auto h-10 w-10 text-gray-300" />
            <p className="mt-3 text-sm leading-relaxed text-gray-500">
              管理栄養士のカウンセリング後に、あなた専用のプランがここに表示されます
            </p>
          </div>
        ) : (
          <>
            {/* Next review — prominent */}
            <div className="rounded-2xl border p-4 shadow-sm" style={{ borderColor: `${ACCENT}55`, background: "#FBF8F1" }}>
              <div className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4" style={{ color: ACCENT }} />
                <p className="text-xs font-bold" style={{ color: "#2D5A8E" }}>次回見直し目安</p>
                <span className="ml-auto text-[11px] font-semibold text-gray-500">
                  v{plan.version ?? "—"}
                </span>
              </div>
              <p className="mt-2 text-lg font-bold" style={{ color: "#1E3A5F" }}>
                {formatFullDate(plan.nextReviewAt)}
              </p>
              {plan.nextReviewAt && new Date(plan.nextReviewAt).getTime() < Date.now() ? (
                <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-[12px] font-semibold text-amber-800">
                  見直し時期の目安を過ぎています。カウンセリングのご予約をおすすめします（未受診の間は現在のプランを継続して参照します）。
                </p>
              ) : (
                <p className="mt-2 text-[11.5px] leading-relaxed text-gray-500">
                  見直し前でも最新のプランを継続して参照します
                </p>
              )}
              {plan.effectiveFrom && (
                <p className="mt-1 text-[11px] text-gray-400">
                  適用開始：{formatShortDate(plan.effectiveFrom)}
                </p>
              )}
              {plan.updatedAt && (
                <p className="text-[11px] text-gray-400">
                  最終更新日：{formatShortDate(plan.updatedAt)}
                </p>
              )}
            </div>

            {/* Payload cards */}
            {payloadEntries.length === 0 ? (
              <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
                <p className="text-sm text-gray-500">プランの詳細内容は準備中です。</p>
              </div>
            ) : (
              <div className="space-y-3">
                {payloadEntries.map(([key, value]) => {
                  const Icon = iconForKey(key)
                  return (
                    <div key={key} className="rounded-2xl bg-white p-4 shadow-sm">
                      <div className="mb-2.5 flex items-center gap-2">
                        <Icon className="h-4 w-4" style={{ color: "#3A7ABD" }} />
                        <p className="text-[13px] font-bold" style={{ color: "#2D5A8E" }}>{key}</p>
                      </div>
                      <PayloadValue value={value} />
                    </div>
                  )
                })}
              </div>
            )}

            {/* History — collapsible */}
            {history.length > 0 && (
              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <button
                  type="button"
                  onClick={() => setHistoryOpen((v) => !v)}
                  className="flex w-full items-center gap-2 text-left"
                >
                  <History className="h-4 w-4" style={{ color: "#3A7ABD" }} />
                  <p className="text-xs font-bold" style={{ color: "#2D5A8E" }}>過去のプラン履歴</p>
                  <span className="ml-1 text-[11px] text-gray-400">（{history.length}件）</span>
                  <ChevronDown
                    className={`ml-auto h-4 w-4 flex-shrink-0 text-gray-400 transition-transform ${historyOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {historyOpen && (
                  <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
                    {history.map((h, i) => (
                      <div
                        key={`${h.version ?? "x"}-${i}`}
                        className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-bold text-gray-700">v{h.version ?? "—"}</span>
                            {h.isActive && (
                              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                                現在
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-[11px] text-gray-400">
                            適用開始：{formatShortDate(h.effectiveFrom)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-gray-400">見直し目安</p>
                          <p className="text-[11.5px] font-medium text-gray-600">
                            {formatShortDate(h.nextReviewAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <p className="px-1 text-[10px] leading-relaxed text-gray-400">
              ※ 本プランは管理栄養士による助言であり、医学的診断・治療を目的とするものではありません。
            </p>
          </>
        )}
      </div>
    </div>
  )
}
