import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, Briefcase, ArrowRight, Sparkles } from "lucide-react"

export default function LandingPage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-24 md:py-32">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
            <Sparkles className="h-4 w-4" />
            AI搭載インテリジェンス
          </div>
          <h1 className="mb-6 text-balance text-5xl font-bold tracking-tight md:text-6xl lg:text-7xl">
            <span className="bg-gradient-to-r from-vitaai to-success bg-clip-text text-transparent">
              健康
            </span>
            と
            <span className="bg-gradient-to-r from-execuwell to-accent bg-clip-text text-transparent">
              ビジネス
            </span>
            のためのエグゼクティブインテリジェンス
          </h1>
          <p className="mb-8 text-pretty text-lg text-muted-foreground md:text-xl">
            エグゼクティブの健康を最適化し、より良いビジネス判断を支援するAI搭載インサイト。パーソナライズされ、安全で、常に利用可能です。
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" asChild className="bg-gradient-to-r from-primary to-accent hover:from-accent hover:to-primary text-primary-foreground shadow-lg shadow-primary/25 transition-all duration-200 hover:scale-105">
              <Link href="/auth/register">
                今すぐ始める
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="border-primary/20 hover:bg-primary/10 transition-all duration-200">
              <Link href="/auth/login">ログイン</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-12 text-center text-3xl font-bold md:text-4xl">2つの強力なAIアシスタント</h2>
          <div className="grid gap-8 md:grid-cols-2">
            {/* VitaAI Card */}
            <Card className="group relative overflow-hidden border-2 border-vitaai/20 transition-all hover:border-vitaai hover:shadow-lg hover:shadow-vitaai/10">
              <div className="absolute inset-0 bg-gradient-to-br from-vitaai/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              <CardHeader className="relative">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-vitaai to-success shadow-lg">
                  <Activity className="h-6 w-6 text-vitaai-foreground" />
                </div>
                <CardTitle className="text-2xl text-vitaai">VitaAI</CardTitle>
                <CardDescription className="text-base">あなた専用の健康インテリジェンスアシスタント</CardDescription>
              </CardHeader>
              <CardContent className="relative space-y-4">
                <p className="text-muted-foreground">
                  遺伝子データ、ライフスタイル、目標に基づいたパーソナライズされた健康インサイトを取得。VitaAIは毎日のレポートと実行可能な推奨事項であなたのウェルビーイングを最適化します。
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start">
                    <span className="mr-2 text-vitaai">•</span>
                    遺伝子分析統合
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 text-vitaai">•</span>
                    毎日の健康レポート
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 text-vitaai">•</span>
                    パーソナライズされた推奨事項
                  </li>
                </ul>
                <Button className="w-full border-vitaai/20 text-vitaai hover:bg-vitaai/10 transition-all duration-200" variant="outline" asChild>
                  <Link href="/vitaai/chat">
                    VitaAIを試す
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* ExecuWell Card */}
            <Card className="group relative overflow-hidden border-2 border-execuwell/20 transition-all hover:border-execuwell hover:shadow-lg hover:shadow-execuwell/10">
              <div className="absolute inset-0 bg-gradient-to-br from-execuwell/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              <CardHeader className="relative">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-execuwell to-accent shadow-lg">
                  <Briefcase className="h-6 w-6 text-execuwell-foreground" />
                </div>
                <CardTitle className="text-2xl text-execuwell">ExecuWell</CardTitle>
                <CardDescription className="text-base">あなたのビジネスインテリジェンスパートナー</CardDescription>
              </CardHeader>
              <CardContent className="relative space-y-4">
                <p className="text-muted-foreground">
                  AI搭載のビジネスインサイト、市場分析、戦略的推奨事項で一歩先を行く。ExecuWellは経済ニュースとトレンドであなたに情報を提供し続けます。
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start">
                    <span className="mr-2 text-execuwell">•</span>
                    市場インテリジェンス
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 text-execuwell">•</span>
                    経済ニュースサマリー
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 text-execuwell">•</span>
                    戦略的インサイト
                  </li>
                </ul>
                <Button className="w-full border-execuwell/20 text-execuwell hover:bg-execuwell/10 transition-all duration-200" variant="outline" asChild>
                  <Link href="/execuwell/chat">
                    ExecuWellを試す
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-24">
        <div className="mx-auto max-w-3xl rounded-3xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 p-8 text-center md:p-12">
          <h2 className="mb-4 text-3xl font-bold md:text-4xl">今すぐ始めませんか？</h2>
          <p className="mb-8 text-lg text-muted-foreground">
            AIで健康とビジネスの意思決定を最適化しているエグゼクティブに参加しましょう。
          </p>
          <Button size="lg" asChild className="bg-gradient-to-r from-primary to-accent hover:from-accent hover:to-primary text-primary-foreground shadow-lg shadow-primary/25 transition-all duration-200 hover:scale-105">
            <Link href="/auth/register">
              無料登録
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  )
}
