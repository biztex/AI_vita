import Link from "next/link"

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-8 md:grid-cols-3">
          {/* Brand */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">VitaAI / ExecuWell</h3>
            <p className="text-sm text-muted-foreground">
              AIを活用したエグゼクティブの健康インサイトとビジネスインテリジェンス
            </p>
          </div>

          {/* Links */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">法的情報</h4>
            <div className="flex flex-col space-y-2 text-sm">
              <Link href="/privacy" className="text-muted-foreground hover:text-foreground">
                プライバシーポリシー
              </Link>
              <Link href="/terms" className="text-muted-foreground hover:text-foreground">
                利用規約
              </Link>
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">サポート</h4>
            <div className="flex flex-col space-y-2 text-sm">
              <Link href="/contact" className="text-muted-foreground hover:text-foreground">
                お問い合わせ
              </Link>
              <Link href="/docs" className="text-muted-foreground hover:text-foreground">
                ドキュメント
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-border pt-6 text-center text-sm text-muted-foreground">
          <p>&copy; {currentYear} VitaAI / ExecuWell. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
