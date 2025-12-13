"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Brain, CheckCircle2, AlertCircle } from "lucide-react"
import type { ExecuWellDailyReport } from "@/types/reports"

interface ExecuWellDailyReportProps {
  data: ExecuWellDailyReport
}

const getScoreColor = (score: number) => {
  if (score >= 4) return "text-green-500"
  if (score >= 3) return "text-yellow-500"
  return "text-red-500"
}

export function ExecuWellDailyReport({ data }: ExecuWellDailyReportProps) {
  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>{data.summary.title}</CardTitle>
          <p className="text-sm text-muted-foreground mt-2">{data.summary.overall_comment}</p>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            {data.date}
          </div>
        </CardContent>
      </Card>

      {/* Score Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {data.score_cards.map((card, index) => (
          <Card key={index}>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground mb-2">{card.label}</div>
              <div className={`text-3xl font-bold ${getScoreColor(card.score)}`}>
                {card.score}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Decision Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            意思決定プロファイル
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-muted-foreground mb-1">MBTI</div>
              <Badge variant="outline" className="text-lg px-3 py-1">
                {data.decision_profile.mbti}
              </Badge>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">DISC</div>
              <Badge variant="outline" className="text-lg px-3 py-1">
                {data.decision_profile.disc}
              </Badge>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Enneagram</div>
              <Badge variant="outline" className="text-lg px-3 py-1">
                {data.decision_profile.enneagram}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily Insight */}
      <Card>
        <CardHeader>
          <CardTitle>本日のインサイト</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-base leading-relaxed">{data.daily_insight.message}</p>
        </CardContent>
      </Card>

      {/* Suggested Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            推奨アクション
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {data.suggested_actions.map((action, index) => (
              <li key={index} className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary" />
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}