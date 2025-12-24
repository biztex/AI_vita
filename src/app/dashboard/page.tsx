"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ProtectedRoute } from "@/features/auth/components/protected-route"
import { useAuth } from "@/lib/auth-context"
import { 
  Activity, 
  Brain, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Calendar,
  Target,
  Zap,
  Sparkles,
  Award
} from "lucide-react"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  RadialLinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Line, Radar } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  RadialLinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

// Mock data
const vitaAIDailyData = {
  service: "VitaAI",
  type: "daily",
  date: "2025-12-10",
  summary: {
    title: "今日のコンディションサマリー",
    overall_comment: "本日はコンディションは安定していますが、疲労管理を優先したい1日です。"
  },
  score_cards: [
    { label: "ストレス耐性", score: 2, trend: "down" },
    { label: "睡眠", score: 3, trend: "stable" },
    { label: "筋肉コンディション", score: 3, trend: "up" },
    { label: "疲労リスク", score: 4, trend: "up" }
  ],
  radar_chart: {
    labels: ["メンタル", "睡眠", "体脂肪", "糖化", "筋肉", "血管", "骨"],
    data: [2, 3, 2, 2, 3, 2, 2]
  },
  daily_trend: {
    labels: ["12/06", "12/07", "12/08", "12/09", "12/10"],
    datasets: [
      { label: "ストレス", data: [3, 3, 2, 2, 2] },
      { label: "睡眠", data: [3, 3, 3, 3, 3] }
    ]
  },
  advice: {
    title: "今日の最適化アクション",
    points: [
      "高負荷の運動は短時間に抑える",
      "午後以降のカフェインを控える",
      "就寝前はストレッチや入浴でリラックス"
    ]
  }
}

const vitaAIMonthlyData = {
  service: "VitaAI",
  type: "monthly",
  month: "2025-12",
  summary: {
    title: "今月のコンディション総括",
    overall_comment: "睡眠と基礎体力は安定。ストレスと疲労管理が今月のテーマでした。"
  },
  monthly_average_scores: [
    { label: "ストレス耐性", average: 2.4 },
    { label: "睡眠", average: 3.1 },
    { label: "筋肉", average: 3.0 },
    { label: "疲労リスク", average: 3.8 }
  ],
  trend_graph: {
    labels: ["週1", "週2", "週3", "週4"],
    data: [3.2, 3.0, 2.6, 2.4]
  },
  next_focus: [
    "スケジュールの詰め込みすぎを避ける",
    "回復時間を戦略的に確保",
    "睡眠・食事リズムの固定化"
  ]
}

const execuWellDailyData = {
  service: "ExecuWell",
  type: "daily",
  date: "2025-12-10",
  summary: {
    title: "本日の意思決定コンディション",
    overall_comment: "分析力が高く、慎重な判断がしやすい一方、決断の遅れに注意が必要です。"
  },
  score_cards: [
    { label: "判断負荷", score: 4 },
    { label: "集中力", score: 3 },
    { label: "判断スピード", score: 2 },
    { label: "感情安定度", score: 4 }
  ],
  decision_profile: {
    mbti: "ISTJ-A",
    disc: "C",
    enneagram: 5
  },
  daily_insight: {
    message: "今日は70%の確信で決断して問題ありません。完璧を求めすぎないことが鍵です。"
  },
  suggested_actions: [
    "小さな判断は即断",
    "重要判断は選択肢を3つに限定",
    "夜は結論を出さず整理のみ行う"
  ]
}

const execuWellMonthlyData = {
  service: "ExecuWell",
  type: "monthly",
  month: "2025-12",
  summary: {
    title: "今月の意思決定レビュー",
    overall_comment: "意思決定の質は安定していましたが、判断回数の多さによる疲労が見られました。"
  },
  decision_trend: {
    labels: ["週1", "週2", "週3", "週4"],
    data: [4.0, 4.1, 3.8, 3.6]
  },
  behavior_analysis: {
    strengths: [
      "論理的で一貫性のある判断",
      "感情に流されにくい"
    ],
    risks: [
      "判断を抱え込みやすい",
      "慎重になりすぎる傾向"
    ]
  },
  next_month_strategy: [
    "判断の委任ルールを作る",
    "考えない日を週1回設ける",
    "重要判断の時間帯を固定する"
  ]
}

const getTrendIcon = (trend: string) => {
  switch (trend) {
    case "up": return <TrendingUp className="w-4 h-4 text-green-400" />
    case "down": return <TrendingDown className="w-4 h-4 text-red-400" />
    default: return <Minus className="w-4 h-4 text-gray-400" />
  }
}

const getScoreColor = (score: number) => {
  if (score >= 4) return "text-red-400"
  if (score >= 3) return "text-yellow-400"
  return "text-green-400"
}

const getScoreBg = (score: number) => {
  if (score >= 4) return "bg-gradient-to-r from-red-500/20 to-red-600/20"
  if (score >= 3) return "bg-gradient-to-r from-yellow-500/20 to-yellow-600/20"
  return "bg-gradient-to-r from-green-500/20 to-green-600/20"
}

function DashboardContent() {
  const { user } = useAuth()
  const [service, setService] = useState<"vitaai" | "execuwell">("vitaai")
  const [period, setPeriod] = useState<"daily" | "monthly">("daily")

  const currentData = 
    service === "vitaai" 
      ? (period === "daily" ? vitaAIDailyData : vitaAIMonthlyData)
      : (period === "daily" ? execuWellDailyData : execuWellMonthlyData)

  // Chart configurations
  const radarData = service === "vitaai" && period === "daily" ? {
    labels: vitaAIDailyData.radar_chart.labels,
    datasets: [{
      label: 'コンディション',
      data: vitaAIDailyData.radar_chart.data,
      backgroundColor: 'rgba(0, 209, 178, 0.2)',
      borderColor: 'rgba(0, 209, 178, 1)',
      borderWidth: 2,
      pointBackgroundColor: 'rgba(0, 209, 178, 1)',
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6,
    }]
  } : null

  const radarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        beginAtZero: true,
        max: 5,
        ticks: { 
          stepSize: 1, 
          color: '#64748b',
          backdropColor: 'transparent'
        },
        grid: { color: '#334155' },
        pointLabels: { 
          color: '#94a3b8', 
          font: { size: 13, weight: '500' }
        }
      }
    },
    plugins: {
      legend: { display: false }
    }
  }

  const lineData = period === "daily" 
    ? (service === "vitaai" ? {
        labels: vitaAIDailyData.daily_trend.labels,
        datasets: vitaAIDailyData.daily_trend.datasets.map((ds, i) => ({
          label: ds.label,
          data: ds.data,
          borderColor: i === 0 ? '#3b82f6' : '#10b981',
          backgroundColor: i === 0 ? 'rgba(59, 130, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)',
          tension: 0.4,
          fill: true,
          borderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: i === 0 ? '#3b82f6' : '#10b981',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
        }))
      } : null)
    : {
        labels: service === "vitaai" ? vitaAIMonthlyData.trend_graph.labels : execuWellMonthlyData.decision_trend.labels,
        datasets: [{
          label: service === "vitaai" ? "平均スコア" : "意思決定スコア",
          data: service === "vitaai" ? vitaAIMonthlyData.trend_graph.data : execuWellMonthlyData.decision_trend.data,
          borderColor: service === "vitaai" ? '#00d1b2' : '#7c3aed',
          backgroundColor: service === "vitaai" ? 'rgba(0, 209, 178, 0.1)' : 'rgba(124, 58, 237, 0.1)',
          tension: 0.4,
          fill: true,
          borderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: service === "vitaai" ? '#00d1b2' : '#7c3aed',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
        }]
      }

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { 
        display: true,
        labels: { 
          color: '#94a3b8',
          font: { size: 12, weight: '500' },
          padding: 15
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 5,
        ticks: { color: '#64748b', font: { size: 11 } },
        grid: { color: '#334155' }
      },
      x: {
        ticks: { color: '#64748b', font: { size: 11 } },
        grid: { color: '#334155' }
      }
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header with gradient */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-gradient">
            ダッシュボード
          </h1>
          <p className="text-muted-foreground flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-yellow-500" />
            {user?.name}さんの健康・パフォーマンス分析
          </p>
        </div>
        <Badge variant="outline" className="text-sm px-4 py-2 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/30">
          <Calendar className="w-4 h-4 mr-2" />
          {new Date().toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })}
        </Badge>
      </div>

      {/* Service & Period Tabs */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex gap-2">
            <button
              onClick={() => setService("vitaai")}
              className={`px-6 py-3 rounded-xl transition-all duration-300 flex items-center gap-2 font-medium ${
                service === "vitaai"
                  ? "bg-gradient-to-r from-[#00d1b2] to-[#00a693] text-white shadow-lg shadow-[#00d1b2]/30 scale-105"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:scale-105"
              }`}
            >
              <Activity className="w-5 h-5" />
              VitaAI
            </button>
            <button
              onClick={() => setService("execuwell")}
              className={`px-6 py-3 rounded-xl transition-all duration-300 flex items-center gap-2 font-medium ${
                service === "execuwell"
                  ? "bg-gradient-to-r from-[#7c3aed] to-[#5b21b6] text-white shadow-lg shadow-[#7c3aed]/30 scale-105"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:scale-105"
              }`}
            >
              <Brain className="w-5 h-5" />
              ExecuWell
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setPeriod("daily")}
              className={`px-5 py-2.5 rounded-lg transition-all duration-300 font-medium ${
                period === "daily"
                  ? service === "vitaai" 
                    ? "bg-[#00d1b2] text-white shadow-md" 
                    : "bg-[#7c3aed] text-white shadow-md"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              日次
            </button>
            <button
              onClick={() => setPeriod("monthly")}
              className={`px-5 py-2.5 rounded-lg transition-all duration-300 font-medium ${
                period === "monthly"
                  ? service === "vitaai" 
                    ? "bg-[#00d1b2] text-white shadow-md" 
                    : "bg-[#7c3aed] text-white shadow-md"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              月次
            </button>
          </div>
        </div>

        {/* Content for both services */}
        <div className="animate-in fade-in duration-500">
          {service === "vitaai" ? (
            <VitaAIReport 
              period={period} 
              data={currentData as any} 
              radarData={radarData}
              radarOptions={radarOptions}
              lineData={lineData}
              lineOptions={lineOptions}
            />
          ) : (
            <ExecuWellReport 
              period={period} 
              data={currentData as any}
              lineData={lineData}
              lineOptions={lineOptions}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// VitaAI Report Component
function VitaAIReport({ period, data, radarData, radarOptions, lineData, lineOptions }: any) {
  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card className="border-[#00d1b2]/30 bg-gradient-to-br from-card via-[#00d1b2]/5 to-card shadow-xl hover:shadow-2xl transition-all duration-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <div className="p-2 bg-[#00d1b2]/20 rounded-lg">
              <Activity className="w-5 h-5 text-[#00d1b2]" />
            </div>
            {data.summary.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg text-muted-foreground leading-relaxed">{data.summary.overall_comment}</p>
        </CardContent>
      </Card>

      {/* Score Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {period === "daily" 
          ? data.score_cards.map((card: any, i: number) => (
              <Card key={i} className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-[#00d1b2]/20 bg-gradient-to-br from-card to-[#00d1b2]/5">
                <CardHeader className="pb-3">
                  <CardDescription className="text-xs font-semibold uppercase tracking-wide">{card.label}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`text-5xl font-bold ${getScoreColor(card.score)}`}>
                      {card.score}
                    </div>
                    <div className="p-2 bg-secondary rounded-full">
                      {getTrendIcon(card.trend)}
                    </div>
                  </div>
                  <div className={`h-2 rounded-full ${getScoreBg(card.score)}`} />
                </CardContent>
              </Card>
            ))
          : data.monthly_average_scores.map((card: any, i: number) => (
              <Card key={i} className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-[#00d1b2]/20 bg-gradient-to-br from-card to-[#00d1b2]/5">
                <CardHeader className="pb-3">
                  <CardDescription className="text-xs font-semibold uppercase tracking-wide">{card.label}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className={`text-5xl font-bold mb-2 ${getScoreColor(card.average)}`}>
                    {card.average.toFixed(1)}
                  </div>
                  <Badge variant="outline" className="text-xs">月平均</Badge>
                </CardContent>
              </Card>
            ))
        }
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar Chart (Daily only) */}
        {period === "daily" && radarData && (
          <Card className="border-[#00d1b2]/20 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Award className="w-5 h-5 text-[#00d1b2]" />
                総合バランス
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[320px] flex items-center justify-center">
                <Radar data={radarData} options={radarOptions} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Trend Chart */}
        <Card className={`shadow-lg hover:shadow-xl transition-all duration-300 border-[#00d1b2]/20 ${period === "daily" ? "" : "lg:col-span-2"}`}>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#00d1b2]" />
              {period === "daily" ? "直近の推移" : "週次トレンド"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[320px]">
              {lineData && <Line data={lineData} options={lineOptions} />}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Advice/Focus */}
      <Card className="border-[#00d1b2]/30 bg-gradient-to-br from-card via-[#00d1b2]/5 to-card shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 bg-[#00d1b2]/20 rounded-lg">
              <Target className="w-5 h-5 text-[#00d1b2]" />
            </div>
            {period === "daily" ? data.advice.title : "来月のフォーカス"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-4">
            {(period === "daily" ? data.advice.points : data.next_focus).map((item: string, i: number) => (
              <li key={i} className="flex items-start gap-3 p-3 rounded-lg bg-[#00d1b2]/10 hover:bg-[#00d1b2]/20 transition-all duration-200">
                <Zap className="w-5 h-5 text-[#00d1b2] flex-shrink-0 mt-0.5" />
                <span className="leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

// ExecuWell Report Component
function ExecuWellReport({ period, data, lineData, lineOptions }: any) {
  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card className="border-[#7c3aed]/30 bg-gradient-to-br from-card via-[#7c3aed]/5 to-card shadow-xl hover:shadow-2xl transition-all duration-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <div className="p-2 bg-[#7c3aed]/20 rounded-lg">
              <Brain className="w-5 h-5 text-[#7c3aed]" />
            </div>
            {data.summary.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg text-muted-foreground leading-relaxed">{data.summary.overall_comment}</p>
        </CardContent>
      </Card>

      {/* Score Cards / Decision Profile */}
      {period === "daily" && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {data.score_cards.map((card: any, i: number) => (
              <Card key={i} className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-[#7c3aed]/20 bg-gradient-to-br from-card to-[#7c3aed]/5">
                <CardHeader className="pb-3">
                  <CardDescription className="text-xs font-semibold uppercase tracking-wide">{card.label}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className={`text-5xl font-bold mb-3 ${getScoreColor(card.score)}`}>
                    {card.score}
                  </div>
                  <div className={`h-2 rounded-full ${getScoreBg(card.score)}`} />
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-[#7c3aed]/30 shadow-lg bg-gradient-to-br from-card to-[#7c3aed]/5">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Award className="w-5 h-5 text-[#7c3aed]" />
                意思決定プロファイル
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Badge variant="outline" className="text-base px-5 py-2 bg-[#7c3aed]/10 border-[#7c3aed]/30">
                  MBTI: <span className="font-bold ml-1">{data.decision_profile.mbti}</span>
                </Badge>
                <Badge variant="outline" className="text-base px-5 py-2 bg-[#7c3aed]/10 border-[#7c3aed]/30">
                  DISC: <span className="font-bold ml-1">{data.decision_profile.disc}</span>
                </Badge>
                <Badge variant="outline" className="text-base px-5 py-2 bg-[#7c3aed]/10 border-[#7c3aed]/30">
                  Enneagram: <span className="font-bold ml-1">{data.decision_profile.enneagram}</span>
                </Badge>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Trend Chart / Daily Insight */}
      <Card className="shadow-lg hover:shadow-xl transition-all duration-300 border-[#7c3aed]/20">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#7c3aed]" />
            {period === "daily" ? "本日のインサイト" : "意思決定トレンド"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {period === "daily" ? (
            <div className="p-6 bg-gradient-to-br from-[#7c3aed]/10 to-[#7c3aed]/5 rounded-xl border border-[#7c3aed]/30 shadow-inner">
              <p className="text-lg leading-relaxed">{data.daily_insight.message}</p>
            </div>
          ) : (
            <div className="h-[320px]">
              {lineData && <Line data={lineData} options={lineOptions} />}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Behavior Analysis (Monthly only) */}
      {period === "monthly" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-green-500/30 bg-gradient-to-br from-card to-green-500/5 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader>
              <CardTitle className="text-lg text-green-400 flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                強み
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {data.behavior_analysis.strengths.map((item: string, i: number) => (
                  <li key={i} className="flex items-start gap-3 p-3 rounded-lg bg-green-500/10 hover:bg-green-500/20 transition-all duration-200">
                    <span className="text-green-400 text-xl">✓</span>
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="border-yellow-500/30 bg-gradient-to-br from-card to-yellow-500/5 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader>
              <CardTitle className="text-lg text-yellow-400 flex items-center gap-2">
                <Target className="w-5 h-5" />
                リスク
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {data.behavior_analysis.risks.map((item: string, i: number) => (
                  <li key={i} className="flex items-start gap-3 p-3 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 transition-all duration-200">
                    <span className="text-yellow-400 text-xl">⚠</span>
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Actions / Strategy */}
      <Card className="border-[#7c3aed]/30 bg-gradient-to-br from-card via-[#7c3aed]/5 to-card shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 bg-[#7c3aed]/20 rounded-lg">
              <Target className="w-5 h-5 text-[#7c3aed]" />
            </div>
            {period === "daily" ? "推奨アクション" : "来月の戦略"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-4">
            {(period === "daily" ? data.suggested_actions : data.next_month_strategy).map((item: string, i: number) => (
              <li key={i} className="flex items-start gap-3 p-3 rounded-lg bg-[#7c3aed]/10 hover:bg-[#7c3aed]/20 transition-all duration-200">
                <Zap className="w-5 h-5 text-[#7c3aed] flex-shrink-0 mt-0.5" />
                <span className="leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  )
}
