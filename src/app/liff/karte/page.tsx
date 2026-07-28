"use client"

import { useCallback, useEffect, useState } from "react"
import { API_CONFIG } from "@/lib/config/api"
import {
  Loader2, AlertCircle, ClipboardList, RefreshCw, Pill, Brain, Dna, Sparkles, ChevronDown, Activity,
} from "lucide-react"
import { useLiff } from "../_hooks/useLiff"

type DailyLog = {
  id: string
  condition: string | null
  decisions: string | null
  memo: string | null
  logDate: string
}

type EventLog = {
  id: string
  logDate: string
  decisions: string | null
  source: "vita_decision_event" | "legacy_daily_log"
}

type LegacyGeneArea = {
  key: string
  label: string
  value: string | null
  level: "low" | "mid" | "high" | null
}

type ConstitutionCategory = {
  label: string
  totalScore: number | null
  level: "low" | "mid" | "high" | null
  subItems: { label: string; score: number | null; level: "low" | "mid" | "high" | null }[]
}

type NutritionCategory = {
  label: string
  totalScore: number | null
  level: "low" | "mid" | "high" | null
  surveyScore: number | null
  geneScore: number | null
  comment: string | null
  suggestions: string[]
}

type GriiceReport = {
  purpose: string | null
  provider: string | null
  constitution: ConstitutionCategory[]
  nutritionStrategy: NutritionCategory[]
  muscleFiber: { score: number; position: string; label: string } | null
}

type KarteData = {
  displayName: string | null
  userMode?: "EXECUWELL" | "VITAAI"
  effectiveMode?: "EXECUWELL" | "VITAAI" | "AXEL"
  activeSubscriptionType?: "EXECUWELL" | "VITAAI" | "INTEGRATED" | null
  logs: DailyLog[]
  eventLogs?: EventLog[]
  genetics?: {
    hasData: boolean
    summary: any
    areas: LegacyGeneArea[]
    report: GriiceReport | null
  }
  nutritionPlan?: {
    version: number | null
    effectiveFrom: string | null
    nextReviewAt: string | null
  } | null
}

const LEVEL_WORDS: Record<number, string> = { 1: "良い", 2: "普通", 3: "重い" }
const LEVEL_COLORS: Record<string, string> = { 良い: "#10B981", 普通: "#F59E0B", 重い: "#EF4444" }

const SCORE_COLOR = (score: number | null) => {
  if (score == null) return "#D1D5DB"
  if (score <= 1) return "#10B981" // very low priority — green
  if (score === 2) return "#34D399"
  if (score === 3) return "#F59E0B"
  if (score === 4) return "#FB923C"
  return "#EF4444" // 5 — needs attention
}

function formatDay(iso: string): string {
  try { return new Date(iso).toLocaleDateString("ja-JP", { month: "long", day: "numeric", weekday: "short" }) }
  catch { return iso }
}
function formatYearMonth(iso: string): string {
  try { return new Date(iso).toLocaleDateString("ja-JP", { year: "numeric", month: "long" }) }
  catch { return iso }
}

function renderCondition(raw: string | null): { state?: string; fatigue?: string; comment?: string; fallback?: string } {
  if (!raw) return {}
  if (raw.startsWith("JSON:")) {
    try {
      const parsed = JSON.parse(raw.slice(5)) as { stateLevel?: number; fatigueLevel?: number; comment?: string }
      return {
        state: parsed.stateLevel ? LEVEL_WORDS[parsed.stateLevel] : undefined,
        fatigue: parsed.fatigueLevel ? LEVEL_WORDS[parsed.fatigueLevel] : undefined,
        comment: parsed.comment?.trim() || undefined,
      }
    } catch { /* fall through */ }
  }
  return { fallback: raw }
}

function parseEvent(raw: string | null): { important: boolean; hesitation: string; content: string } | null {
  if (!raw || !raw.startsWith("EVENT|")) return null
  const parts = Object.fromEntries(
    raw.split("|").slice(1).map((p) => {
      const i = p.indexOf("=")
      return i > 0 ? [p.slice(0, i), p.slice(i + 1)] : [p, ""]
    })
  ) as Record<string, string>
  return {
    important: parts.important === "1",
    hesitation: parts.hesitation && parts.hesitation !== "-" ? parts.hesitation : "—",
    content: parts.content && parts.content !== "-" ? parts.content : "",
  }
}

// ── Sub-components ─────────────────────────────────────

function ScoreBar({ score, max = 5 }: { score: number | null; max?: number }) {
  if (score == null) {
    return <div className="h-1.5 w-full rounded-full bg-gray-100" />
  }
  const pct = Math.min(100, Math.max(0, (score / max) * 100))
  return (
    <div className="flex items-center gap-2">
      <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-md px-1 text-[10px] font-bold text-white tabular-nums" style={{ background: SCORE_COLOR(score) }}>
        {score}
      </span>
      <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
        <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${pct}%`, background: SCORE_COLOR(score) }} />
      </div>
    </div>
  )
}

function ConstitutionRow({ cat }: { cat: ConstitutionCategory }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-semibold text-gray-700">{cat.label}</p>
          <div className="mt-1.5">
            <ScoreBar score={cat.totalScore} />
          </div>
        </div>
        <ChevronDown
          className={`h-3.5 w-3.5 flex-shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && cat.subItems.length > 0 && (
        <div className="mt-3 space-y-1.5 border-t border-gray-100 pt-3">
          {cat.subItems.map((s) => (
            <div key={s.label} className="grid grid-cols-[1fr_auto] items-center gap-2">
              <span className="truncate text-[11px] text-gray-500">{s.label}</span>
              <ScoreBar score={s.score} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function NutritionCard({ cat }: { cat: NutritionCategory }) {
  const [showSuggestions, setShowSuggestions] = useState(false)
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-3.5 shadow-sm">
      <div className="flex items-baseline justify-between">
        <p className="text-[13px] font-bold text-gray-800">{cat.label}</p>
        <span className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-md px-1.5 text-[11px] font-bold text-white tabular-nums" style={{ background: SCORE_COLOR(cat.totalScore) }}>
          {cat.totalScore ?? "—"}
        </span>
      </div>
      <div className="mt-2.5 grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-gray-50 px-2.5 py-1.5">
          <p className="text-[10px] text-gray-400">生活習慣</p>
          <p className="mt-0.5 text-[13px] font-bold tabular-nums" style={{ color: SCORE_COLOR(cat.surveyScore) }}>{cat.surveyScore ?? "—"}</p>
        </div>
        <div className="rounded-lg bg-gray-50 px-2.5 py-1.5">
          <p className="text-[10px] text-gray-400">体質</p>
          <p className="mt-0.5 text-[13px] font-bold tabular-nums" style={{ color: SCORE_COLOR(cat.geneScore) }}>{cat.geneScore ?? "—"}</p>
        </div>
      </div>
      {cat.comment && (
        <p className="mt-2.5 text-[11.5px] leading-relaxed text-gray-600">{cat.comment}</p>
      )}
      {cat.suggestions.length > 0 && (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setShowSuggestions((v) => !v)}
            className="flex items-center gap-1 text-[11px] font-semibold text-[#2D5A8E]"
          >
            食事の考え方の一例 {showSuggestions ? "▲" : "▼"}
          </button>
          {showSuggestions && (
            <ol className="mt-1.5 list-decimal space-y-1 pl-4 text-[11.5px] leading-relaxed text-gray-600">
              {cat.suggestions.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  )
}

function MuscleFiberIndicator({ score }: { score: number }) {
  const pct = Math.min(100, Math.max(0, (score / 5) * 100))
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <Activity className="h-4 w-4 text-[#C9A86A]" />
        <p className="text-xs font-semibold" style={{ color: "#2D5A8E" }}>筋線維組成</p>
      </div>
      <div className="relative h-3 w-full rounded-full bg-gradient-to-r from-gray-200 via-orange-200 to-red-300">
        <div className="absolute -top-1.5 text-base" style={{ left: `calc(${pct}% - 8px)` }}>★</div>
      </div>
      <div className="mt-2 flex justify-between text-[10px] font-semibold text-gray-500">
        <span>速筋</span>
        <span>遅筋</span>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────

export default function LiffKartePage() {
  const liff = useLiff()
  const [data, setData] = useState<KarteData | null>(null)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const load = useCallback(async (isRefresh = false) => {
    if (liff.status !== "ready") return
    if (isRefresh) setRefreshing(true); else setLoading(true)
    setFetchError(null)
    try {
      const res = await fetch(`${API_CONFIG.BASE_URL}/line/liff/karte?lineUserId=${encodeURIComponent(liff.lineUserId)}`)
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

  // Group logs by month
  const groups = new Map<string, DailyLog[]>()
  for (const log of data.logs) {
    const key = formatYearMonth(log.logDate)
    const arr = groups.get(key) ?? []
    arr.push(log)
    groups.set(key, arr)
  }
  const recentEvents = (data.eventLogs ?? []).slice(0, 5)
  const hasNutritionPlan = !!data.nutritionPlan
  const report = data.genetics?.report
  const hasGriiceReport = !!(report && (report.constitution.length > 0 || report.nutritionStrategy.length > 0))

  return (
    <div className="min-h-screen pb-10" style={{ background: "#f0f4f8" }}>
      <div className="px-4 pt-8 pb-5" style={{ background: "#1E3A5F" }}>
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            <span className="text-xs font-medium opacity-80">
              {data.effectiveMode === "AXEL" ? "AXEL / カルテ" : "VitaAI / カルテ"}
            </span>
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
        <h1 className="mt-1 text-xl font-bold text-white">私のカルテ</h1>
        <p className="mt-1 text-sm text-white/70">
          {liff.status === "ready" ? liff.displayName : data.displayName} さんの記録
        </p>
      </div>

      <div className="mx-auto mt-4 w-full max-w-md space-y-4 px-4">

        {/* Summary strip */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white p-3 shadow-sm">
            <p className="text-[11px] font-semibold text-gray-400">記録</p>
            <p className="mt-1 text-2xl font-bold tabular-nums" style={{ color: "#1E3A5F" }}>{data.logs.length}</p>
            <p className="text-[10px] text-gray-400">件（直近30日）</p>
          </div>
          <div className="rounded-xl bg-white p-3 shadow-sm">
            <p className="text-[11px] font-semibold text-gray-400">判断ログ</p>
            <p className="mt-1 text-2xl font-bold tabular-nums" style={{ color: "#1E3A5F" }}>{(data.eventLogs ?? []).length}</p>
            <p className="text-[10px] text-gray-400">件</p>
          </div>
        </div>

        {/* Nutrition Plan summary */}
        {hasNutritionPlan && (
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center gap-2">
              <Pill className="h-4 w-4" style={{ color: "#3A7ABD" }} />
              <p className="text-xs font-semibold" style={{ color: "#2D5A8E" }}>個別設計シート</p>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">バージョン</span>
              <span className="font-semibold text-gray-800">v{data.nutritionPlan!.version ?? "—"}</span>
            </div>
            {data.nutritionPlan!.nextReviewAt && (
              <div className="mt-1 flex items-center justify-between text-sm">
                <span className="text-gray-500">次回レビュー</span>
                <span className="text-gray-700">{formatDay(data.nutritionPlan!.nextReviewAt)}</span>
              </div>
            )}
          </div>
        )}

        {/* Recent decision events */}
        {recentEvents.length > 0 && (
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Brain className="h-4 w-4" style={{ color: "#3A7ABD" }} />
              <p className="text-xs font-semibold" style={{ color: "#2D5A8E" }}>最近の判断ログ</p>
            </div>
            <div className="space-y-2">
              {recentEvents.map((e) => {
                const ev = parseEvent(e.decisions)
                if (!ev) return null
                return (
                  <div key={e.id} className="border-l-2 border-[#3A7ABD]/30 pl-3">
                    <div className="flex items-center gap-2 text-[11px] text-gray-400">
                      <span>{formatDay(e.logDate)}</span>
                      {ev.important && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">重要</span>}
                      <span className="ml-auto">迷い {ev.hesitation}</span>
                    </div>
                    {ev.content && <p className="mt-1 text-sm leading-relaxed text-gray-700">{ev.content}</p>}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ─────── GRIICE GENE REPORT (rich format) ─────── */}
        {hasGriiceReport ? (
          <>
            <div className="rounded-2xl border border-[#C9A86A]/30 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <Dna className="h-4 w-4" style={{ color: "#C9A86A" }} />
                <p className="text-xs font-bold" style={{ color: "#2D5A8E" }}>遺伝子分析レポート</p>
                {data.effectiveMode === "AXEL" && (
                  <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-[#C9A86A]/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-[#C9A86A]">
                    <Sparkles className="h-2.5 w-2.5" /> AXEL
                  </span>
                )}
              </div>
              {report?.purpose && (
                <p className="mt-2 text-[11.5px] text-gray-500">分析目的：<span className="font-semibold text-gray-700">{report.purpose}</span></p>
              )}
              {report?.provider && (
                <p className="text-[10px] text-gray-400">提供：{report.provider}</p>
              )}
            </div>

            {/* Nutrition Strategy — 6 cards */}
            {report && report.nutritionStrategy.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "#2D5A8E" }}>栄養戦略ガイド</p>
                  <span className="text-[10px] text-gray-400">（6カテゴリ）</span>
                </div>
                {report.nutritionStrategy.map((n) => (
                  <NutritionCard key={n.label} cat={n} />
                ))}
              </div>
            )}

            {/* Constitution — 11 categories */}
            {report && report.constitution.length > 0 && (
              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-2">
                  <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "#2D5A8E" }}>体質傾向</p>
                  <span className="text-[10px] text-gray-400">（11カテゴリ — タップで詳細）</span>
                </div>
                <div className="space-y-2">
                  {report.constitution.map((c) => (
                    <ConstitutionRow key={c.label} cat={c} />
                  ))}
                </div>
              </div>
            )}

            {/* Muscle fiber */}
            {report?.muscleFiber && (
              <MuscleFiberIndicator score={report.muscleFiber.score} />
            )}

            <p className="px-1 text-[10px] leading-relaxed text-gray-400">
              ※ 遺伝子情報は体質傾向の参考情報であり、医学的判断を目的とするものではありません。
            </p>
          </>
        ) : data.genetics?.hasData ? (
          // Legacy 12-area display (fallback)
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Dna className="h-4 w-4" style={{ color: "#C9A86A" }} />
              <p className="text-xs font-semibold" style={{ color: "#2D5A8E" }}>遺伝子分析（簡易表示）</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(data.genetics.areas ?? []).map((a) => (
                <div key={a.key} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5">
                  <p className="text-[10.5px] leading-snug text-gray-500">{a.label}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center gap-2">
              <Dna className="h-4 w-4 text-gray-300" />
              <p className="text-xs font-semibold text-gray-400">遺伝子分析結果</p>
            </div>
            <p className="text-[12.5px] leading-relaxed text-gray-500">
              まだ結果が届いていません。検査キットの返送後、結果到着時に LINE で通知いたします。
            </p>
          </div>
        )}

        {/* Daily logs */}
        {data.logs.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <ClipboardList className="mx-auto h-10 w-10 text-gray-300" />
            <p className="mt-3 text-sm text-gray-500">まだ記録がありません。</p>
            <p className="mt-1 text-xs text-gray-400">「今日を記録する」からログを追加してください。</p>
            <a
              href="https://liff.line.me/2009125242-ka7XZSEQ/log"
              className="mt-4 inline-block rounded-lg bg-[#1E3A5F] px-4 py-2 text-xs font-semibold text-white"
            >
              今日を記録する
            </a>
          </div>
        ) : (
          <div className="space-y-4">
            {Array.from(groups.entries()).map(([month, logs]) => (
              <div key={month}>
                <p className="mb-2 px-1 text-xs font-bold text-gray-400">{month}</p>
                <div className="space-y-3">
                  {logs.map((log) => {
                    const c = renderCondition(log.condition)
                    const hasStructured = c.state || c.fatigue || c.comment
                    return (
                      <div key={log.id} className="rounded-2xl bg-white p-4 shadow-sm">
                        <p className="mb-3 text-xs font-bold" style={{ color: "#3A7ABD" }}>{formatDay(log.logDate)}</p>
                        <div className="space-y-2">
                          {hasStructured && (
                            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                              {c.state && (
                                <span className="inline-flex items-baseline gap-1.5">
                                  <span className="text-[11px] font-semibold text-gray-400">状態</span>
                                  <span className="rounded-full px-2 py-0.5 text-xs font-bold text-white" style={{ background: LEVEL_COLORS[c.state] }}>{c.state}</span>
                                </span>
                              )}
                              {c.fatigue && (
                                <span className="inline-flex items-baseline gap-1.5">
                                  <span className="text-[11px] font-semibold text-gray-400">疲労</span>
                                  <span className="rounded-full px-2 py-0.5 text-xs font-bold text-white" style={{ background: LEVEL_COLORS[c.fatigue] }}>{c.fatigue}</span>
                                </span>
                              )}
                            </div>
                          )}
                          {c.comment && (
                            <div>
                              <span className="text-[11px] font-semibold text-gray-400">一言　</span>
                              <span className="text-sm text-gray-700">{c.comment}</span>
                            </div>
                          )}
                          {!hasStructured && c.fallback && (
                            <div>
                              <span className="text-[11px] font-semibold text-gray-400">体調　</span>
                              <span className="text-sm text-gray-700">{c.fallback}</span>
                            </div>
                          )}
                          {log.decisions && !log.decisions.startsWith("EVENT|") && (
                            <div>
                              <span className="text-[11px] font-semibold text-gray-400">判断・行動　</span>
                              <span className="text-sm text-gray-700">{log.decisions}</span>
                            </div>
                          )}
                          {log.memo && (
                            <div>
                              <span className="text-[11px] font-semibold text-gray-400">メモ　</span>
                              <span className="text-sm text-gray-700">{log.memo}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
