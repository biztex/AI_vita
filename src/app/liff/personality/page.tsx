"use client"

import { useCallback, useEffect, useState } from "react"
import type { ReactNode } from "react"
import { API_CONFIG } from "@/lib/config/api"
import {
  Loader2, AlertCircle, ScanFace, Brain, Target, Compass, Sparkles,
  FileText, ChevronLeft, RefreshCw, CheckCircle2,
} from "lucide-react"
import { useLiff } from "../_hooks/useLiff"
import { DIAGNOSTIC_QUESTIONS, CATEGORY_INFO, type QuestionCategory } from "@/lib/diagnostic/questions"
import {
  computeDiagnosticResult, ENNEAGRAM_TYPES,
  type DiagnosticResult, type DiagnosticAnswers,
} from "@/lib/diagnostic/scoring"

// ── Types ──────────────────────────────────────────────

type ServerResult = DiagnosticResult & { completedAt: string }

type PersonalityResponse = {
  linked: boolean
  hasResult: boolean
  result: ServerResult | null
}

type SaveState = "idle" | "saving" | "saved" | "not_linked" | "error"

// ── Constants ──────────────────────────────────────────

const TOTAL = DIAGNOSTIC_QUESTIONS.length

// Accent colours tuned for white cards (CATEGORY_INFO.color targets a dark bg).
const CATEGORY_ACCENT: Record<QuestionCategory, { text: string; bg: string; ring: string }> = {
  MBTI: { text: "#2D5A8E", bg: "#EFF4FB", ring: "#2D5A8E" },
  DISC: { text: "#6D28D9", bg: "#F3EEFC", ring: "#7C3AED" },
  Enneagram: { text: "#B45309", bg: "#FBF3E6", ring: "#C9A86A" },
}

const DISC_COLOR: Record<string, string> = { D: "#EF4444", I: "#F59E0B", S: "#10B981", C: "#2D5A8E" }

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" })
  } catch {
    return iso
  }
}

// ── Sub-components ──────────────────────────────────────

function Header({ subtitle }: { subtitle: string }) {
  return (
    <div className="px-4 pt-8 pb-5" style={{ background: "#1E3A5F" }}>
      <div className="flex items-center gap-2 text-white">
        <ScanFace className="h-5 w-5" />
        <span className="text-xs font-medium opacity-80">AXEL / 性格診断</span>
      </div>
      <h1 className="mt-1 text-xl font-bold text-white">性格診断</h1>
      {subtitle && <p className="mt-1 text-sm text-white/70">{subtitle}</p>}
    </div>
  )
}

function ResultView({
  result, completedAt, onRetake, banner,
}: {
  result: DiagnosticResult
  completedAt?: string
  onRetake: () => void
  banner?: ReactNode
}) {
  const discColor = DISC_COLOR[result.discType] ?? "#2D5A8E"

  return (
    <div className="mx-auto mt-4 w-full max-w-md space-y-4 px-4">
      {banner}

      {/* MBTI */}
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Brain className="h-4 w-4" style={{ color: "#3A7ABD" }} />
          <p className="text-xs font-semibold" style={{ color: "#2D5A8E" }}>MBTI（性格4軸）</p>
        </div>
        <span
          className="inline-block rounded-xl px-3.5 py-1.5 text-2xl font-bold tracking-[0.18em] text-white"
          style={{ background: "#1E3A5F" }}
        >
          {result.mbtiType}
        </span>
        <p className="mt-3 text-sm leading-relaxed text-gray-700">{result.mbtiLabel}</p>
      </div>

      {/* DISC */}
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Target className="h-4 w-4" style={{ color: "#3A7ABD" }} />
          <p className="text-xs font-semibold" style={{ color: "#2D5A8E" }}>DISCタイプ</p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-xl font-bold text-white"
            style={{ background: discColor }}
          >
            {result.discType}
          </span>
          <p className="text-base font-bold text-gray-800">{result.discLabel}</p>
        </div>
      </div>

      {/* 認知傾向 */}
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center gap-2">
          <Compass className="h-4 w-4" style={{ color: "#C9A86A" }} />
          <p className="text-xs font-semibold" style={{ color: "#2D5A8E" }}>認知傾向</p>
        </div>
        <p className="text-lg font-bold" style={{ color: "#1E3A5F" }}>{result.cognitiveTrend}</p>
      </div>

      {/* エニアグラム */}
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4" style={{ color: "#C9A86A" }} />
          <p className="text-xs font-semibold" style={{ color: "#2D5A8E" }}>エニアグラム（上位3タイプ）</p>
        </div>
        <div className="space-y-2">
          {result.enneagramTop3.map((num, i) => {
            const t = ENNEAGRAM_TYPES[num]
            return (
              <div key={num} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-2.5">
                <span
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white tabular-nums"
                  style={{ background: i === 0 ? "#C9A86A" : "#94A3B8" }}
                >
                  {num}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-800">
                    <span className="mr-1.5 text-[11px] font-bold text-gray-400">{i + 1}位</span>
                    タイプ{num}・{t?.name ?? "—"}
                  </p>
                  {t?.trait && <p className="mt-0.5 text-[11.5px] leading-snug text-gray-500">{t.trait}</p>}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* サマリー */}
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center gap-2">
          <FileText className="h-4 w-4" style={{ color: "#3A7ABD" }} />
          <p className="text-xs font-semibold" style={{ color: "#2D5A8E" }}>総合サマリー</p>
        </div>
        <p className="text-sm leading-relaxed text-gray-700">{result.summary}</p>
      </div>

      {completedAt && (
        <p className="px-1 text-center text-[11px] text-gray-400">診断日：{formatDate(completedAt)}</p>
      )}

      <button
        type="button"
        onClick={onRetake}
        className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold text-white"
        style={{ background: "#1E3A5F" }}
      >
        <RefreshCw className="h-4 w-4" /> 再診断する
      </button>

      <p className="px-1 text-[10px] leading-relaxed text-gray-400">
        ※ 性格診断はあなたの傾向を理解するための参考情報です。
      </p>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────

export default function LiffPersonalityPage() {
  const liff = useLiff()

  const [data, setData] = useState<PersonalityResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Diagnostic flow
  const [retaking, setRetaking] = useState(false)
  const [phase, setPhase] = useState<"intro" | "quiz">("intro")
  const [answers, setAnswers] = useState<DiagnosticAnswers>({})
  const [currentIndex, setCurrentIndex] = useState(0)

  // Completion / persistence
  const [localResult, setLocalResult] = useState<DiagnosticResult | null>(null)
  const [saveState, setSaveState] = useState<SaveState>("idle")

  const load = useCallback(async () => {
    if (liff.status !== "ready") return
    setLoading(true)
    setFetchError(null)
    try {
      const res = await fetch(
        `${API_CONFIG.BASE_URL}/line/liff/personality?lineUserId=${encodeURIComponent(liff.lineUserId)}`,
      )
      if (!res.ok) throw new Error(res.status === 404 ? "ユーザーが見つかりません。" : "読み込みに失敗しました。")
      setData((await res.json()) as PersonalityResponse)
    } catch (err: unknown) {
      setFetchError(err instanceof Error ? err.message : "読み込みに失敗しました。")
    } finally {
      setLoading(false)
    }
  }, [liff])

  useEffect(() => { load() }, [load])

  const submitResult = useCallback(async (finalAnswers: DiagnosticAnswers, result: DiagnosticResult) => {
    if (liff.status !== "ready") return
    setSaveState("saving")
    try {
      const res = await fetch(`${API_CONFIG.BASE_URL}/line/liff/personality`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lineUserId: liff.lineUserId, answers: finalAnswers, result }),
      })
      if (res.status === 409) { setSaveState("not_linked"); return }
      if (!res.ok) throw new Error("save failed")
      setSaveState("saved")
    } catch {
      setSaveState("error")
    }
  }, [liff])

  const handleSelect = useCallback((questionId: number, optionId: string) => {
    setAnswers((prev) => {
      const next: DiagnosticAnswers = { ...prev, [String(questionId)]: optionId }
      if (currentIndex < TOTAL - 1) {
        setCurrentIndex((i) => i + 1)
      } else {
        const result = computeDiagnosticResult(next)
        setLocalResult(result)
        void submitResult(next, result)
      }
      return next
    })
  }, [currentIndex, submitResult])

  const startQuiz = useCallback(() => {
    setPhase("quiz")
    setCurrentIndex(0)
    setAnswers({})
  }, [])

  const beginRetake = useCallback(() => {
    setRetaking(true)
    setPhase("intro")
    setAnswers({})
    setCurrentIndex(0)
    setLocalResult(null)
    setSaveState("idle")
  }, [])

  const goBack = useCallback(() => {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1)
    else setPhase("intro")
  }, [currentIndex])

  const retrySave = useCallback(() => {
    if (localResult) void submitResult(answers, localResult)
  }, [answers, localResult, submitResult])

  // ── Loading ──
  if (liff.status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#f0f4f8" }}>
        <Loader2 className="h-10 w-10 animate-spin" style={{ color: "#2D5A8E" }} />
      </div>
    )
  }

  // ── Error ──
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

  const displayName = liff.status === "ready" ? liff.displayName : ""

  // Save-status banner shown above a freshly computed result.
  const saveBanner: ReactNode = (() => {
    if (saveState === "saving") {
      return (
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin" style={{ color: "#2D5A8E" }} />
          <p className="text-xs text-slate-600">診断結果を保存しています…</p>
        </div>
      )
    }
    if (saveState === "saved") {
      return (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-600" />
          <p className="text-xs text-emerald-800">診断結果を保存しました。</p>
        </div>
      )
    }
    if (saveState === "not_linked") {
      return (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
          <p className="text-xs leading-relaxed text-amber-800">
            アカウント連携後に保存できます。今回の結果は下に表示しています。
          </p>
        </div>
      )
    }
    if (saveState === "error") {
      return (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
          <div className="flex-1">
            <p className="text-xs leading-relaxed text-amber-800">結果の保存に失敗しました。</p>
            <button
              type="button"
              onClick={retrySave}
              className="mt-1.5 inline-flex items-center gap-1 rounded-lg bg-amber-600 px-2.5 py-1 text-[11px] font-semibold text-white"
            >
              <RefreshCw className="h-3 w-3" /> 再試行
            </button>
          </div>
        </div>
      )
    }
    return null
  })()

  // ── A. Freshly computed result (this session) ──
  if (localResult) {
    return (
      <div className="min-h-screen pb-10" style={{ background: "#f0f4f8" }}>
        <Header subtitle={displayName ? `${displayName} さんの診断結果` : "診断結果"} />
        <ResultView result={localResult} onRetake={beginRetake} banner={saveBanner} />
      </div>
    )
  }

  // ── B. Previously saved result ──
  if (data.hasResult && data.result && !retaking) {
    const r = data.result
    return (
      <div className="min-h-screen pb-10" style={{ background: "#f0f4f8" }}>
        <Header subtitle={displayName ? `${displayName} さんの診断結果` : "診断結果"} />
        <ResultView result={r} completedAt={r.completedAt} onRetake={beginRetake} />
      </div>
    )
  }

  // ── C. Intro ──
  if (phase === "intro") {
    return (
      <div className="min-h-screen pb-10" style={{ background: "#f0f4f8" }}>
        <Header subtitle={displayName ? `${displayName} さん` : ""} />
        <div className="mx-auto mt-4 w-full max-w-md space-y-4 px-4">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm leading-relaxed text-gray-700">
              かんたんな質問に答えるだけで、MBTI・DISC・エニアグラムの3つの視点からあなたの性格タイプを分析します。
            </p>
            <div className="mt-3 flex items-center gap-4 text-[11px] font-semibold text-gray-400">
              <span className="inline-flex items-center gap-1">
                <FileText className="h-3.5 w-3.5" /> 全{TOTAL}問
              </span>
              <span>所要時間 約3分</span>
            </div>
          </div>

          <div className="space-y-3">
            {(Object.keys(CATEGORY_INFO) as QuestionCategory[]).map((cat) => {
              const info = CATEGORY_INFO[cat]
              const accent = CATEGORY_ACCENT[cat]
              return (
                <div key={cat} className="rounded-2xl bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{info.icon}</span>
                    <p className="text-sm font-bold" style={{ color: accent.text }}>{info.title}</p>
                    <span
                      className="ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold"
                      style={{ background: accent.bg, color: accent.text }}
                    >
                      {info.range}
                    </span>
                  </div>
                  <p className="mt-2 text-[12px] leading-relaxed text-gray-500">{info.description}</p>
                </div>
              )
            })}
          </div>

          <button
            type="button"
            onClick={startQuiz}
            className="w-full rounded-xl py-3.5 text-sm font-semibold text-white"
            style={{ background: "#1E3A5F" }}
          >
            {retaking ? "もう一度診断する" : "診断をはじめる"}
          </button>

          {retaking && data.hasResult && (
            <button
              type="button"
              onClick={() => setRetaking(false)}
              className="w-full rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-600"
            >
              前回の結果に戻る
            </button>
          )}
        </div>
      </div>
    )
  }

  // ── D. Quiz ──
  const q = DIAGNOSTIC_QUESTIONS[currentIndex]
  const info = CATEGORY_INFO[q.category]
  const accent = CATEGORY_ACCENT[q.category]
  const selected = answers[String(q.id)]
  const progressPct = ((currentIndex + 1) / TOTAL) * 100

  return (
    <div className="min-h-screen pb-10" style={{ background: "#f0f4f8" }}>
      <Header subtitle={displayName ? `${displayName} さん` : ""} />
      <div className="mx-auto mt-4 w-full max-w-md space-y-4 px-4">

        {/* Progress */}
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold"
              style={{ background: accent.bg, color: accent.text }}
            >
              <span>{info.icon}</span>{info.title}
            </span>
            <span className="text-[11px] font-bold tabular-nums text-gray-400">{currentIndex + 1} / {TOTAL}</span>
          </div>
          <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%`, background: accent.ring }}
            />
          </div>
        </div>

        {/* Question */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-base font-bold leading-relaxed" style={{ color: "#1E3A5F" }}>
            Q{q.id}. {q.question}
          </p>
          <div className="mt-4 space-y-2.5">
            {q.options.map((opt) => {
              const isSel = selected === opt.id
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelect(q.id, opt.id)}
                  className="flex w-full items-center gap-3 rounded-xl border p-3.5 text-left transition active:scale-[0.99]"
                  style={isSel
                    ? { borderColor: accent.ring, background: accent.bg }
                    : { borderColor: "#E5E7EB", background: "#fff" }}
                >
                  <span
                    className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border text-xs font-bold"
                    style={isSel
                      ? { background: accent.ring, borderColor: accent.ring, color: "#fff" }
                      : { borderColor: "#D1D5DB", color: "#6B7280" }}
                  >
                    {opt.id}
                  </span>
                  <span className="flex-1 text-sm font-medium text-gray-800">{opt.label}</span>
                  {isSel && <CheckCircle2 className="h-5 w-5 flex-shrink-0" style={{ color: accent.ring }} />}
                </button>
              )
            })}
          </div>
        </div>

        {/* Back */}
        <button
          type="button"
          onClick={goBack}
          className="flex items-center gap-1.5 px-1 text-sm font-medium text-gray-500"
        >
          <ChevronLeft className="h-4 w-4" />
          {currentIndex === 0 ? "説明に戻る" : "前の質問へ"}
        </button>
      </div>
    </div>
  )
}
