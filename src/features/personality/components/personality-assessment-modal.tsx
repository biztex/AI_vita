"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Check, Copy, ExternalLink, ArrowRight } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { apiClient } from "@/lib/api"
import { cn } from "@/lib/utils"

type TestStep = {
  id: number
  name: string
  link: string
  testType: "SIXTEEN_PERSONALITIES" | "ENNEAGRAM" | "DISC" | "CLIFTONSTRENGTHS"
  completed: boolean
  result: string
  options?: PersonalityOption[]
}

type PersonalityOption = {
  id: string
  name: string
  code: string
  description: string
  color: string
  category?: string
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
      options: [
        // 分析家 (Analyst) - Purple
        { id: "INTJ", name: "建築家", code: "INTJ", description: "建築家", color: "bg-purple-600" },
        { id: "INTP", name: "論理学者", code: "INTP", description: "論理学者", color: "bg-purple-600" },
        { id: "ENTJ", name: "指揮官", code: "ENTJ", description: "指揮官", color: "bg-purple-600" },
        { id: "ENTP", name: "討論者", code: "ENTP", description: "討論者", color: "bg-purple-600" },
        // 外交官 (Diplomat) - Green
        { id: "INFJ", name: "提唱者", code: "INFJ", description: "提唱者", color: "bg-green-600" },
        { id: "INFP", name: "仲介者", code: "INFP", description: "仲介者", color: "bg-green-600" },
        { id: "ENFJ", name: "主人公", code: "ENFJ", description: "主人公", color: "bg-green-600" },
        { id: "ENFP", name: "運動家", code: "ENFP", description: "運動家", color: "bg-green-600" },
        // 番人 (Sentinel) - Blue
        { id: "ISTJ", name: "ロジスティシャン", code: "ISTJ", description: "ロジスティシャン", color: "bg-blue-600" },
        { id: "ISFJ", name: "擁護者", code: "ISFJ", description: "擁護者", color: "bg-blue-600" },
        { id: "ESTJ", name: "幹部", code: "ESTJ", description: "幹部", color: "bg-blue-600" },
        { id: "ESFJ", name: "領事", code: "ESFJ", description: "領事", color: "bg-blue-600" },
        // 探検家 (Explorer) - Orange
        { id: "ISTP", name: "巨匠", code: "ISTP", description: "巨匠", color: "bg-orange-600" },
        { id: "ISFP", name: "冒険家", code: "ISFP", description: "冒険家", color: "bg-orange-600" },
        { id: "ESTP", name: "起業家", code: "ESTP", description: "起業家", color: "bg-orange-600" },
        { id: "ESFP", name: "エンターテイナー", code: "ESFP", description: "エンターテイナー", color: "bg-orange-600" },
      ]
    },
    {
      id: 2,
      name: "Enneagram",
      link: "https://www.enneagraminstitute.com/",
      testType: "ENNEAGRAM",
      completed: false,
      result: "",
      options: [
        { id: "1", name: "THE REFORMER", code: "1", description: "The Rational, Idealistic Type: Principled, Purposeful, Self-Controlled, and Perfectionistic", color: "bg-orange-500" },
        { id: "2", name: "THE HELPER", code: "2", description: "The Caring, Interpersonal Type: Demonstrative, Generous, People-Pleasing, and Possessive", color: "bg-orange-500" },
        { id: "3", name: "THE ACHIEVER", code: "3", description: "The Success-Oriented, Pragmatic Type: Adaptive, Excelling, Driven, and Image-Conscious", color: "bg-orange-500" },
        { id: "4", name: "THE INDIVIDUALIST", code: "4", description: "The Sensitive, Withdrawn Type: Expressive, Dramatic, Self-Absorbed, and Temperamental", color: "bg-orange-500" },
        { id: "5", name: "THE INVESTIGATOR", code: "5", description: "The Intense, Cerebral Type: Perceptive, Innovative, Secretive, and Isolated", color: "bg-orange-500" },
        { id: "6", name: "THE LOYALIST", code: "6", description: "The Committed, Security-Oriented Type: Engaging, Responsible, Anxious, and Suspicious", color: "bg-orange-500" },
        { id: "7", name: "THE ENTHUSIAST", code: "7", description: "The Busy, Fun-Loving Type: Spontaneous, Versatile, Distractible, and Scattered", color: "bg-orange-500" },
        { id: "8", name: "THE CHALLENGER", code: "8", description: "The Powerful, Dominating Type: Self-Confident, Decisive, Willful, and Confrontational", color: "bg-orange-500" },
        { id: "9", name: "THE PEACEMAKER", code: "9", description: "The Easygoing, Self-Effacing Type: Receptive, Reassuring, Agreeable, and Complacent", color: "bg-orange-500" },
      ]
    },
    {
      id: 3,
      name: "DISC Profile",
      link: "https://www.discprofile.com/",
      testType: "DISC",
      completed: false,
      result: "",
      options: [
        { id: "D", name: "Dominance", code: "D", description: "A person primarily in this DiSC quadrant places emphasis on accomplishing results and \"seeing the big picture.\" They are confident, sometimes blunt, outspoken, and demanding.", color: "bg-red-500" },
        { id: "I", name: "Influence", code: "I", description: "A person in this DiSC quadrant places emphasis on influencing or persuading others. They tend to be enthusiastic, optimistic, open, trusting, and energetic.", color: "bg-yellow-500" },
        { id: "S", name: "Steadyness", code: "S", description: "A person in this DiSC quadrant places emphasis on cooperation, sincerity, loyalty, and dependability. They tend to have calm, deliberate dispositions, and don't like to be rushed.", color: "bg-green-500" },
        { id: "C", name: "Conscientiousness", code: "C", description: "A person in this DiSC quadrant places emphasis on quality and accuracy, expertise and competency. They enjoy their independence, demand the details, and often fear being wrong.", color: "bg-blue-500" },
      ]
    },
    {
      id: 4,
      name: "CliftonStrengths",
      link: "https://www.gallup.com/cliftonstrengths/en/252137/home.aspx",
      testType: "CLIFTONSTRENGTHS",
      completed: false,
      result: "",
      options: [
        // Strategic Thinking - Green
        { id: "Analytical", name: "Analytical", code: "Analytical", description: "", color: "bg-green-500", category: "STRATEGIC THINKING" },
        { id: "Context", name: "Context", code: "Context", description: "", color: "bg-green-500", category: "STRATEGIC THINKING" },
        { id: "Futuristic", name: "Futuristic", code: "Futuristic", description: "", color: "bg-green-500", category: "STRATEGIC THINKING" },
        { id: "Ideation", name: "Ideation", code: "Ideation", description: "", color: "bg-green-500", category: "STRATEGIC THINKING" },
        { id: "Input", name: "Input", code: "Input", description: "", color: "bg-green-500", category: "STRATEGIC THINKING" },
        { id: "Intellection", name: "Intellection", code: "Intellection", description: "", color: "bg-green-500", category: "STRATEGIC THINKING" },
        { id: "Learner", name: "Learner", code: "Learner", description: "", color: "bg-green-500", category: "STRATEGIC THINKING" },
        { id: "Strategic", name: "Strategic", code: "Strategic", description: "", color: "bg-green-500", category: "STRATEGIC THINKING" },
        
        // Relationship Building - Blue
        { id: "Adaptability", name: "Adaptability", code: "Adaptability", description: "", color: "bg-blue-500", category: "RELATIONSHIP BUILDING" },
        { id: "Connectedness", name: "Connectedness", code: "Connectedness", description: "", color: "bg-blue-500", category: "RELATIONSHIP BUILDING" },
        { id: "Developer", name: "Developer", code: "Developer", description: "", color: "bg-blue-500", category: "RELATIONSHIP BUILDING" },
        { id: "Empathy", name: "Empathy", code: "Empathy", description: "", color: "bg-blue-500", category: "RELATIONSHIP BUILDING" },
        { id: "Harmony", name: "Harmony", code: "Harmony", description: "", color: "bg-blue-500", category: "RELATIONSHIP BUILDING" },
        { id: "Includer", name: "Includer", code: "Includer", description: "", color: "bg-blue-500", category: "RELATIONSHIP BUILDING" },
        { id: "Individualization", name: "Individualization", code: "Individualization", description: "", color: "bg-blue-500", category: "RELATIONSHIP BUILDING" },
        { id: "Positivity", name: "Positivity", code: "Positivity", description: "", color: "bg-blue-500", category: "RELATIONSHIP BUILDING" },
        { id: "Relator", name: "Relator", code: "Relator", description: "", color: "bg-blue-500", category: "RELATIONSHIP BUILDING" },
        
        // Influencing - Orange
        { id: "Activator", name: "Activator", code: "Activator", description: "", color: "bg-orange-500", category: "INFLUENCING" },
        { id: "Command", name: "Command", code: "Command", description: "", color: "bg-orange-500", category: "INFLUENCING" },
        { id: "Communication", name: "Communication", code: "Communication", description: "", color: "bg-orange-500", category: "INFLUENCING" },
        { id: "Competition", name: "Competition", code: "Competition", description: "", color: "bg-orange-500", category: "INFLUENCING" },
        { id: "Maximizer", name: "Maximizer", code: "Maximizer", description: "", color: "bg-orange-500", category: "INFLUENCING" },
        { id: "Self-Assurance", name: "Self-Assurance", code: "Self-Assurance", description: "", color: "bg-orange-500", category: "INFLUENCING" },
        { id: "Significance", name: "Significance", code: "Significance", description: "", color: "bg-orange-500", category: "INFLUENCING" },
        { id: "Woo", name: "Woo", code: "Woo", description: "", color: "bg-orange-500", category: "INFLUENCING" },
        
        // Executing - Purple
        { id: "Achiever", name: "Achiever", code: "Achiever", description: "", color: "bg-purple-500", category: "EXECUTING" },
        { id: "Arranger", name: "Arranger", code: "Arranger", description: "", color: "bg-purple-500", category: "EXECUTING" },
        { id: "Belief", name: "Belief", code: "Belief", description: "", color: "bg-purple-500", category: "EXECUTING" },
        { id: "Consistency", name: "Consistency", code: "Consistency", description: "", color: "bg-purple-500", category: "EXECUTING" },
        { id: "Deliberative", name: "Deliberative", code: "Deliberative", description: "", color: "bg-purple-500", category: "EXECUTING" },
        { id: "Discipline", name: "Discipline", code: "Discipline", description: "", color: "bg-purple-500", category: "EXECUTING" },
        { id: "Focus", name: "Focus", code: "Focus", description: "", color: "bg-purple-500", category: "EXECUTING" },
        { id: "Responsibility", name: "Responsibility", code: "Responsibility", description: "", color: "bg-purple-500", category: "EXECUTING" },
        { id: "Restorative", name: "Restorative", code: "Restorative", description: "", color: "bg-purple-500", category: "EXECUTING" },
      ]
    },
  ])

  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link)
    toast({ title: "リンクをクリップボードにコピーしました" })
  }

  const handleOpenLink = (link: string) => {
    window.open(link, "_blank")
  }

  const handleOptionSelect = (stepId: number, optionId: string) => {
    setSteps((prev) =>
      prev.map((step) =>
        step.id === stepId ? { ...step, result: optionId } : step
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
      if (current) {
        await apiClient.personality.upload(current.testType, current.result)
      }
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
    if (!current) return
    
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
            {currentStepData.options ? (
              // Selection interface for personality tests
              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-2">{currentStepData.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    あなたの性格タイプを選択してください
                  </p>
                </div>
                
                {currentStep === 1 ? (
                  // 16 Personalities - Grouped by categories
                  <div className="space-y-6">
                    {/* 分析家 (Analyst) - Purple */}
                    <div>
                      <h4 className="text-sm font-medium text-purple-600 mb-3">分析家 (Analyst)</h4>
                      <div className="grid grid-cols-2 gap-3">
                        {currentStepData.options.filter(opt => opt.color === "bg-purple-600").map((option) => (
                          <button
                            key={option.id}
                            onClick={() => handleOptionSelect(currentStep, option.id)}
                            className={cn(
                              "relative p-4 rounded-lg text-white transition-all duration-200 hover:scale-105",
                              option.color,
                              currentStepData.result === option.id 
                                ? "ring-2 ring-white ring-offset-2 ring-offset-purple-600" 
                                : "hover:opacity-90"
                            )}
                          >
                            <div className="text-center">
                              <div className="font-medium text-sm">{option.name}</div>
                              <div className="text-xs opacity-90 mt-1">{option.code}</div>
                            </div>
                            {currentStepData.result === option.id && (
                              <div className="absolute top-2 right-2">
                                <Check className="h-5 w-5 text-white" />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 外交官 (Diplomat) - Green */}
                    <div>
                      <h4 className="text-sm font-medium text-green-600 mb-3">外交官 (Diplomat)</h4>
                      <div className="grid grid-cols-2 gap-3">
                        {currentStepData.options.filter(opt => opt.color === "bg-green-600").map((option) => (
                          <button
                            key={option.id}
                            onClick={() => handleOptionSelect(currentStep, option.id)}
                            className={cn(
                              "relative p-4 rounded-lg text-white transition-all duration-200 hover:scale-105",
                              option.color,
                              currentStepData.result === option.id 
                                ? "ring-2 ring-white ring-offset-2 ring-offset-green-600" 
                                : "hover:opacity-90"
                            )}
                          >
                            <div className="text-center">
                              <div className="font-medium text-sm">{option.name}</div>
                              <div className="text-xs opacity-90 mt-1">{option.code}</div>
                            </div>
                            {currentStepData.result === option.id && (
                              <div className="absolute top-2 right-2">
                                <Check className="h-5 w-5 text-white" />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 番人 (Sentinel) - Blue */}
                    <div>
                      <h4 className="text-sm font-medium text-blue-600 mb-3">番人 (Sentinel)</h4>
                      <div className="grid grid-cols-2 gap-3">
                        {currentStepData.options.filter(opt => opt.color === "bg-blue-600").map((option) => (
                          <button
                            key={option.id}
                            onClick={() => handleOptionSelect(currentStep, option.id)}
                            className={cn(
                              "relative p-4 rounded-lg text-white transition-all duration-200 hover:scale-105",
                              option.color,
                              currentStepData.result === option.id 
                                ? "ring-2 ring-white ring-offset-2 ring-offset-blue-600" 
                                : "hover:opacity-90"
                            )}
                          >
                            <div className="text-center">
                              <div className="font-medium text-sm">{option.name}</div>
                              <div className="text-xs opacity-90 mt-1">{option.code}</div>
                            </div>
                            {currentStepData.result === option.id && (
                              <div className="absolute top-2 right-2">
                                <Check className="h-5 w-5 text-white" />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 探検家 (Explorer) - Orange */}
                    <div>
                      <h4 className="text-sm font-medium text-orange-600 mb-3">探検家 (Explorer)</h4>
                      <div className="grid grid-cols-2 gap-3">
                        {currentStepData.options.filter(opt => opt.color === "bg-orange-600").map((option) => (
                          <button
                            key={option.id}
                            onClick={() => handleOptionSelect(currentStep, option.id)}
                            className={cn(
                              "relative p-4 rounded-lg text-white transition-all duration-200 hover:scale-105",
                              option.color,
                              currentStepData.result === option.id 
                                ? "ring-2 ring-white ring-offset-2 ring-offset-orange-600" 
                                : "hover:opacity-90"
                            )}
                          >
                            <div className="text-center">
                              <div className="font-medium text-sm">{option.name}</div>
                              <div className="text-xs opacity-90 mt-1">{option.code}</div>
                            </div>
                            {currentStepData.result === option.id && (
                              <div className="absolute top-2 right-2">
                                <Check className="h-5 w-5 text-white" />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : currentStep === 2 ? (
                  // Enneagram - Vertical list
                  <div className="space-y-2">
                    {currentStepData.options.map((option) => (
                      <button
                        key={option.id}
                        onClick={() => handleOptionSelect(currentStep, option.id)}
                        className={cn(
                          "relative w-full p-4 rounded-lg border transition-all duration-200 hover:shadow-md",
                          "bg-white hover:bg-gray-50",
                          currentStepData.result === option.id 
                            ? "border-green-500 bg-green-50" 
                            : "border-gray-200"
                        )}
                      >
                        <div className="flex items-start gap-4">
                          <div className={cn(
                            "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-lg",
                            option.color
                          )}>
                            {option.code}
                          </div>
                          <div className="flex-1 text-left">
                            <div className="font-semibold text-orange-500 text-lg mb-1">
                              {option.name}
                            </div>
                            <div className="text-sm text-gray-600">
                              {option.description}
                            </div>
                          </div>
                          {currentStepData.result === option.id && (
                            <div className="flex-shrink-0">
                              <Check className="h-6 w-6 text-green-500" />
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : currentStep === 3 ? (
                  // DISC - 2x2 grid
                  <div className="grid grid-cols-2 gap-4">
                    {currentStepData.options.map((option) => (
                      <button
                        key={option.id}
                        onClick={() => handleOptionSelect(currentStep, option.id)}
                        className={cn(
                          "relative p-6 rounded-lg border transition-all duration-200 hover:shadow-md",
                          "bg-white hover:bg-gray-50",
                          currentStepData.result === option.id 
                            ? "border-green-500 bg-green-50" 
                            : "border-gray-200"
                        )}
                      >
                        <div className="text-center">
                          <div className={cn(
                            "w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl mx-auto mb-3",
                            option.color
                          )}>
                            {option.code}
                          </div>
                          <div className="font-semibold text-lg mb-2">
                            {option.name}
                          </div>
                          <div className="text-sm text-gray-600 text-left">
                            {option.description}
                          </div>
                        </div>
                        {currentStepData.result === option.id && (
                          <div className="absolute top-3 right-3">
                            <Check className="h-6 w-6 text-green-500" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  // CliftonStrengths - 2x2 categories
                  <div className="grid grid-cols-2 gap-6">
                    {/* Strategic Thinking */}
                    <div className="space-y-3">
                      <div className="h-1 bg-green-500 rounded"></div>
                      <h4 className="font-semibold text-green-600 text-sm">STRATEGIC THINKING</h4>
                      <div className="space-y-1">
                        {currentStepData.options.filter(opt => opt.category === "STRATEGIC THINKING").map((option) => (
                          <button
                            key={option.id}
                            onClick={() => handleOptionSelect(currentStep, option.id)}
                            className={cn(
                              "w-full text-left p-2 rounded transition-all duration-200 hover:bg-gray-50",
                              currentStepData.result === option.id 
                                ? "bg-green-50 border-l-4 border-green-500" 
                                : ""
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <span className="underline">{option.name}</span>
                              <span className="text-gray-400">></span>
                            </div>
                            {currentStepData.result === option.id && (
                              <div className="absolute right-2">
                                <Check className="h-4 w-4 text-green-500" />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Relationship Building */}
                    <div className="space-y-3">
                      <div className="h-1 bg-blue-500 rounded"></div>
                      <h4 className="font-semibold text-blue-600 text-sm">RELATIONSHIP BUILDING</h4>
                      <div className="space-y-1">
                        {currentStepData.options.filter(opt => opt.category === "RELATIONSHIP BUILDING").map((option) => (
                          <button
                            key={option.id}
                            onClick={() => handleOptionSelect(currentStep, option.id)}
                            className={cn(
                              "w-full text-left p-2 rounded transition-all duration-200 hover:bg-gray-50",
                              currentStepData.result === option.id 
                                ? "bg-blue-50 border-l-4 border-blue-500" 
                                : ""
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <span className="underline">{option.name}</span>
                              <span className="text-gray-400">></span>
                            </div>
                            {currentStepData.result === option.id && (
                              <div className="absolute right-2">
                                <Check className="h-4 w-4 text-blue-500" />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Influencing */}
                    <div className="space-y-3">
                      <div className="h-1 bg-orange-500 rounded"></div>
                      <h4 className="font-semibold text-orange-600 text-sm">INFLUENCING</h4>
                      <div className="space-y-1">
                        {currentStepData.options.filter(opt => opt.category === "INFLUENCING").map((option) => (
                          <button
                            key={option.id}
                            onClick={() => handleOptionSelect(currentStep, option.id)}
                            className={cn(
                              "w-full text-left p-2 rounded transition-all duration-200 hover:bg-gray-50",
                              currentStepData.result === option.id 
                                ? "bg-orange-50 border-l-4 border-orange-500" 
                                : ""
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <span className="underline">{option.name}</span>
                              <span className="text-gray-400">></span>
                            </div>
                            {currentStepData.result === option.id && (
                              <div className="absolute right-2">
                                <Check className="h-4 w-4 text-orange-500" />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Executing */}
                    <div className="space-y-3">
                      <div className="h-1 bg-purple-500 rounded"></div>
                      <h4 className="font-semibold text-purple-600 text-sm">EXECUTING</h4>
                      <div className="space-y-1">
                        {currentStepData.options.filter(opt => opt.category === "EXECUTING").map((option) => (
                          <button
                            key={option.id}
                            onClick={() => handleOptionSelect(currentStep, option.id)}
                            className={cn(
                              "w-full text-left p-2 rounded transition-all duration-200 hover:bg-gray-50",
                              currentStepData.result === option.id 
                                ? "bg-purple-50 border-l-4 border-purple-500" 
                                : ""
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <span className="underline">{option.name}</span>
                              <span className="text-gray-400">></span>
                            </div>
                            {currentStepData.result === option.id && (
                              <div className="absolute right-2">
                                <Check className="h-4 w-4 text-purple-500" />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // Original input interface for other steps
              <div className="space-y-4">
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
                    placeholder={`例: Type 5、DISC、Strengthsなど`}
                    value={currentStepData.result}
                    onChange={(e) => handleOptionSelect(currentStep, e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>
            )}
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

