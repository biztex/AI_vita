"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Users, MessageSquare, FileText, LayoutDashboard } from "lucide-react"

const sidebarItems = [
  {
    title: "概要",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    title: "ユーザー",
    href: "/admin/users",
    icon: Users,
  },
  {
    title: "会話",
    href: "/admin/chats",
    icon: MessageSquare,
  },
  {
    title: "レポート",
    href: "/admin/reports",
    icon: FileText,
  },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 border-r border-border bg-muted/30">
      <div className="flex h-full flex-col">
        <div className="border-b border-border p-6">
          <h2 className="text-lg font-semibold">管理パネル</h2>
          <p className="text-sm text-muted-foreground">プラットフォームを管理</p>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          {sidebarItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{item.title}</span>
              </Link>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}
