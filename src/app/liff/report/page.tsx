"use client"

import { useCallback, useEffect, useState } from "react"
import { API_CONFIG } from "@/lib/config/api"
import {
  Loader2, AlertCircle, RefreshCw, Sparkles, User, Heart, Brain, Dna,
  FileText, MessagesSquare, Lightbulb, NotebookPen, CalendarClock,
} from "lucide-react"
import { useLiff } from "../_hooks/useLiff"

// ── Types ──────────────────────────────────────────────

type ReportProfile = {
  name?: string | null
  stage?: string | null
  values?: string | null
  thinkingStyle?: string | null
  personality?: string | null
  background?: string | null
  currentBusiness?: string | null
  futureGoals?: string | null
  healthGoals?: string[] | null
  hobbiesLifestyle?: string | null
  familyContext?: string | null
  dietitianNote?: string | null
}

type PersonaPrefs = {
  addressAs?: string | null
  tone?: string | null
  detail?: string | null
  encouragement?: string | null
}

type Diagnostic = {
  mbtiLabel: string
  discLabel: string
  cognitiveTrend: string
  summary: string
  completedAt: string
}

type NutritionPlan = {
  version: number | null
  nextReviewAt: string | null
  hasPlan: boolean
}

type Consultation = {
  topic: string
  gist: string
  at: string
}

type ReportData = {
  displayName: string | null
  profile: ReportProfile
  understandingNotes: string | null
  personaPrefs: PersonaPrefs | null
  diagnostic: Diagnostic | null
  geneSummary: unknown
  hasGeneData: boolean
  nutritionPlan: NutritionPlan | null
  recentConsultations: Consultation[]
}

// ── Helpers ────────────────────────────────────────────

function formatDay(iso: string): string {
  try { return new Date(iso).toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" }) }
  catch { return iso }
}

function clean(v?: string | null): string | null {
  const t = v?.trim()
  return t ? t : null
}

/** geneSummary is untyped from the API — pull a human-readable line if one exists. */
function geneSummaryText(g: unknown): string | null {
  if (!g) return null
  if (typeof g === "string") return clean(g)
  if (typeof g === "object") {
    const obj = g as Record<string, unknown>
    for (const key of ["summary", "text", "overview", "description", "comment"]) {
      const cand = obj[key]
      if (typeof cand === "string" && cand.trim()) return cand.trim()
    }
  }
  return null
}

// ── Sub-components ─────────────────────────────────────

function SectionCard({
  icon, title, accent, children,
}: {
  icon: React.ReactNode
  title: string
  accent?: boolean
  children: React.ReactNode
}) {
  return (
    <div className={`rounded-2xl bg-white p-4 shadow-sm ${accent ? "border border-[#C9A86A]/30" : ""}`}>
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <p className="text-xs font-bold" style={{ color: accent ? "#B08A45" : "#2D5A8E" }}>{title}</p>
      </div>
      {children}
    </div>
  )
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-gray-400">{label}</p>
      <p className="mt-0.5 whitespace-pre-line text-[13.5px] leading-relaxed text-gray-700">{value}</p>
    </div>
  )
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[#C9A86A]/10 px-3 py-2">
      <p className="text-[10px] font-semibold text-[#B08A45]">{label}</p>
      <p className="mt-0.5 text-[12.5px] font-semibold text-gray-700">{value}</p>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────

export default function LiffReportPage() {
  const liff = useLiff()
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const load = useCallback(async (isRefresh = false) => {
    if (liff.status !== "ready") return
    if (isRefresh) setRefreshing(true); else setLoading(true)
    setFetchError(null)
    try {
      const res = await fetch(`${API_CONFIG.BASE_URL}/line/liff/report?lineUserId=${encodeURIComponent(liff.lineUserId)}`)
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

  const p = data.profile ?? {}
  const displayName = clean(p.name) ?? (liff.status === "ready" ? liff.displayName : data.displayName) ?? "あなた"

  // Profile text fields (ordered, only those with content)
  const profileFields: { label: string; value: string }[] = []
  const pushField = (label: string, v?: string | null) => { const c = clean(v); if (c) profileFields.push({ label, value: c }) }
  pushField("今のステージ", p.stage)
  pushField("現在の仕事・事業", p.currentBusiness)
  pushField("大切にしている価値観", p.values)
  pushField("考え方の傾向", p.thinkingStyle)
  pushField("人柄", p.personality)
  pushField("これまでの歩み", p.background)
  pushField("これから目指すこと", p.futureGoals)
  pushField("趣味・ライフスタイル", p.hobbiesLifestyle)
  pushField("ご家族のこと", p.familyContext)

  const healthGoals = (p.healthGoals ?? []).map((g) => g?.trim()).filter((g): g is string => !!g)
  const dietitianNote = clean(p.dietitianNote)
  const hasProfile = profileFields.length > 0 || healthGoals.length > 0

  // Persona preferences
  const personaFields: { label: string; value: string }[] = []
  if (data.personaPrefs) {
    const pp = data.personaPrefs
    const pushP = (label: string, v?: string | null) => { const c = clean(v); if (c) personaFields.push({ label, value: c }) }
    pushP("呼び方", pp.addressAs)
    pushP("話し方", pp.tone)
    pushP("詳しさ", pp.detail)
    pushP("励まし方", pp.encouragement)
  }

  const geneText = geneSummaryText(data.geneSummary)
  const showGene = data.hasGeneData || geneText != null
  const plan = data.nutritionPlan
  const showPlan = !!(plan && plan.hasPlan)
  const consultations = (data.recentConsultations ?? []).filter((c) => c && (clean(c.topic) || clean(c.gist)))
  const notes = clean(data.understandingNotes)
  const diagnostic = data.diagnostic

  const hasAnything =
    hasProfile || !!dietitianNote || personaFields.length > 0 || !!diagnostic ||
    showGene || showPlan || consultations.length > 0 || !!notes

  return (
    <div className="min-h-screen pb-10" style={{ background: "#f0f4f8" }}>
      {/* Header */}
      <div className="px-4 pt-8 pb-5" style={{ background: "#1E3A5F" }}>
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" style={{ color: "#C9A86A" }} />
            <span className="text-xs font-medium opacity-80">AXEL / レポート</span>
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
        <h1 className="mt-1 text-xl font-bold text-white">AXELがあなたについて理解していること</h1>
        <p className="mt-1 text-sm text-white/70">{displayName} さんへ</p>
      </div>

      <div className="mx-auto mt-4 w-full max-w-md space-y-4 px-4">

        {/* Warm intro */}
        <div className="rounded-2xl border border-[#C9A86A]/30 bg-white p-4 shadow-sm">
          <p className="text-[13px] leading-relaxed text-gray-600">
            これまでの会話や記録から、AXELが理解している{displayName}さんの姿をまとめました。
            もし「少し違うな」と感じたところがあれば、いつでもトークで教えてください。少しずつ、より深く理解していきます。
          </p>
        </div>

        {!hasAnything ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <Sparkles className="mx-auto h-10 w-10" style={{ color: "#C9A86A" }} />
            <p className="mt-3 text-sm text-gray-600">AXELはまだあなたのことを学んでいる途中です。</p>
            <p className="mt-1 text-xs text-gray-400">会話や記録を重ねるほど、ここに理解が増えていきます。</p>
          </div>
        ) : (
          <>
            {/* Profile */}
            {hasProfile && (
              <SectionCard icon={<User className="h-4 w-4" style={{ color: "#3A7ABD" }} />} title="あなたのプロフィール">
                <div className="space-y-3.5">
                  {profileFields.map((f) => (
                    <ProfileRow key={f.label} label={f.label} value={f.value} />
                  ))}
                  {healthGoals.length > 0 && (
                    <div>
                      <p className="flex items-center gap-1 text-[11px] font-semibold text-gray-400">
                        <Heart className="h-3 w-3" style={{ color: "#E06B8B" }} /> 健康で目指したいこと
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {healthGoals.map((g, i) => (
                          <span key={i} className="rounded-full bg-[#eef4fb] px-2.5 py-1 text-[12px] font-medium text-[#2D5A8E]">
                            {g}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </SectionCard>
            )}

            {/* Persona preferences */}
            {personaFields.length > 0 && (
              <SectionCard icon={<Sparkles className="h-4 w-4" style={{ color: "#C9A86A" }} />} title="AXELの接し方" accent>
                <p className="mb-3 text-[11.5px] leading-relaxed text-gray-500">
                  {displayName}さんが心地よく過ごせるよう、こんなふうに寄り添っています。
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {personaFields.map((f) => (
                    <Chip key={f.label} label={f.label} value={f.value} />
                  ))}
                </div>
              </SectionCard>
            )}

            {/* Personality diagnostic */}
            {diagnostic && (
              <SectionCard icon={<Brain className="h-4 w-4" style={{ color: "#3A7ABD" }} />} title="性格診断">
                <div className="flex flex-wrap gap-2">
                  {clean(diagnostic.mbtiLabel) && (
                    <div className="rounded-xl bg-[#eef4fb] px-3 py-2">
                      <p className="text-[10px] font-semibold text-gray-400">MBTI</p>
                      <p className="mt-0.5 text-[14px] font-bold" style={{ color: "#1E3A5F" }}>{diagnostic.mbtiLabel}</p>
                    </div>
                  )}
                  {clean(diagnostic.discLabel) && (
                    <div className="rounded-xl bg-[#eef4fb] px-3 py-2">
                      <p className="text-[10px] font-semibold text-gray-400">DISC</p>
                      <p className="mt-0.5 text-[14px] font-bold" style={{ color: "#1E3A5F" }}>{diagnostic.discLabel}</p>
                    </div>
                  )}
                </div>
                {clean(diagnostic.cognitiveTrend) && (
                  <div className="mt-3">
                    <p className="text-[11px] font-semibold text-gray-400">思考の傾向</p>
                    <p className="mt-0.5 text-[13.5px] leading-relaxed text-gray-700">{diagnostic.cognitiveTrend}</p>
                  </div>
                )}
                {clean(diagnostic.summary) && (
                  <p className="mt-3 whitespace-pre-line text-[13px] leading-relaxed text-gray-600">{diagnostic.summary}</p>
                )}
                {clean(diagnostic.completedAt) && (
                  <p className="mt-3 text-[10px] text-gray-400">診断日：{formatDay(diagnostic.completedAt)}</p>
                )}
              </SectionCard>
            )}

            {/* Gene summary */}
            {showGene && (
              <SectionCard icon={<Dna className="h-4 w-4" style={{ color: "#C9A86A" }} />} title="遺伝子検査の要約" accent>
                {geneText ? (
                  <p className="whitespace-pre-line text-[13px] leading-relaxed text-gray-700">{geneText}</p>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-[#C9A86A]/15 px-3 py-1 text-[12px] font-bold text-[#B08A45]">
                      確認済み
                    </span>
                    <span className="text-[12px] text-gray-500">検査結果を体質傾向の参考にしています。</span>
                  </div>
                )}
                <p className="mt-3 text-[10px] leading-relaxed text-gray-400">
                  ※ 遺伝子情報は体質傾向の参考であり、医学的判断を目的とするものではありません。
                </p>
              </SectionCard>
            )}

            {/* Personal plan */}
            {showPlan && plan && (
              <SectionCard icon={<FileText className="h-4 w-4" style={{ color: "#3A7ABD" }} />} title="パーソナルプラン">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">バージョン</span>
                  <span className="font-semibold text-gray-800">v{plan.version ?? "—"}</span>
                </div>
                {clean(plan.nextReviewAt) && (
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1 text-gray-500">
                      <CalendarClock className="h-3.5 w-3.5 text-gray-400" /> 次回の見直し
                    </span>
                    <span className="text-gray-700">{formatDay(plan.nextReviewAt!)}</span>
                  </div>
                )}
              </SectionCard>
            )}

            {/* Recent consultations */}
            {consultations.length > 0 && (
              <SectionCard icon={<MessagesSquare className="h-4 w-4" style={{ color: "#3A7ABD" }} />} title="最近の相談">
                <div className="space-y-3">
                  {consultations.map((c, i) => (
                    <div key={i} className="border-l-2 border-[#3A7ABD]/30 pl-3">
                      <div className="flex items-baseline justify-between gap-2">
                        {clean(c.topic) && <p className="text-[13px] font-semibold text-gray-800">{c.topic}</p>}
                        {clean(c.at) && <span className="flex-shrink-0 text-[10px] text-gray-400">{formatDay(c.at)}</span>}
                      </div>
                      {clean(c.gist) && <p className="mt-0.5 text-[12.5px] leading-relaxed text-gray-600">{c.gist}</p>}
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            {/* Dietitian note */}
            {dietitianNote && (
              <SectionCard icon={<NotebookPen className="h-4 w-4" style={{ color: "#C9A86A" }} />} title="管理栄養士からのメモ" accent>
                <p className="whitespace-pre-line text-[13px] leading-relaxed text-gray-700">{dietitianNote}</p>
              </SectionCard>
            )}

            {/* Understanding notes */}
            {notes && (
              <div className="rounded-2xl border border-[#C9A86A]/30 bg-[#C9A86A]/[0.06] p-4 shadow-sm">
                <div className="mb-2 flex items-center gap-2">
                  <Lightbulb className="h-4 w-4" style={{ color: "#C9A86A" }} />
                  <p className="text-xs font-bold" style={{ color: "#B08A45" }}>AXELの観察メモ</p>
                </div>
                <p className="whitespace-pre-line text-[13px] leading-relaxed text-gray-700">{notes}</p>
              </div>
            )}
          </>
        )}

        <p className="px-1 pt-1 text-center text-[10px] leading-relaxed text-gray-400">
          この内容はいつでも更新できます。気になることがあれば、AXELに話しかけてください。
        </p>
      </div>
    </div>
  )
}
