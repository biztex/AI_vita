"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Brain, Target, Sparkles, Lightbulb } from "lucide-react"
import type { DiagnosticResult } from "@/lib/diagnostic/scoring"
import { ENNEAGRAM_TYPES } from "@/lib/diagnostic/scoring"

interface DiagnosticResultsCardProps {
  result: DiagnosticResult
  compact?: boolean
}

export function DiagnosticResultsCard({ result, compact = false }: DiagnosticResultsCardProps) {
  return (
    <div className={`grid gap-4 ${compact ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 md:grid-cols-2"}`}>
      {/* MBTI Card */}
      <Card className="border-blue-500/30 bg-gradient-to-br from-card via-blue-500/5 to-card shadow-lg hover:shadow-xl transition-all duration-300">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="p-1.5 bg-blue-500/20 rounded-lg">
              <Brain className="w-4 h-4 text-blue-400" />
            </div>
            MBTI タイプ
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 mb-2">
            <Badge className="text-xl px-4 py-1.5 bg-blue-600/90 hover:bg-blue-600 text-white font-bold tracking-wider">
              {result.mbtiType}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {result.mbtiLabel}
          </p>
        </CardContent>
      </Card>

      {/* DISC Card */}
      <Card className="border-purple-500/30 bg-gradient-to-br from-card via-purple-500/5 to-card shadow-lg hover:shadow-xl transition-all duration-300">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="p-1.5 bg-purple-500/20 rounded-lg">
              <Target className="w-4 h-4 text-purple-400" />
            </div>
            DISC タイプ
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 mb-2">
            <Badge className="text-xl px-4 py-1.5 bg-purple-600/90 hover:bg-purple-600 text-white font-bold">
              {result.discType}
            </Badge>
            <span className="text-sm font-medium text-purple-400">
              {result.discLabel}
            </span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {getDiscDescription(result.discType)}
          </p>
        </CardContent>
      </Card>

      {/* Enneagram Card */}
      <Card className="border-amber-500/30 bg-gradient-to-br from-card via-amber-500/5 to-card shadow-lg hover:shadow-xl transition-all duration-300">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="p-1.5 bg-amber-500/20 rounded-lg">
              <Sparkles className="w-4 h-4 text-amber-400" />
            </div>
            エニアグラム（上位3タイプ）
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2.5">
            {result.enneagramTop3.map((typeNum, index) => {
              const ennea = ENNEAGRAM_TYPES[typeNum]
              return (
                <div key={typeNum} className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${
                    index === 0 ? "bg-amber-500" : index === 1 ? "bg-amber-400/80" : "bg-amber-300/70"
                  }`}>
                    {typeNum}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium">
                      タイプ{typeNum}：{ennea?.name}
                    </span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {ennea?.trait}
                    </span>
                  </div>
                  {index === 0 && (
                    <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-400 flex-shrink-0">
                      主要
                    </Badge>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Cognitive Tendency Card */}
      <Card className="border-emerald-500/30 bg-gradient-to-br from-card via-emerald-500/5 to-card shadow-lg hover:shadow-xl transition-all duration-300">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="p-1.5 bg-emerald-500/20 rounded-lg">
              <Lightbulb className="w-4 h-4 text-emerald-400" />
            </div>
            認知傾向
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 mb-3">
            <Badge className="text-lg px-4 py-1.5 bg-emerald-600/90 hover:bg-emerald-600 text-white font-bold">
              {result.cognitiveTrend}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {getCognitiveTrendDescription(result.cognitiveTrend)}
          </p>
        </CardContent>
      </Card>

      {/* Summary Card - Full Width */}
      {!compact && (
        <Card className="md:col-span-2 border-primary/30 bg-gradient-to-br from-card via-primary/5 to-card shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="p-1.5 bg-primary/20 rounded-lg">
                <Brain className="w-4 h-4 text-primary" />
              </div>
              総合サマリー
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-base leading-relaxed text-foreground">
              {result.summary}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function getDiscDescription(type: string): string {
  const descs: Record<string, string> = {
    D: "決断力と行動力で目標を達成するリーダー。スピード感のある判断が特徴。",
    I: "社交的で周囲を巻き込むムードメーカー。楽観的に前進する力がある。",
    S: "安定と調和を重んじるサポーター。堅実で信頼される存在。",
    C: "正確さと品質にこだわる分析家。論理的に物事を進める。",
  }
  return descs[type] || ""
}

function getCognitiveTrendDescription(trend: string): string {
  const descs: Record<string, string> = {
    "分析型": "データと論理に基づいて未来を見通す思考スタイル。抽象的な概念を体系的に分析する力に優れています。",
    "直感型": "感覚とビジョンで全体像を捉える思考スタイル。人の気持ちと可能性を直感的に理解する力に優れています。",
    "論理型": "事実と経験に基づいて判断する思考スタイル。具体的なデータを論理的に処理する力に優れています。",
    "感覚型": "具体的な体験と感情を大切にする思考スタイル。目の前の状況を丁寧に感じ取る力に優れています。",
    "バランス型": "論理と直感のバランスが取れた思考スタイル。状況に応じて柔軟に判断できます。",
  }
  return descs[trend] || ""
}
