"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ArrowRight, ArrowLeft, Check, Brain, Target, Sparkles, MessageCircle } from "lucide-react"
import * as LucideIcons from "lucide-react"
import { cn } from "@/lib/utils"
import { DIAGNOSTIC_QUESTIONS, CATEGORY_INFO, type QuestionCategory } from "@/lib/diagnostic/questions"
import { computeDiagnosticResult, type DiagnosticResult, type DiagnosticAnswers } from "@/lib/diagnostic/scoring"
import { DiagnosticResultsCard } from "./diagnostic-results-card"
import { apiClient } from "@/lib/api"
import { toast } from "react-toastify"

interface MyAIDiagnosticModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete?: (result: DiagnosticResult) => void
}

const TOTAL_QUESTIONS = DIAGNOSTIC_QUESTIONS.length

const CATEGORY_ICONS: Record<QuestionCategory, React.ComponentType<{ className?: string }>> = {
  MBTI: Brain,
  DISC: Target,
  Enneagram: Sparkles,
}

// Phase boundaries – when we cross these indices, a phase just completed
const PHASE_BOUNDARIES: { endIndex: number; phase: "MBTI" | "DISC" | "ENNEAGRAM" }[] = [
  { endIndex: 5, phase: "MBTI" },     // Q6 is index 5 (last MBTI question)
  { endIndex: 11, phase: "DISC" },    // Q12 is index 11 (last DISC question)
  // Enneagram triggers on final submit
]

// Map icon name string to Lucide component (fallback to Circle)
function getOptionIcon(iconName: string | undefined): React.ComponentType<{ className?: string; size?: number }> {
  if (!iconName) return LucideIcons.Circle
  const Component = (LucideIcons as Record<string, React.ComponentType<{ className?: string; size?: number }>>)[iconName]
  return Component ?? LucideIcons.Circle
}

// Segment ranges: MBTI 1-6, DISC 7-12, Enneagram 13-21
const SEGMENTS: { category: QuestionCategory; start: number; end: number; color: string; bgColor: string; label: string }[] = [
  { category: "MBTI", start: 1, end: 6, color: "text-blue-600", bgColor: "bg-blue-500", label: "MBTI" },
  { category: "DISC", start: 7, end: 12, color: "text-purple-600", bgColor: "bg-purple-500", label: "DISC" },
  { category: "Enneagram", start: 13, end: 21, color: "text-amber-600", bgColor: "bg-amber-500", label: "エニアグラム" },
]

export function MyAIDiagnosticModal({ isOpen, onClose, onComplete }: MyAIDiagnosticModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<DiagnosticAnswers>({})
  const [result, setResult] = useState<DiagnosticResult | null>(null)
  const [showResults, setShowResults] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [animDirection, setAnimDirection] = useState<"forward" | "backward">("forward")

  // Phase insight state
  const [phaseInsight, setPhaseInsight] = useState<string | null>(null)
  const [showPhaseInsight, setShowPhaseInsight] = useState(false)
  const completedPhasesRef = useRef<Set<string>>(new Set())

  const currentQuestion = DIAGNOSTIC_QUESTIONS[currentIndex]
  const currentCategory = currentQuestion?.category
  const selectedAnswer = answers[String(currentQuestion?.id)]

  // Progress per segment (answered count / total in segment)
  const segmentProgress = useMemo(() => {
    return SEGMENTS.map(({ start, end }) => {
      const total = end - start + 1
      const answered = Array.from({ length: total }, (_, i) => start + i).filter(
        (qId) => answers[String(qId)]
      ).length
      return { answered, total, pct: total ? (answered / total) * 100 : 0 }
    })
  }, [answers])

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(0)
      setAnswers({})
      setResult(null)
      setShowResults(false)
      setAnimDirection("forward")
      setPhaseInsight(null)
      setShowPhaseInsight(false)
      completedPhasesRef.current = new Set()
    }
  }, [isOpen])

  const handleSelectAnswer = useCallback((optionId: string) => {
    setAnswers((prev) => ({
      ...prev,
      [String(currentQuestion.id)]: optionId,
    }))
  }, [currentQuestion?.id])

  // Fire phase-complete API in background and show insight bubble
  const triggerPhaseInsight = useCallback(async (
    phase: "MBTI" | "DISC" | "ENNEAGRAM",
    currentAnswers: DiagnosticAnswers,
    partialResult?: Partial<DiagnosticResult>,
  ) => {
    if (completedPhasesRef.current.has(phase)) return
    completedPhasesRef.current.add(phase)

    try {
      const resp = await apiClient.diagnostic.phaseComplete({
        phase,
        answers: currentAnswers,
        mbtiType: partialResult?.mbtiType,
        discType: partialResult?.discType,
        enneagramTop3: partialResult?.enneagramTop3,
      })
      if (resp.insight) {
        setPhaseInsight(resp.insight)
        setShowPhaseInsight(true)
        // Auto-hide after 4 seconds
        setTimeout(() => setShowPhaseInsight(false), 4000)
      }
    } catch (err) {
      console.error(`[Diagnostic] Phase insight (${phase}) failed:`, err)
    }
  }, [])

  const handleNext = useCallback(async () => {
    if (!selectedAnswer) return

    const updatedAnswers = { ...answers, [String(currentQuestion.id)]: selectedAnswer }

    if (currentIndex < TOTAL_QUESTIONS - 1) {
      // Check if we just completed a phase boundary
      const boundary = PHASE_BOUNDARIES.find((b) => b.endIndex === currentIndex)
      if (boundary) {
        // Compute partial result for this phase
        const partialResult = computeDiagnosticResult(updatedAnswers)
        triggerPhaseInsight(boundary.phase, updatedAnswers, partialResult)
      }

      setAnimDirection("forward")
      setCurrentIndex((prev) => prev + 1)
    } else {
      const finalAnswers = updatedAnswers
      const diagnosticResult = computeDiagnosticResult(finalAnswers)
      setResult(diagnosticResult)

      // Trigger Enneagram phase insight
      triggerPhaseInsight("ENNEAGRAM", finalAnswers, diagnosticResult)

      setIsSaving(true)
      try {
        await apiClient.diagnostic.save({
          answers: finalAnswers,
          ...diagnosticResult,
        })
        toast.success("診断結果を保存しました", { position: "top-right", autoClose: 3000 })
      } catch (error) {
        console.error("Failed to save diagnostic:", error)
        toast.error("診断結果の保存に失敗しました。結果は表示されます。", {
          position: "top-right",
          autoClose: 5000,
        })
      } finally {
        setIsSaving(false)
      }

      setShowResults(true)
      onComplete?.(diagnosticResult)
    }
  }, [currentIndex, selectedAnswer, answers, currentQuestion?.id, onComplete, triggerPhaseInsight])

  const handleBack = useCallback(() => {
    if (currentIndex > 0) {
      setAnimDirection("backward")
      setCurrentIndex((prev) => prev - 1)
    }
  }, [currentIndex])

  useEffect(() => {
    if (!isOpen || showResults) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "Enter") {
        if (selectedAnswer) handleNext()
      } else if (e.key === "ArrowLeft") {
        handleBack()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, showResults, selectedAnswer, handleNext, handleBack])

  if (!currentQuestion && !showResults) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent
        className={cn(
          "w-[95vw] max-w-lg sm:max-w-xl h-[90vh] max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0",
          "rounded-xl sm:rounded-2xl border-2 shadow-2xl"
        )}
        showCloseButton={true}
        navigateBackOnClose={false}
      >
        {showResults && result ? (
          /* ─── Results View ─── */
          <div className="flex flex-col h-full overflow-hidden">
            <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 border-b flex-shrink-0">
              <DialogTitle className="text-xl sm:text-2xl font-bold text-center bg-gradient-to-r from-blue-500 via-purple-500 to-amber-500 bg-clip-text text-transparent leading-tight">
                MyAI パーソナル診断結果
              </DialogTitle>
              <p className="text-center text-base text-muted-foreground mt-2">
                あなたの診断プロファイルが完成しました
              </p>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 min-h-0">
              <DiagnosticResultsCard result={result} />
            </div>
            <div className="flex justify-end px-4 sm:px-6 py-4 border-t flex-shrink-0">
              <Button onClick={onClose} className="min-h-[48px] px-8 text-base" size="lg">
                閉じる
              </Button>
            </div>
          </div>
        ) : (
          /* ─── Question View: single column, no left panel ─── */
          <div className="flex flex-col h-full min-h-0">
            {/* Header: compact */}
            <div className="flex-shrink-0 px-4 sm:px-6 pt-4 pb-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-base font-medium text-muted-foreground" aria-hidden="true">
                  Q{currentQuestion.id} / {TOTAL_QUESTIONS}
                </span>
                <span className={cn(
                  "text-sm font-semibold px-3 py-1 rounded-full",
                  currentCategory === "MBTI" && "bg-blue-500/15 text-blue-700 dark:text-blue-300",
                  currentCategory === "DISC" && "bg-purple-500/15 text-purple-700 dark:text-purple-300",
                  currentCategory === "Enneagram" && "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                )}>
                  {CATEGORY_INFO[currentCategory].title}
                </span>
              </div>
            </div>

            {/* Question + options: scrollable, large text and touch targets */}
            <div
              className={cn(
                "flex-1 overflow-y-auto px-4 sm:px-6 py-3 min-h-0",
                animDirection === "forward"
                  ? "animate-in slide-in-from-right-6 fade-in duration-200"
                  : "animate-in slide-in-from-left-6 fade-in duration-200"
              )}
              key={currentQuestion.id}
            >
              {/* Question with icon */}
              <div className="flex items-start gap-3 sm:gap-4 mb-6">
                <div className={cn(
                  "flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center",
                  currentCategory === "MBTI" && "bg-blue-500/20 text-blue-600 dark:text-blue-400",
                  currentCategory === "DISC" && "bg-purple-500/20 text-purple-600 dark:text-purple-400",
                  currentCategory === "Enneagram" && "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                )}>
                  {(() => {
                    const IconComponent = currentQuestion.questionIcon
                      ? getOptionIcon(currentQuestion.questionIcon)
                      : CATEGORY_ICONS[currentCategory]
                    return <IconComponent className="w-6 h-6 sm:w-7 sm:h-7" />
                  })()}
                </div>
                <h2 className="text-lg sm:text-xl font-bold leading-snug pt-2 text-foreground">
                  {currentQuestion.question}
                </h2>
              </div>

              {/* Options: large tap targets, icons */}
              <div className="space-y-3">
                {currentQuestion.options.map((option) => {
                  const isSelected = selectedAnswer === option.id
                  const OptionIcon = getOptionIcon(option.icon)

                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => handleSelectAnswer(option.id)}
                      className={cn(
                        "w-full text-left rounded-xl border-2 transition-all duration-200",
                        "min-h-[52px] sm:min-h-[56px] py-3 sm:py-4 px-4 sm:px-5",
                        "flex items-center gap-4 touch-manipulation",
                        "hover:shadow-md active:scale-[0.99]",
                        isSelected
                          ? "border-primary bg-primary/10 shadow-md"
                          : "border-border bg-card hover:border-primary/40 hover:bg-muted/50"
                      )}
                      aria-pressed={isSelected}
                      aria-label={option.label}
                    >
                      <div
                        className={cn(
                          "flex-shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-colors",
                          isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        )}
                      >
                        {isSelected ? (
                          <Check className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2.5} />
                        ) : (
                          <OptionIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                        )}
                      </div>
                      <span
                        className={cn(
                          "flex-1 min-w-0 text-base sm:text-lg leading-snug",
                          isSelected ? "font-semibold text-foreground" : "text-foreground/90"
                        )}
                      >
                        {option.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Phase insight bubble */}
            {showPhaseInsight && phaseInsight && (
              <div className="flex-shrink-0 px-4 sm:px-6 py-2 animate-in fade-in slide-in-from-bottom-3 duration-300">
                <div className="flex items-start gap-3 bg-primary/5 border border-primary/20 rounded-xl p-3 sm:p-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <MessageCircle className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-primary mb-0.5">MyAI</p>
                    <p className="text-sm sm:text-base text-foreground leading-snug">{phaseInsight}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Progress bar: 3 segments with labels and fill */}
            <div
              className="flex-shrink-0 px-4 sm:px-6 py-3 border-t bg-muted/30"
              role="progressbar"
              aria-valuenow={Object.keys(answers).length}
              aria-valuemin={0}
              aria-valuemax={TOTAL_QUESTIONS}
              aria-label="診断の進捗"
            >
              <div className="flex w-full rounded-lg overflow-hidden border border-border/50 shadow-inner h-12">
                {SEGMENTS.map((seg, i) => (
                  <div
                    key={seg.category}
                    className="relative flex-1 flex items-center justify-center min-w-0 overflow-hidden border-r last:border-r-0 border-border/30"
                  >
                    <div className="absolute inset-0 bg-muted/90" />
                    <div
                      className={cn("absolute left-0 top-0 bottom-0 transition-all duration-500 ease-out", seg.bgColor)}
                      style={{ width: `${segmentProgress[i].pct}%` }}
                    />
                    <span
                      className={cn(
                        "relative z-10 text-xs sm:text-sm font-bold px-1 truncate max-w-full drop-shadow-sm",
                        segmentProgress[i].pct > 45 ? "text-white" : seg.color
                      )}
                    >
                      {seg.label}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-center text-sm text-muted-foreground mt-2">
                {Object.keys(answers).length} / {TOTAL_QUESTIONS} 問回答済み
              </p>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between gap-4 px-4 sm:px-6 py-4 border-t flex-shrink-0">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={currentIndex === 0}
                className="min-h-[48px] px-5 text-base gap-2"
              >
                <ArrowLeft className="w-5 h-5" />
                戻る
              </Button>
              <Button
                onClick={handleNext}
                disabled={!selectedAnswer || isSaving}
                className="min-h-[48px] px-6 text-base gap-2 min-w-[140px]"
              >
                {isSaving ? (
                  "保存中..."
                ) : currentIndex === TOTAL_QUESTIONS - 1 ? (
                  <>
                    結果を見る
                    <Sparkles className="w-5 h-5" />
                  </>
                ) : (
                  <>
                    次へ
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
