"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Search, MoreVertical } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

type User = {
  id: string
  name: string
  email: string
  role: "user" | "admin"
  subscription: "vitaai" | "execuwell" | "integrated"
  status: "active" | "inactive"
}

const mockUsers: User[] = [
  {
    id: "1",
    name: "John Doe",
    email: "john@example.com",
    role: "user",
    subscription: "integrated",
    status: "active",
  },
  {
    id: "2",
    name: "Jane Smith",
    email: "jane@example.com",
    role: "user",
    subscription: "vitaai",
    status: "active",
  },
  {
    id: "3",
    name: "Bob Johnson",
    email: "bob@example.com",
    role: "admin",
    subscription: "integrated",
    status: "active",
  },
  {
    id: "4",
    name: "Alice Williams",
    email: "alice@example.com",
    role: "user",
    subscription: "execuwell",
    status: "inactive",
  },
]

export default function AdminUsersPage() {
  const [users] = useState<User[]>(mockUsers)
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [subscriptionFilter, setSubscriptionFilter] = useState<string>("all")

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRole = roleFilter === "all" || user.role === roleFilter
    const matchesSubscription = subscriptionFilter === "all" || user.subscription === subscriptionFilter

    return matchesSearch && matchesRole && matchesSubscription
  })

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">ユーザー管理</h1>
        <p className="text-muted-foreground">すべてのプラットフォームユーザーを表示・管理</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>ユーザー</CardTitle>
          <div className="mt-4 flex flex-col gap-4 md:flex-row">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="ユーザーを検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Role Filter */}
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="役割でフィルター" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべての役割</SelectItem>
                <SelectItem value="user">ユーザー</SelectItem>
                <SelectItem value="admin">管理者</SelectItem>
              </SelectContent>
            </Select>

            {/* Subscription Filter */}
            <Select value={subscriptionFilter} onValueChange={setSubscriptionFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="サブスクリプションでフィルター" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべてのサブスクリプション</SelectItem>
                <SelectItem value="vitaai">VitaAI</SelectItem>
                <SelectItem value="execuwell">ExecuWell</SelectItem>
                <SelectItem value="integrated">統合</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {/* Desktop Table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名前</TableHead>
                  <TableHead>メールアドレス</TableHead>
                  <TableHead>役割</TableHead>
                  <TableHead>サブスクリプション</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead className="text-right">アクション</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === "admin" ? "default" : "secondary"} className="capitalize">
                        {user.role === "admin" ? "管理者" : "ユーザー"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {user.subscription === "integrated" ? "統合" : user.subscription}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={user.status === "active" ? "default" : "secondary"}
                        className={user.status === "active" ? "bg-green-500/10 text-green-500" : ""}
                      >
                        {user.status === "active" ? "アクティブ" : "非アクティブ"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                            <span className="sr-only">アクション</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>詳細を表示</DropdownMenuItem>
                          <DropdownMenuItem>ユーザーを編集</DropdownMenuItem>
                          <DropdownMenuItem>役割を変更</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            {user.status === "active" ? "無効化" : "有効化"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="space-y-4 md:hidden">
            {filteredUsers.map((user) => (
              <Card key={user.id}>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>詳細を表示</DropdownMenuItem>
                          <DropdownMenuItem>ユーザーを編集</DropdownMenuItem>
                          <DropdownMenuItem>役割を変更</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            {user.status === "active" ? "無効化" : "有効化"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={user.role === "admin" ? "default" : "secondary"} className="capitalize">
                        {user.role === "admin" ? "管理者" : "ユーザー"}
                      </Badge>
                      <Badge variant="outline" className="capitalize">
                        {user.subscription === "integrated" ? "統合" : user.subscription}
                      </Badge>
                      <Badge
                        variant={user.status === "active" ? "default" : "secondary"}
                        className={user.status === "active" ? "bg-green-500/10 text-green-500" : ""}
                      >
                        {user.status === "active" ? "アクティブ" : "非アクティブ"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredUsers.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">ユーザーが見つかりません。フィルターを調整してください。</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
