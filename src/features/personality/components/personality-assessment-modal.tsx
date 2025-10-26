"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Check, Copy, ExternalLink, ArrowRight } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { apiClient } from "@/lib/api"

type TestStep = {
  id: number
  name: string
  link: string
  testType: "SIXTEEN_PERSONALITIES" | "ENNEAGRAM" | "DISC" | "CLIFTONSTRENGTHS"
  completed: boolean
  result: string
}

interface PersonalityAssessmentModalProps {
  isOpen: boolean
  onComplete: () => void
}

export function PersonalityAssessmentModal({ isOpen, onComplete }: PersonalityAssessmentModalProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [steps, setSteps] = useState<TestStep[]>([
    {
      id: 1,
      name: "16 Personalities",
      link: "https://www.16personalities.com/ja",
      testType: "SIXTEEN_PERSONALITIES",
      completed: false,
      result: "",
    },
    {
      id: 2,
      name: "Enneagram",
      link: "https://www.enneagraminstitute.com/",
      testType: "ENNEAGRAM",
      completed: false,
      result: "",
    },
    {
      id: 3,
      name: "DISC Profile",
      link: "https://www.discprofile.com/",
      testType: "DISC",
      completed: false,
      result: "",
    },
    {
      id: 4,
      name: "CliftonStrengths",
      link: "https://www.gallup.com/cliftonstrengths/en/252137/home.aspx",
      testType: "CLIFTONSTRENGTHS",
      completed: false,
      result: "",
    },
  ])

  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link)
    toast({ title: "リンクをクリップボードにコピーしました" })
  }

  const handleOpenLink = (link: string) => {
    window.open(link, "_blank")
  }

  const handleResultChange = (stepId: number, value: string) => {
    setSteps((prev) =>
      prev.map((step) =>
        step.id === stepId ? { ...step, result: value } : step
      )
    )
  }

  const handleNext = async () => {
    const current = steps.find((s) => s.id === currentStep)
    if (!current?.result.trim()) {
      toast({ title: "エラー", description: "結果を入力してください", variant: "destructive" })
      return
    }

    // Save the current step result to backend
    try {
      await apiClient.personality.upload(current.testType, current.result)
    } catch (error) {
      console.error("Failed to save personality result:", error)
    }

    // Mark current step as completed
    setSteps((prev) =>
      prev.map((step) =>
        step.id === currentStep ? { ...step, completed: true } : step
      )
    )

    if (currentStep < 4) {
      // Animate to next step
      setTimeout(() => {
        setCurrentStep(currentStep + 1)
      }, 500)
    } else {
      // All steps completed
      onComplete()
    }
  }

  const handleSkip = async () => {
    const current = steps.find((s) => s.id === currentStep)
    
    // Save as skipped result
    try {
      await apiClient.personality.upload(current.testType, "スキップ")
    } catch (error) {
      console.error("Failed to save personality result:", error)
    }
    
    // Mark current step as completed without result
    setSteps((prev) =>
      prev.map((step) =>
        step.id === currentStep ? { ...step, completed: true, result: step.result || "スキップ" } : step
      )
    )

    if (currentStep < 4) {
      setTimeout(() => {
        setCurrentStep(currentStep + 1)
      }, 500)
    } else {
      onComplete()
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1)
      setSteps((prev) =>
        prev.map((step) => ({ ...step, completed: false, result: "" }))
      )
    }
  }, [isOpen])

  const currentStepData = steps.find((s) => s.id === currentStep)
  const allCompleted = steps.every((s) => s.completed)
  const completedCount = steps.filter((s) => s.completed).length

  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>パーソナリティ評価</DialogTitle>
          <DialogDescription>
            ExecuWellと効果的にチャットするために、パーソナリティ評価を行う必要があります。
            以下の4つのテストを完了してください。
          </DialogDescription>
        </DialogHeader>

        {/* Progress Stepper */}
        <div className="relative mt-6 mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center flex-1 relative">
                {/* Step Circle */}
                <div className="relative z-10 flex flex-col items-center">
                  <div
                    className={`h-12 w-12 rounded-full flex items-center justify-center transition-all duration-500 ${
                      step.completed
                        ? "bg-green-600 text-white shadow-lg"
                        : currentStep > step.id
                        ? "bg-gray-300 text-gray-500"
                        : currentStep === step.id
                        ? "bg-green-600 text-white shadow-lg scale-105"
                        : "bg-gray-200 text-gray-400"
                    }`}
                  >
                    {step.completed ? (
                      <Check className="h-6 w-6" />
                    ) : (
                      <span className="text-sm font-semibold">{step.id}</span>
                    )}
                  </div>
                  <div className="absolute top-full mt-2 text-xs whitespace-nowrap text-center w-20">
                    {step.name}
                  </div>
                </div>

                {/* Connection Line */}
                {index < steps.length - 1 && (
                  <div
                    className={`absolute top-6 left-12 right-0 h-1 transition-all duration-500 ${
                      steps[index + 1]?.completed
                        ? "bg-green-600"
                        : step.completed
                        ? "bg-gradient-to-r from-green-600 to-gray-300"
                        : "bg-gray-300"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Progress Info */}
          <div className="text-center mt-8 text-sm text-muted-foreground">
            {completedCount} / 4 テスト完了
          </div>
        </div>

        {/* Current Step Content */}
        {currentStepData && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="p-4 border rounded-lg bg-muted/50">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">{currentStepData.name}</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                外部サイトでテストを完了し、結果を入力してください
              </p>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenLink(currentStepData.link)}
                  className="flex-1"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  テストを開く
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyLink(currentStepData.link)}
                  className="flex-1"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  リンクをコピー
                </Button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                テスト結果
              </label>
              <Input
                placeholder={`例: INFP、Type 5、DISC、Strengthsなど`}
                value={currentStepData.result}
                onChange={(e) => handleResultChange(currentStep, e.target.value)}
                className="w-full"
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
          >
            戻る
          </Button>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleSkip}
              disabled={currentStepData?.result === "スキップ"}
            >
              スキップ
            </Button>
            <Button
              onClick={handleNext}
              className="min-w-[120px]"
              disabled={!currentStepData?.result.trim()}
            >
              {currentStep === 4 ? (
                <>
                  <span>チャットを開始</span>
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              ) : (
                <span>次へ</span>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

