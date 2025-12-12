"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ProtectedRoute } from "@/features/auth/components/protected-route"
import { useAuth } from "@/lib/auth-context"
import { Activity, Briefcase, ArrowRight, TrendingUp, Calendar } from "lucide-react"
import Image from "next/image"

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
        <Card className="group relative overflow-hidden border-2 transition-all hover:border-primary text-center">
          <CardHeader className="flex flex-col items-center justify-center">
            <div className="mb-4 flex h-40 w-40 items-center justify-center rounded-2xl text-center">
              <Image src="/img/ai-doctor.png" alt="vitaai" />
              {/* <Activity className="h-7 w-7 text-primary" /> */} 
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
          <CardHeader className="flex flex-col items-center justify-center">
            <div className="mb-4 flex h-40 w-40 items-center justify-center rounded-2xl">
              {/* <Briefcase className="h-7 w-7 text-primary" /> */}
              <Image src="/img/management.png" alt="execuwell" />

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
