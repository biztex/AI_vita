import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, Briefcase, ArrowRight, Sparkles, Brain, Zap, Shield, Clock, HeartPulse, Crown, Check } from "lucide-react"

export default function LandingPage() {
  return (
    <div className="flex flex-col landing-page">
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
        
        <div className="mx-auto max-w-7xl relative z-10">
          <div className="text-center mb-16">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl text-foreground">
              サービス構成
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              健康とビジネスの両面で、あなたの意思決定をサポートする最先端のAI技術
            </p>
          </div>
          
          <div className="grid gap-8 md:grid-cols-3 items-stretch">
            {/* VitaAI Card */}
            <Card className="group relative overflow-hidden border border-border/50 transition-all duration-500 hover:shadow-2xl hover:scale-103 hover:-translate-y-2 bg-background flex flex-col h-full">
              <CardHeader className="relative text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#FFD700] mx-auto shadow-lg">
                  <HeartPulse className="h-8 w-8 text-[#0F2342]" />
                </div>
                <CardTitle className="text-2xl text-foreground font-bold">
                  VitaAI
                </CardTitle>
                <CardDescription className="text-base text-[#FFD700] font-semibold uppercase">
                  CONDITION MANAGEMENT
                </CardDescription>
              </CardHeader>
              
              <CardContent className="relative flex flex-col flex-1">
                <div className="flex-1 space-y-4">
                  <p className="text-foreground leading-relaxed text-sm">
                    遺伝子で体質を特定し、AIが毎日の最適行動を作る
                  </p>
                  <ul className="space-y-3 text-sm text-foreground">
                    <li className="flex items-start">
                      <Check className="mr-3 h-5 w-5 text-[#FFD700] flex-shrink-0 mt-0.5" />
                      <span>IDENSIL遺伝子解析による科学的な体質特定</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="mr-3 h-5 w-5 text-[#FFD700] flex-shrink-0 mt-0.5" />
                      <span>管理栄養士がヒアリングを担当 コンディション最適化戦略を設計</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="mr-3 h-5 w-5 text-[#FFD700] flex-shrink-0 mt-0.5" />
                      <span>LINEでの食事解析と睡眠ログ分析</span>
                    </li>
                  </ul>
                </div>
                <p className="text-[#FFD700] text-sm font-medium text-center pt-4 border-t border-border/50 mt-auto">
                  「コンディションの最適化」
                </p>
              </CardContent>
            </Card>

            {/* ExecuWell Card */}
            <Card className="group relative overflow-hidden border border-border/50 transition-all duration-500 hover:shadow-2xl hover:scale-103 hover:-translate-y-2 bg-background flex flex-col h-full">
              <CardHeader className="relative text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#FFD700] mx-auto shadow-lg">
                  <Brain className="h-8 w-8 text-[#0F2342]" />
                </div>
                <CardTitle className="text-2xl text-foreground font-bold">
                  ExecuWell
                </CardTitle>
                <CardDescription className="text-base text-[#FFD700] font-semibold uppercase">
                  DECISION SUPPORT
                </CardDescription>
              </CardHeader>
              
              <CardContent className="relative flex flex-col flex-1">
                <div className="flex-1 space-y-4">
                  <p className="text-foreground leading-relaxed text-sm">
                    性格診断+認知プロファイル×AI × 専門家で、経営判断の質を毎日改善
                  </p>
                  <ul className="space-y-3 text-sm text-foreground">
                    <li className="flex items-start">
                      <Check className="mr-3 h-5 w-5 text-[#FFD700] flex-shrink-0 mt-0.5" />
                      <span>性格診断に基づく認知プロファイル解読</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="mr-3 h-5 w-5 text-[#FFD700] flex-shrink-0 mt-0.5" />
                      <span>経営コンサルタントがヒアリングを担当 意思決定フレームワークを構築</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="mr-3 h-5 w-5 text-[#FFD700] flex-shrink-0 mt-0.5" />
                      <span>ExecuWellAIが24時間チャット対応 専属プライベートコンサルタントとして疑問や悩みに即座に対応</span>
                    </li>
                  </ul>
                </div>
                <p className="text-[#FFD700] text-sm font-medium text-center pt-4 border-t border-border/50 mt-auto">
                  「意思決定プロセスの最適化」
                </p>
              </CardContent>
            </Card>

            {/* Exe & Vita Card */}
            <Card className="group relative overflow-hidden border border-border/50 transition-all duration-500 hover:shadow-2xl hover:scale-103 hover:-translate-y-2 bg-background flex flex-col h-full">
              {/* RECOMMENDED Badge */}
              <div className="absolute top-0 right-0 bg-[#FFD700] text-[#0F2342] px-4 py-1 text-xs font-bold rounded-bl-lg shadow-lg z-10">
                RECOMMENDED
              </div>
              
              <CardHeader className="relative text-center pt-8">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#FFD700] mx-auto shadow-lg">
                  <Crown className="h-8 w-8 text-[#0F2342]" />
                </div>
                <CardTitle className="text-2xl text-foreground font-bold">
                  エグゼ & ビータ
                </CardTitle>
                <CardDescription className="text-base text-[#FFD700] font-semibold uppercase">
                  TOTAL INFRASTRUCTURE
                </CardDescription>
              </CardHeader>
              
              <CardContent className="relative flex flex-col flex-1">
                <div className="flex-1 space-y-4">
                  <p className="text-foreground leading-relaxed text-sm">
                    健康と判断力をAIが毎日守る、経営者専用インフラ
                  </p>
                  <ul className="space-y-3 text-sm text-foreground">
                    <li className="flex items-start">
                      <Check className="mr-3 h-5 w-5 text-[#FFD700] flex-shrink-0 mt-0.5" />
                      <span>心身と判断力の両輪を統合サポート</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="mr-3 h-5 w-5 text-[#FFD700] flex-shrink-0 mt-0.5" />
                      <span>統合ダッシュボードでの状態可視化</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="mr-3 h-5 w-5 text-[#FFD700] flex-shrink-0 mt-0.5" />
                      <span>専門家チームによる包括的レビュー</span>
                    </li>
                  </ul>
                </div>
                <p className="text-[#FFD700] text-sm font-medium text-center pt-4 border-t border-border/50 mt-auto">
                  「パフォーマンスの最大化と持続」
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative container mx-auto px-4 py-24 overflow-hidden">
        
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
