"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Menu, X } from "lucide-react"
import { useAuth } from "@/lib/auth-context"

export function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const { user } = useAuth()

  // Close menu when route changes
  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }
    return () => {
      document.body.style.overflow = "unset"
    }
  }, [isOpen])

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
    <>
      {/* Hamburger Button */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="メニューを開く"
      >
        {isOpen ? <X className="h-6 w-6 z-50" /> : <Menu className="h-6 w-6" />}
      </Button>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Mobile Menu Panel */}
      <div
        className={`fixed right-0 top-16 z-50 h-[calc(100vh-4rem)] w-full transform border-l border-border bg-background transition-transform duration-300 ease-in-out md:hidden ${
          isOpen ? "translate-x-0 block" : "translate-x-full hidden"
        }`}
      >
        <nav className="flex flex-col space-y-1 p-4">
          {navItems.map((item) => {
            // Hide protected routes if not logged in
            if (item.protected && !user) return null

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-4 py-3 text-base font-medium transition-colors hover:bg-accent hover:text-accent-foreground ${
                  pathname === item.href ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                }`}
              >
                {item.label}
              </Link>
            )
          })}

          {!user && (
            <div className="mt-4 flex flex-col space-y-2 border-t border-border pt-4">
              <Button variant="outline" asChild className="w-full bg-transparent">
                <Link href="/auth/login">ログイン</Link>
              </Button>
              <Button asChild className="w-full">
                <Link href="/auth/register">無料登録</Link>
              </Button>
            </div>
          )}
        </nav>
      </div>
    </>
  )
}
