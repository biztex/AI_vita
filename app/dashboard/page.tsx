"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { useAuth } from "@/lib/auth-context"
import { Activity, Briefcase, ArrowRight, TrendingUp, Calendar } from "lucide-react"

function DashboardContent() {
  const { user } = useAuth()

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Welcome Section */}
      <div className="mb-12">
        <h1 className="mb-2 text-4xl font-bold">おかえりなさい、{user?.name}さん</h1>
        <p className="text-lg text-muted-foreground">
          AIアシスタントがあなたの健康とビジネスの意思決定を最適化する準備ができています。
        </p>
      </div>

      {/* Product Cards */}
      <div className="mb-12 grid gap-6 md:grid-cols-2">
        {/* VitaAI Card */}
        <Card className="group relative overflow-hidden border-2 transition-all hover:border-primary">
          <CardHeader>
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <Activity className="h-7 w-7 text-primary" />
            </div>
            <CardTitle className="text-2xl">VitaAI</CardTitle>
            <CardDescription className="text-base">あなた専用の健康インテリジェンスアシスタント</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              遺伝子データ、ライフスタイル、目標に基づいたパーソナライズされた健康インサイトを取得。
            </p>
            <Button className="w-full" asChild>
              <Link href="/vitaai/chat">
                VitaAIチャットを開く
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* ExecuWell Card */}
        <Card className="group relative overflow-hidden border-2 transition-all hover:border-primary">
          <CardHeader>
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <Briefcase className="h-7 w-7 text-primary" />
            </div>
            <CardTitle className="text-2xl">ExecuWell</CardTitle>
            <CardDescription className="text-base">あなたのビジネスインテリジェンスパートナー</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              AI搭載のビジネスインサイト、市場分析、戦略的推奨事項で一歩先を行く。
            </p>
            <Button className="w-full" asChild>
              <Link href="/execuwell/chat">
                ExecuWellチャットを開く
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Latest Summary */}
      <div className="mb-12">
        <h2 className="mb-6 text-2xl font-bold">最新サマリー</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {/* Health Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Activity className="mr-2 h-5 w-5 text-primary" />
                健康状態
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">日次レポート</span>
                <span className="text-sm font-medium text-green-500">アクティブ</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">最終更新</span>
                <span className="text-sm font-medium">今日 9:00</span>
              </div>
              <Button variant="outline" size="sm" className="mt-4 w-full bg-transparent" asChild>
                <Link href="/vitaai/chat">詳細を見る</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Business Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <TrendingUp className="mr-2 h-5 w-5 text-primary" />
                市場インサイト
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">ニュースサマリー</span>
                <span className="text-sm font-medium text-green-500">アクティブ</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">最終更新</span>
                <span className="text-sm font-medium">今日 8:00</span>
              </div>
              <Button variant="outline" size="sm" className="mt-4 w-full bg-transparent" asChild>
                <Link href="/execuwell/chat">詳細を見る</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Calendar className="mr-2 h-5 w-5 text-primary" />
                クイックアクション
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" size="sm" className="w-full justify-start bg-transparent" asChild>
                <Link href="/profile">プロフィール更新</Link>
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start bg-transparent" asChild>
                <Link href="/profile">診断結果アップロード</Link>
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start bg-transparent" asChild>
                <Link href="/settings">設定</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Subscription Badge */}
      {user?.subscription && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="flex items-center justify-between py-4">
            <div>
              <p className="text-sm font-medium">現在のプラン</p>
              <p className="text-lg font-bold capitalize">{user.subscription}</p>
            </div>
            <Button variant="outline" size="sm" className="bg-transparent">
              サブスクリプション管理
            </Button>
          </CardContent>
        </Card>
      )}
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
