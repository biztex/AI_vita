"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProtectedRoute } from "@/features/auth/components/protected-route"
import { VitaAIDailyReport } from "@/components/reports/vitaai-daily-report"
import { VitaAIMonthlyReport } from "@/components/reports/vitaai-monthly-report"
import { ExecuWellDailyReport } from "@/components/reports/execuwell-daily-report"
import { ExecuWellMonthlyReport } from "@/components/reports/execuwell-monthly-report"
import type { Report } from "@/types/reports"
import { apiClient } from "@/lib/api"

function ReportsContent() {
  const [vitaAIDaily, setVitaAIDaily] = useState<Report | null>(null)
  const [vitaAIMonthly, setVitaAIMonthly] = useState<Report | null>(null)
  const [execuWellDaily, setExecuWellDaily] = useState<Report | null>(null)
  const [execuWellMonthly, setExecuWellMonthly] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // TODO: Replace with actual API calls
    // For now, using mock data
    const loadReports = async () => {
      try {
        // Example API calls (adjust based on your backend):
        // const vitaAIDailyData = await apiClient.reports.getDaily("VitaAI", "2025-12-10")
        // const vitaAIMonthlyData = await apiClient.reports.getMonthly("VitaAI", "2025-12")
        // const execuWellDailyData = await apiClient.reports.getDaily("ExecuWell", "2025-12-10")
        // const execuWellMonthlyData = await apiClient.reports.getMonthly("ExecuWell", "2025-12")
        
        // Mock data for now
        setVitaAIDaily({
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
        })

        setVitaAIMonthly({
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
        })

        setExecuWellDaily({
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
        })

        setExecuWellMonthly({
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
        })
      } catch (error) {
        console.error("Failed to load reports:", error)
      } finally {
        setLoading(false)
      }
    }

    loadReports()
  }, [])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center">読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="mb-8 text-4xl font-bold">レポート</h1>
      
      <Tabs defaultValue="vitaai" className="space-y-6">
        <TabsList>
          <TabsTrigger value="vitaai">VitaAI</TabsTrigger>
          <TabsTrigger value="execuwell">ExecuWell</TabsTrigger>
        </TabsList>

        <TabsContent value="vitaai" className="space-y-6">
          <Tabs defaultValue="daily">
            <TabsList>
              <TabsTrigger value="daily">日次レポート</TabsTrigger>
              <TabsTrigger value="monthly">月次レポート</TabsTrigger>
            </TabsList>
            <TabsContent value="daily">
              {vitaAIDaily && <VitaAIDailyReport data={vitaAIDaily as any} />}
            </TabsContent>
            <TabsContent value="monthly">
              {vitaAIMonthly && <VitaAIMonthlyReport data={vitaAIMonthly as any} />}
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="execuwell" className="space-y-6">
          <Tabs defaultValue="daily">
            <TabsList>
              <TabsTrigger value="daily">日次レポート</TabsTrigger>
              <TabsTrigger value="monthly">月次レポート</TabsTrigger>
            </TabsList>
            <TabsContent value="daily">
              {execuWellDaily && <ExecuWellDailyReport data={execuWellDaily as any} />}
            </TabsContent>
            <TabsContent value="monthly">
              {execuWellMonthly && <ExecuWellMonthlyReport data={execuWellMonthly as any} />}
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function ReportsPage() {
  return (
    <ProtectedRoute>
      <ReportsContent />
    </ProtectedRoute>
  )
}
