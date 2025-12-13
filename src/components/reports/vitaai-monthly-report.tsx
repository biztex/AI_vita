"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, Target } from "lucide-react"
import type { VitaAIMonthlyReport } from "@/types/reports"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

interface VitaAIMonthlyReportProps {
  data: VitaAIMonthlyReport
}

export function VitaAIMonthlyReport({ data }: VitaAIMonthlyReportProps) {
  const trendData = data.trend_graph.labels.map((label, index) => ({
    week: label,
    score: data.trend_graph.data[index],
  }))

  const chartConfig = {
    score: {
      label: "総合スコア",
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

      {/* Monthly Average Scores */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {data.monthly_average_scores.map((item, index) => (
          <Card key={index}>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground mb-2">{item.label}</div>
              <div className="text-2xl font-bold">{item.average.toFixed(1)}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Trend Graph */}
      <Card>
        <CardHeader>
          <CardTitle>週次トレンド</CardTitle>
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

      {/* Next Focus */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            来月のフォーカス
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {data.next_focus.map((item, index) => (
              <li key={index} className="flex items-start gap-2">
                <TrendingUp className="h-4 w-4 mt-0.5 text-primary" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}