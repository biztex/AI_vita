"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Minus, Target, Lightbulb } from "lucide-react"
import type { VitaAIDailyReport } from "@/types/reports"
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

interface VitaAIDailyReportProps {
  data: VitaAIDailyReport
}

const getTrendIcon = (trend?: string) => {
  switch (trend) {
    case "up":
      return <TrendingUp className="h-4 w-4 text-green-500" />
    case "down":
      return <TrendingDown className="h-4 w-4 text-red-500" />
    default:
      return <Minus className="h-4 w-4 text-gray-500" />
  }
}

const getScoreColor = (score: number) => {
  if (score >= 4) return "text-green-500"
  if (score >= 3) return "text-yellow-500"
  return "text-red-500"
}

export function VitaAIDailyReport({ data }: VitaAIDailyReportProps) {
  const radarData = data.radar_chart.labels.map((label, index) => ({
    label,
    value: data.radar_chart.data[index],
    fullMark: 5,
  }))

  const trendData = data.daily_trend.labels.map((label, index) => ({
    date: label,
    ...data.daily_trend.datasets.reduce((acc, dataset) => {
      acc[dataset.label] = dataset.data[index]
      return acc
    }, {} as Record<string, number>),
  }))

  const chartConfig = {
    stress: {
      label: "ストレス",
      color: "hsl(var(--chart-1))",
    },
    sleep: {
      label: "睡眠",
      color: "hsl(var(--chart-2))",
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
            {data.date}
          </div>
        </CardContent>
      </Card>

      {/* Score Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {data.score_cards.map((card, index) => (
          <Card key={index}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">{card.label}</span>
                {getTrendIcon(card.trend)}
              </div>
              <div className={`text-3xl font-bold ${getScoreColor(card.score)}`}>
                {card.score}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Radar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>コンディション分析</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="label" />
              <PolarRadiusAxis angle={90} domain={[0, 5]} />
              <Radar
                name="スコア"
                dataKey="value"
                stroke="#8884d8"
                fill="#8884d8"
                fillOpacity={0.6}
              />
            </RadarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Daily Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>日次トレンド</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[0, 5]} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="ストレス"
                stroke="hsl(var(--chart-1))"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="睡眠"
                stroke="hsl(var(--chart-2))"
                strokeWidth={2}
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Advice Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            {data.advice.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {data.advice.points.map((point, index) => (
              <li key={index} className="flex items-start gap-2">
                <Target className="h-4 w-4 mt-0.5 text-primary" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}