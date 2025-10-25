import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, Briefcase, ArrowRight, Sparkles, Brain, Zap, Shield, Clock } from "lucide-react"

export default function LandingPage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative container mx-auto px-4 py-24 md:py-32 overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-r from-vitaai/20 to-success/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-gradient-to-r from-execuwell/20 to-accent/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-primary/10 to-accent/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
        </div>
        
        <div className="mx-auto max-w-4xl text-center relative z-10">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-6 py-3 text-sm font-medium text-primary backdrop-blur-sm hover:bg-primary/20 transition-all duration-300 hover:scale-105">
            <Sparkles className="h-4 w-4 animate-spin" />
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent font-semibold">
              AI搭載インテリジェンス
            </span>
          </div>
          
          <h1 className="mb-6 text-balance text-5xl font-bold tracking-tight md:text-6xl lg:text-7xl">
            <span className="bg-gradient-to-r from-vitaai to-success bg-clip-text text-transparent animate-pulse">
              健康
            </span>
            <span className="mx-2">と</span>
            <span className="bg-gradient-to-r from-execuwell to-accent bg-clip-text text-transparent animate-pulse" style={{animationDelay: '0.5s'}}>
              ビジネス
            </span>
            <br />
            <span className="text-foreground">のための</span>
            <br />
            <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent bg-[length:200%_100%] animate-gradient-x">
              エグゼクティブインテリジェンス
            </span>
          </h1>
          
          <p className="mb-8 text-pretty text-lg text-muted-foreground md:text-xl max-w-3xl mx-auto leading-relaxed">
            エグゼクティブの健康を最適化し、より良いビジネス判断を支援するAI搭載インサイト。
            <span className="text-primary font-semibold">パーソナライズ</span>され、
            <span className="text-success font-semibold">安全</span>で、
            <span className="text-accent font-semibold">常に利用可能</span>です。
          </p>
          
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row mb-12">
            <Button size="lg" asChild className="bg-gradient-to-r from-primary to-accent hover:from-accent hover:to-primary text-primary-foreground shadow-lg shadow-primary/25 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-primary/40 group">
              <Link href="/auth/register" className="flex items-center gap-2">
                今すぐ始める
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="border-primary/20 hover:bg-primary/10 transition-all duration-300 hover:scale-105 backdrop-blur-sm">
              <Link href="/auth/login">ログイン</Link>
            </Button>
          </div>

          {/* Feature highlights */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
            <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-card/50 backdrop-blur-sm border border-border/50 hover:bg-card/80 transition-all duration-300 hover:scale-105">
              <Brain className="h-6 w-6 text-primary" />
              <span className="text-xs font-medium text-muted-foreground">AI分析</span>
            </div>
            <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-card/50 backdrop-blur-sm border border-border/50 hover:bg-card/80 transition-all duration-300 hover:scale-105">
              <Zap className="h-6 w-6 text-success" />
              <span className="text-xs font-medium text-muted-foreground">高速処理</span>
            </div>
            <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-card/50 backdrop-blur-sm border border-border/50 hover:bg-card/80 transition-all duration-300 hover:scale-105">
              <Shield className="h-6 w-6 text-accent" />
              <span className="text-xs font-medium text-muted-foreground">セキュア</span>
            </div>
            <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-card/50 backdrop-blur-sm border border-border/50 hover:bg-card/80 transition-all duration-300 hover:scale-105">
              <Clock className="h-6 w-6 text-warning" />
              <span className="text-xs font-medium text-muted-foreground">24/7対応</span>
            </div>
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section className="relative container mx-auto px-4 py-16 overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-r from-vitaai/10 to-success/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-r from-execuwell/10 to-accent/10 rounded-full blur-3xl"></div>
        </div>
        
        <div className="mx-auto max-w-6xl relative z-10">
          <div className="text-center mb-16">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              2つの強力なAIアシスタント
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              健康とビジネスの両面で、あなたの意思決定をサポートする最先端のAI技術
            </p>
          </div>
          
          <div className="grid gap-8 md:grid-cols-2">
            {/* VitaAI Card */}
            <Card className="group relative overflow-hidden border-2 border-vitaai/20 transition-all duration-500 hover:border-vitaai hover:shadow-2xl hover:shadow-vitaai/20 hover:-translate-y-2 bg-card/80 backdrop-blur-sm">
              <div className="absolute inset-0 bg-gradient-to-br from-vitaai/5 via-success/5 to-transparent opacity-0 transition-all duration-500 group-hover:opacity-100" />
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-vitaai/10 to-success/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              <CardHeader className="relative">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-vitaai to-success shadow-lg group-hover:shadow-xl group-hover:shadow-vitaai/30 transition-all duration-300 group-hover:scale-110">
                  <Activity className="h-7 w-7 text-vitaai-foreground group-hover:animate-pulse" />
                </div>
                <CardTitle className="text-2xl text-vitaai group-hover:text-vitaai/90 transition-colors">
                  VitaAI
                </CardTitle>
                <CardDescription className="text-base group-hover:text-muted-foreground/80 transition-colors">
                  あなた専用の健康インテリジェンスアシスタント
                </CardDescription>
              </CardHeader>
              
              <CardContent className="relative space-y-4">
                <p className="text-muted-foreground group-hover:text-muted-foreground/90 transition-colors leading-relaxed">
                  遺伝子データ、ライフスタイル、目標に基づいたパーソナライズされた健康インサイトを取得。VitaAIは毎日のレポートと実行可能な推奨事項であなたのウェルビーイングを最適化します。
                </p>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex items-start group-hover:text-muted-foreground/90 transition-colors">
                    <span className="mr-3 text-vitaai text-lg group-hover:scale-110 transition-transform">•</span>
                    遺伝子分析統合
                  </li>
                  <li className="flex items-start group-hover:text-muted-foreground/90 transition-colors">
                    <span className="mr-3 text-vitaai text-lg group-hover:scale-110 transition-transform">•</span>
                    毎日の健康レポート
                  </li>
                  <li className="flex items-start group-hover:text-muted-foreground/90 transition-colors">
                    <span className="mr-3 text-vitaai text-lg group-hover:scale-110 transition-transform">•</span>
                    パーソナライズされた推奨事項
                  </li>
                </ul>
                <Button className="w-full border-vitaai/20 text-vitaai hover:bg-vitaai/10 transition-all duration-300 group-hover:border-vitaai/40 group-hover:bg-vitaai/20 hover:scale-105" variant="outline" asChild>
                  <Link href="/vitaai/chat" className="flex items-center justify-center gap-2">
                    VitaAIを試す
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* ExecuWell Card */}
            <Card className="group relative overflow-hidden border-2 border-execuwell/20 transition-all duration-500 hover:border-execuwell hover:shadow-2xl hover:shadow-execuwell/20 hover:-translate-y-2 bg-card/80 backdrop-blur-sm">
              <div className="absolute inset-0 bg-gradient-to-br from-execuwell/5 via-accent/5 to-transparent opacity-0 transition-all duration-500 group-hover:opacity-100" />
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-execuwell/10 to-accent/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              <CardHeader className="relative">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-execuwell to-accent shadow-lg group-hover:shadow-xl group-hover:shadow-execuwell/30 transition-all duration-300 group-hover:scale-110">
                  <Briefcase className="h-7 w-7 text-execuwell-foreground group-hover:animate-pulse" />
                </div>
                <CardTitle className="text-2xl text-execuwell group-hover:text-execuwell/90 transition-colors">
                  ExecuWell
                </CardTitle>
                <CardDescription className="text-base group-hover:text-muted-foreground/80 transition-colors">
                  あなたのビジネスインテリジェンスパートナー
                </CardDescription>
              </CardHeader>
              
              <CardContent className="relative space-y-4">
                <p className="text-muted-foreground group-hover:text-muted-foreground/90 transition-colors leading-relaxed">
                  AI搭載のビジネスインサイト、市場分析、戦略的推奨事項で一歩先を行く。ExecuWellは経済ニュースとトレンドであなたに情報を提供し続けます。
                </p>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex items-start group-hover:text-muted-foreground/90 transition-colors">
                    <span className="mr-3 text-execuwell text-lg group-hover:scale-110 transition-transform">•</span>
                    市場インテリジェンス
                  </li>
                  <li className="flex items-start group-hover:text-muted-foreground/90 transition-colors">
                    <span className="mr-3 text-execuwell text-lg group-hover:scale-110 transition-transform">•</span>
                    経済ニュースサマリー
                  </li>
                  <li className="flex items-start group-hover:text-muted-foreground/90 transition-colors">
                    <span className="mr-3 text-execuwell text-lg group-hover:scale-110 transition-transform">•</span>
                    戦略的インサイト
                  </li>
                </ul>
                <Button className="w-full border-execuwell/20 text-execuwell hover:bg-execuwell/10 transition-all duration-300 group-hover:border-execuwell/40 group-hover:bg-execuwell/20 hover:scale-105" variant="outline" asChild>
                  <Link href="/execuwell/chat" className="flex items-center justify-center gap-2">
                    ExecuWellを試す
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative container mx-auto px-4 py-24 overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/5 via-accent/5 to-primary/5"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-primary/10 to-accent/10 rounded-full blur-3xl animate-pulse"></div>
        </div>
        
        <div className="mx-auto max-w-3xl relative z-10">
          <div className="rounded-3xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 p-8 text-center md:p-12 backdrop-blur-sm hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/20 transition-all duration-500 hover:-translate-y-1">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-medium text-primary backdrop-blur-sm">
              <Sparkles className="h-4 w-4 animate-spin" />
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent font-semibold">
                今すぐ始めませんか？
              </span>
            </div>
            
            <h2 className="mb-4 text-3xl font-bold md:text-4xl bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              AIで健康とビジネスの意思決定を最適化
            </h2>
            <p className="mb-8 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              AIで健康とビジネスの意思決定を最適化しているエグゼクティブに参加しましょう。
              <span className="text-primary font-semibold">無料</span>で始められます。
            </p>
            
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button size="lg" asChild className="bg-gradient-to-r from-primary to-accent hover:from-accent hover:to-primary text-primary-foreground shadow-lg shadow-primary/25 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-primary/40 group">
                <Link href="/auth/register" className="flex items-center gap-2">
                  無料登録
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="border-primary/20 hover:bg-primary/10 transition-all duration-300 hover:scale-105 backdrop-blur-sm">
                <Link href="/auth/login">ログイン</Link>
              </Button>
            </div>
            
            <div className="mt-8 flex items-center justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-success animate-pulse"></div>
                <span>無料で始められる</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" style={{animationDelay: '0.5s'}}></div>
                <span>セキュア</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-accent animate-pulse" style={{animationDelay: '1s'}}></div>
                <span>24/7サポート</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
