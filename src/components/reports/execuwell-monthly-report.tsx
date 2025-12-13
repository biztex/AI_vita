"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, Target, CheckCircle2, AlertTriangle } from "lucide-react"
import type { ExecuWellMonthlyReport } from "@/types/reports"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

interface ExecuWellMonthlyReportProps {
  data: ExecuWellMonthlyReport
}

export function ExecuWellMonthlyReport({ data }: ExecuWellMonthlyReportProps) {
  const trendData = data.decision_trend.labels.map((label, index) => ({
    week: label,
    score: data.decision_trend.data[index],
  }))

  const chartConfig = {
    score: {
      label: "意思決定スコア",
      color: "hsl(var(--chart-1))",
    },
  }

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
            {data.month}
          </div>
        </CardContent>
      </Card>

      {/* Decision Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>意思決定トレンド</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis domain={[0, 5]} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="score"
                stroke="hsl(var(--chart-1))"
                strokeWidth={2}
                name="スコア"
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Behavior Analysis */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              強み
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.behavior_analysis.strengths.map((strength, index) => (
                <li key={index} className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500" />
                  <span>{strength}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              リスク
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.behavior_analysis.risks.map((risk, index) => (
                <li key={index} className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 mt-0.5 text-yellow-500" />
                  <span>{risk}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Next Month Strategy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            来月の戦略
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {data.next_month_strategy.map((strategy, index) => (
              <li key={index} className="flex items-start gap-2">
                <TrendingUp className="h-4 w-4 mt-0.5 text-primary" />
                <span>{strategy}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}