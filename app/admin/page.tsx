import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, MessageSquare, Activity, TrendingUp } from "lucide-react"

export default function AdminOverviewPage() {
  const stats = [
    {
      title: "総ユーザー数",
      value: "1,234",
      change: "先月比 +12%",
      icon: Users,
    },
    {
      title: "アクティブな会話",
      value: "456",
      change: "先月比 +8%",
      icon: MessageSquare,
    },
    {
      title: "VitaAIセッション",
      value: "789",
      change: "先月比 +15%",
      icon: Activity,
    },
    {
      title: "ExecuWellセッション",
      value: "567",
      change: "先月比 +10%",
      icon: TrendingUp,
    },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">管理者概要</h1>
        <p className="text-muted-foreground">プラットフォームのアクティビティと主要指標を監視</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.change}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
