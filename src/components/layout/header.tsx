"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import Image from "next/image"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { User, Settings, LogOut } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { MobileMenu } from "./mobile-menu"
// import logo from "./img/logo.png"

export function Header() {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  const navItems = [
    { href: "/", label: "ホーム" },
    { href: "/dashboard", label: "ダッシュボード", protected: true },
    { href: "/vitaai/chat", label: "VitaAI", protected: true },
    { href: "/execuwell/chat", label: "ExecuWell", protected: true },
    { href: "/profile", label: "プロフィール", protected: true },
  ]

  // Add admin link if user is admin
  if (user?.role === "admin") {
    navItems.push({ href: "/admin", label: "管理者", protected: true })
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-gradient-to-r from-background/95 to-background/90 backdrop-blur-md supports-[backdrop-filter]:bg-background/80 shadow-lg shadow-primary/5">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2 group">
          <div className="relative">
            <Image 
              src="/img/logo.png" 
              alt="VitaAI / ExecuWell" 
              width={150} 
              height={70} 
              priority
              className="transition-all duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="hidden items-center space-x-6 md:flex">
          {navItems.map((item) => {
            // Hide protected routes if not logged in
            if (item.protected && !user) return null

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm font-medium transition-all duration-300 hover:text-primary hover:scale-105 relative group ${
                  pathname === item.href 
                    ? "text-primary font-semibold" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="relative z-10 px-3 py-2 rounded-lg transition-all duration-300 group-hover:bg-primary/10">
                  {item.label}
                </span>
                {pathname === item.href && (
                  <div className="absolute inset-0 bg-primary/10 rounded-lg border border-primary/20"></div>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Auth Section */}
        <div className="flex items-center space-x-4">
          {user ? (
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:bg-primary/10 transition-all duration-300 hover:scale-105 group">
                    <Avatar className="ring-2 ring-primary/20 hover:ring-primary/40 transition-all duration-300 group-hover:shadow-lg group-hover:shadow-primary/25">
                      <AvatarFallback className="bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold">
                        {user.name?.charAt(0).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-card/95 backdrop-blur-md border-border/50 shadow-xl">
                  <div className="flex items-center justify-start gap-2 p-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold text-xs">
                        {user.name?.charAt(0).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium text-foreground">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <DropdownMenuSeparator className="bg-border/50" />
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="flex items-center text-foreground hover:bg-primary/10 transition-colors cursor-pointer">
                      <User className="mr-2 h-4 w-4 text-primary" />
                      プロフィール
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-border/50" />
                  <DropdownMenuItem onClick={logout} className="text-destructive hover:bg-destructive/10 transition-colors cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    ログアウト
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <MobileMenu />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="hidden items-center space-x-2 sm:flex">
                <Button variant="ghost" asChild className="hover:bg-primary/10 transition-all duration-300 hover:scale-105">
                  <Link href="/auth/login">ログイン</Link>
                </Button>
                <Button asChild className="bg-gradient-to-r from-primary to-accent hover:from-accent hover:to-primary text-primary-foreground transition-all duration-300 hover:scale-105 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/40">
                  <Link href="/auth/register">無料登録</Link>
                </Button>
              </div>
              <MobileMenu />
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
