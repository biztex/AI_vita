"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Loader2, Search, MessagesSquare, Link2, Unlink } from "lucide-react"
import { apiClient } from "@/lib/api"

type LineUserRow = {
  id: string
  lineUserId: string
  displayName: string | null
  userMode: "EXECUWELL" | "VITAAI"
  morningPushEnabled: boolean
  linked: boolean
  appUserEmail: string | null
  appUserName: string | null
  subscription: string | null
  createdAt: string
}

export default function AdminLineUsersPage() {
  const [lineUsers, setLineUsers] = useState<LineUserRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    loadLineUsers()
  }, [])

  const loadLineUsers = async () => {
    try {
      setIsLoading(true)
      const resp = await apiClient.request<{ data: LineUserRow[] }>("/admin/line-users")
      setLineUsers(resp.data || [])
    } catch (error) {
      console.error("Failed to load LINE users:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const filtered = lineUsers.filter((lu) => {
    const q = search.toLowerCase()
    if (!q) return true
    return (
      lu.lineUserId.toLowerCase().includes(q) ||
      (lu.displayName || "").toLowerCase().includes(q) ||
      (lu.appUserEmail || "").toLowerCase().includes(q) ||
      (lu.appUserName || "").toLowerCase().includes(q)
    )
  })

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessagesSquare className="w-6 h-6" />
          LINEユーザー管理
        </h1>
        <p className="text-muted-foreground mt-1">
          LINE連携ユーザー一覧とモード設定の確認
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>合計</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{lineUsers.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>連携済み</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {lineUsers.filter((lu) => lu.linked).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>ExecuWellモード</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">
              {lineUsers.filter((lu) => lu.userMode === "EXECUWELL").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>VitaAIモード</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-purple-600">
              {lineUsers.filter((lu) => lu.userMode === "VITAAI").length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search & Table */}
      <Card>
        <CardHeader>
          <CardTitle>ユーザー一覧</CardTitle>
          <div className="mt-3 relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="検索..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">
              LINEユーザーが見つかりません
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>LINE ID</TableHead>
                    <TableHead>表示名</TableHead>
                    <TableHead>モード</TableHead>
                    <TableHead>連携</TableHead>
                    <TableHead>Webユーザー</TableHead>
                    <TableHead>朝の配信</TableHead>
                    <TableHead>登録日</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((lu) => (
                    <TableRow key={lu.id}>
                      <TableCell className="font-mono text-xs max-w-[120px] truncate">
                        {lu.lineUserId}
                      </TableCell>
                      <TableCell>{lu.displayName || "—"}</TableCell>
                      <TableCell>
                        <Badge
                          variant={lu.userMode === "EXECUWELL" ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {lu.userMode === "EXECUWELL" ? "ExecuWell" : "VitaAI"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {lu.linked ? (
                          <span className="flex items-center gap-1 text-green-600 text-xs">
                            <Link2 className="w-3.5 h-3.5" /> 連携済
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-muted-foreground text-xs">
                            <Unlink className="w-3.5 h-3.5" /> 未連携
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {lu.appUserName || lu.appUserEmail || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={lu.morningPushEnabled ? "outline" : "secondary"} className="text-xs">
                          {lu.morningPushEnabled ? "ON" : "OFF"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(lu.createdAt).toLocaleDateString("ja-JP")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
