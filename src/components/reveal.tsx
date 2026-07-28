"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

type Variant = "fade-up" | "fade" | "fade-left" | "fade-right" | "zoom"

interface RevealProps {
  children: React.ReactNode
  variant?: Variant
  delay?: number
  duration?: number
  threshold?: number
  once?: boolean
  className?: string
  as?: keyof React.JSX.IntrinsicElements
}

const hiddenStyles: Record<Variant, string> = {
  "fade-up": "opacity-0 translate-y-8",
  fade: "opacity-0",
  "fade-left": "opacity-0 -translate-x-8",
  "fade-right": "opacity-0 translate-x-8",
  zoom: "opacity-0 scale-95",
}

const shownStyles = "opacity-100 translate-x-0 translate-y-0 scale-100"

export function Reveal({
  children,
  variant = "fade-up",
  delay = 0,
  duration = 700,
  threshold = 0.15,
  once = true,
  className,
  as: Tag = "div",
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setShown(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true)
            if (once) observer.disconnect()
          } else if (!once) {
            setShown(false)
          }
        }
      },
      { threshold, rootMargin: "0px 0px -60px 0px" },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold, once])

  const Component = Tag as React.ElementType
  return (
    <Component
      ref={ref}
      style={{
        transitionDuration: `${duration}ms`,
        transitionDelay: `${delay}ms`,
        willChange: "opacity, transform",
      }}
      className={cn(
        "transition-[opacity,transform] ease-out",
        shown ? shownStyles : hiddenStyles[variant],
        className,
      )}
    >
      {children}
    </Component>
  )
}
