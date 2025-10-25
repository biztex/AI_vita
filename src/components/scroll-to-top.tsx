"use client"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowUp, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

export function ScrollToTop() {
  const pathname = usePathname()
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Scroll to top when pathname changes
    window.scrollTo(0, 0)
  }, [pathname])

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 300) {
        setIsVisible(true)
      } else {
        setIsVisible(false)
      }
    }

    window.addEventListener("scroll", toggleVisibility)
    return () => window.removeEventListener("scroll", toggleVisibility)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    })
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Button
        onClick={scrollToTop}
        className={cn(
          "h-12 w-12 rounded-full bg-gradient-to-r from-primary to-accent hover:from-accent hover:to-primary text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/40 transition-all duration-300 hover:scale-110 group",
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
        )}
        size="icon"
      >
        <ArrowUp className="h-5 w-5 group-hover:-translate-y-0.5 transition-transform" />
        <Sparkles className="h-3 w-3 absolute -top-1 -right-1 text-accent animate-pulse" />
        <span className="sr-only">トップに戻る</span>
      </Button>
    </div>
  )
}
