"use client"

import { useEffect, useMemo, useState } from "react"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"
import { Sun, Moon } from "lucide-react"

type ThemeMode = "light" | "dark"

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const activeMode: ThemeMode = useMemo(() => {
    if (!mounted) return "light"
    const current = (theme === "system" ? resolvedTheme : theme) as ThemeMode | undefined
    return current === "dark" ? "dark" : "light"
  }, [mounted, theme, resolvedTheme])

  const isDark = activeMode === "dark"

  const handleToggle = () => {
    setTheme(isDark ? "light" : "dark")
  }

  return (
    <button
      type="button"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={handleToggle}
      className={cn(
        "relative inline-flex h-10 w-20 items-center rounded-full",
        "bg-gradient-to-br from-muted/80 to-card/80 dark:from-muted/40 dark:to-card/40",
        "shadow-sm ring-1 ring-inset ring-border/60",
        "transition-[background,box-shadow] duration-300 ease-out",
        "hover:shadow-md",
        className
      )}
    >
      {/* Icons container */}
      <div className="pointer-events-none absolute inset-0 grid grid-cols-2 items-center px-2">
        <div className="flex items-center justify-start">
          <Sun
            className={cn(
              "h-5 w-5 transition-colors",
              isDark ? "text-muted-foreground/50" : "text-foreground"
            )}
          />
        </div>
        <div className="flex items-center justify-end">
          <Moon
            className={cn(
              "h-5 w-5 transition-colors",
              isDark ? "text-foreground" : "text-muted-foreground/50"
            )}
          />
        </div>
      </div>

      {/* Knob */}
      <div
        className={cn(
          "absolute top-1 left-1 h-8 w-8 rounded-full",
          "bg-gradient-to-br from-background to-card",
          "shadow-[0_2px_8px_rgba(0,0,0,0.15)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.35)]",
          "transition-transform duration-300 ease-out",
          isDark ? "translate-x-10" : "translate-x-0"
        )}
      />
    </button>
  )
}


