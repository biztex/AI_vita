"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Clock } from "lucide-react"

export default function AdminReportsPage() {
  const [dailyHealthReport, setDailyHealthReport] = useState(true)
  const [economicNews, setEconomicNews] = useState(true)

  const handleSave = () => {
    console.log("[v0] Saving report settings:", { dailyHealthReport, economicNews })
    // Mock save - in production, call API
  }

  return (
    <div className="p-8">
      <div className="mb-6 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-600 dark:text-amber-400">
        このページはサンプルです（実データ未接続）
      </div>
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">レポート管理</h1>
        <p className="text-muted-foreground">自動化されたレポートと通知を設定</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Daily Health Report */}
        <Card>
          <CardHeader>
            <CardTitle>毎日の健康レポート</CardTitle>
            <CardDescription>VitaAIユーザーに自動的に送信される健康洞察</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <Label htmlFor="daily-health" className="flex flex-col space-y-1">
                <span className="font-medium">毎日のレポートを有効化</span>
                <span className="text-sm font-normal text-muted-foreground">毎朝9:00にレポートを送信</span>
              </Label>
              <Switch id="daily-health" checked={dailyHealthReport} onCheckedChange={setDailyHealthReport} />
            </div>

            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <div className="flex items-center space-x-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">スケジュール: 毎朝9:00</span>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">レポートに含まれる内容:</p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li className="flex items-start">
                  <span className="mr-2 text-primary">•</span>
                  個別の健康洞察
                </li>
                <li className="flex items-start">
                  <span className="mr-2 text-primary">•</span>
                  アクティビティの推奨事項
                </li>
                <li className="flex items-start">
                  <span className="mr-2 text-primary">•</span>
                  栄養のtips
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Economic News Summary */}
        <Card>
          <CardHeader>
            <CardTitle>経済ニュースサマリー</CardTitle>
            <CardDescription>ExecuWellユーザーに自動的に送信される経済ニュース</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <Label htmlFor="economic-news" className="flex flex-col space-y-1">
                <span className="font-medium">経済ニュースサマリーを有効化</span>
                <span className="text-sm font-normal text-muted-foreground">
                  毎朝8:00にサマリーを送信
                </span>
              </Label>
              <Switch id="economic-news" checked={economicNews} onCheckedChange={setEconomicNews} />
            </div>

            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <div className="flex items-center space-x-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">スケジュール：毎日午前8時</span>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">サマリーに含まれる内容:</p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li className="flex items-start">
                  <span className="mr-2 text-primary">•</span>
                  市場のトレンドと分析
                </li>
                <li className="flex items-start">
                  <span className="mr-2 text-primary">•</span>
                  業界ニュースのハイライト
                </li>
                <li className="flex items-start">
                  <span className="mr-2 text-primary">•</span>
                  戦略的な推奨事項
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Save Button */}
      <div className="mt-6">
        <Button onClick={handleSave}>変更を保存</Button>
      </div>
    </div>
  )
}
