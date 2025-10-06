"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { supabase, signIn, signUp, signOut, getCurrentUser, resetPassword } from "./supabase"
import { apiClient } from "./api-client"
import type { User as SupabaseUser } from '@supabase/supabase-js'

type User = {
  id: string
  email: string
  name: string
  role: "user" | "admin"
  company?: string
  subscription?: "vitaai" | "execuwell" | "integrated"
}

type AuthContextType = {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: { email: string; password: string; name: string; company?: string }) => Promise<void>
  logout: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Convert Supabase user to our User type
  const convertSupabaseUser = (supabaseUser: SupabaseUser): User => {
    const userMetadata = supabaseUser.user_metadata || {}
    return {
      id: supabaseUser.id,
      email: supabaseUser.email || '',
      name: userMetadata.name || userMetadata.full_name || supabaseUser.email?.split('@')[0] || 'User',
      role: userMetadata.role || 'user',
      company: userMetadata.company,
      subscription: userMetadata.subscription || 'integrated',
    }
  }

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { user: supabaseUser, error } = await getCurrentUser()
        
        if (error) {
          console.error('Error getting current user:', error)
          setUser(null)
        } else if (supabaseUser) {
          setUser(convertSupabaseUser(supabaseUser))
          // Get session for access token
          const { data: { session } } = await supabase.auth.getSession()
          apiClient.setAuthToken(session?.access_token || null)
        } else {
          setUser(null)
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    initializeAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const convertedUser = convertSupabaseUser(session.user)
          setUser(convertedUser)
          apiClient.setAuthToken(session.access_token)
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          apiClient.setAuthToken(null)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const login = async (email: string, password: string) => {
    try {
      const { data, error } = await signIn(email, password)
      
      if (error) {
        throw new Error(error.message)
      }

      if (data.user) {
        const convertedUser = convertSupabaseUser(data.user)
        setUser(convertedUser)
        apiClient.setAuthToken(data.session?.access_token || null)
      }
    } catch (error) {
      console.error("Login failed:", error)
      throw error
    }
  }

  const register = async (data: { email: string; password: string; name: string; company?: string }) => {
    try {
      const { data: authData, error } = await signUp(data.email, data.password, {
        name: data.name,
        company: data.company,
      })
      
      if (error) {
        throw new Error(error.message)
      }

      // Don't set user immediately - they need to verify email first
      // The user will be set automatically when they verify their email
      // and the auth state change listener picks it up
    } catch (error) {
      console.error("Registration failed:", error)
      throw error
    }
  }

  const logout = async () => {
    try {
      const { error } = await signOut()
      if (error) {
        throw new Error(error.message)
      }
      
      setUser(null)
      apiClient.setAuthToken(null)
    } catch (error) {
      console.error("Logout failed:", error)
      throw error
    }
  }

  const handleResetPassword = async (email: string) => {
    try {
      const { data, error } = await resetPassword(email)
      if (error) {
        throw new Error(error.message)
      }
    } catch (error) {
      console.error("Password reset failed:", error)
      throw error
    }
  }

  return <AuthContext.Provider value={{ user, loading, login, register, logout, resetPassword: handleResetPassword }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
