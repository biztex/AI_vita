"use client"

import type React from "react"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Loader2 } from "lucide-react"

type ProtectedRouteProps = {
  children: React.ReactNode
  requireAdmin?: boolean
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Only redirect if auth has finished loading AND user is not authenticated
    if (!loading && !user) {
      console.log("[ProtectedRoute] No user found, redirecting to login")
      router.push("/auth/login")
    } else if (!loading && user && requireAdmin && user.role !== "admin") {
      console.log("[ProtectedRoute] User is not admin, redirecting to dashboard")
      router.push("/dashboard")
    } else if (!loading && user) {
      console.log("[ProtectedRoute] User authenticated:", user.email)
    }
  }, [user, loading, requireAdmin, router])

  // Show loading state while auth is initializing
  if (loading) {
    console.log("[ProtectedRoute] Auth loading...")
    return (
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Don't render anything if user is not authenticated (will be redirected by useEffect)
  if (!user) {
    console.log("[ProtectedRoute] No user, showing nothing (redirect in progress)")
    return (
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Don't render if admin is required but user is not admin
  if (requireAdmin && user.role !== "admin") {
    console.log("[ProtectedRoute] Admin required but user is not admin (redirect in progress)")
    return null
  }

  // Render children if all checks pass
  return <>{children}</>
}
