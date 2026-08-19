import Link from "next/link"
import { Brain, Shield, Zap, Mail, FileText } from "lucide-react"

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t border-border/50 bg-gradient-to-r from-background/95 to-background/90 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-primary to-accent flex items-center justify-center">
                <Brain className="h-5 w-5 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                VitaAI / ExecuWell
              </h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              判断と健康をひとつに支える、経営層のための AI コンシェルジュ
            </p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Shield className="h-3 w-3 text-success" />
                <span>セキュア</span>
              </div>
              <div className="flex items-center gap-1">
                <Zap className="h-3 w-3 text-primary" />
                <span>高速</span>
              </div>
            </div>
          </div>

          {/* Products */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-foreground">AIアシスタント</h4>
            <div className="flex flex-col space-y-3 text-sm">
              <Link href="/vitaai/chat" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-vitaai"></div>
                <span>VitaAI - 健康インテリジェンス</span>
              </Link>
              <Link href="/execuwell/chat" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-execuwell"></div>
                <span>ExecuWell - ビジネスインテリジェンス</span>
              </Link>
            </div>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-foreground">法的情報</h4>
            <div className="flex flex-col space-y-3 text-sm">
              <Link href="/privacy" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2">
                <FileText className="h-3 w-3" />
                <span>プライバシーポリシー</span>
              </Link>
              <Link href="/terms" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2">
                <FileText className="h-3 w-3" />
                <span>利用規約</span>
              </Link>
            </div>
          </div>

          {/* Support */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-foreground">サポート</h4>
            <div className="flex flex-col space-y-3 text-sm">
              <Link href="/contact" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2">
                <Mail className="h-3 w-3" />
                <span>お問い合わせ</span>
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-border/50 pt-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              &copy; {currentYear} VitaAI / ExecuWell. All rights reserved.
            </p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>Powered by AI</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
