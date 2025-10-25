import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import type { User } from "@/lib/auth-context"

type ChatInfoPanelProps = {
  user: User
  service: "vitaai" | "execuwell"
}

export function ChatInfoPanel({ user, service }: ChatInfoPanelProps) {
  return (
    <div className="hidden w-80 border-l border-border bg-muted/30 p-6 md:block">
      <div className="space-y-6">
        {/* User Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">あなたのプロフィール</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-3">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {user.name?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm font-medium">{user.name}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
            </div>
            {user.subscription && (
              <div>
                <p className="mb-1 text-xs text-muted-foreground">サブスクリプション</p>
                <Badge variant="secondary" className="capitalize">
                  {user.subscription}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Service Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{service === "vitaai" ? "VitaAI" : "ExecuWell"} ステータス</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">最新レポート</span>
              <span className="text-sm font-medium">今日 9:00</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">ステータス</span>
              <Badge variant="outline" className="bg-green-500/10 text-green-500">
                アクティブ
              </Badge>
            </div>
            {service === "vitaai" && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">遺伝子データ</span>
                <Badge variant="outline" className="bg-green-500/10 text-green-500">
                  アップロード済み
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Tips */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">クイックヒント</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start">
                <span className="mr-2 text-primary">•</span>
                {service === "vitaai"
                  ? "健康指標について質問し、パーソナライズされた推奨事項を取得"
                  : "市場分析とビジネスインサイトをリクエスト"}
              </li>
              <li className="flex items-start">
                <span className="mr-2 text-primary">•</span>
                ハンズフリー操作には音声入力を使用
              </li>
              <li className="flex items-start">
                <span className="mr-2 text-primary">•</span>
                詳細な分析のためにドキュメントをアップロード
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
