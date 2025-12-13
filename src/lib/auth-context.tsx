"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { supabase, signIn, signUp, signOut, getCurrentUser, resetPassword } from "./supabase"
import { apiClient } from "./api"
import type { User as SupabaseUser } from '@supabase/supabase-js'
import type { NewsCategory } from "../../shared/news-categories"
import { translateSupabaseAuthError } from "./supabase-error-translator"
import { toast } from "react-toastify"

export type User = {
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
  register: (data: { email: string; password: string; name: string; company?: string; industries?: NewsCategory[] }) => Promise<{ success: boolean; requiresEmailConfirmation: boolean; email?: string }>
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
        const errorMessage = translateSupabaseAuthError(error.message || error)
        toast.error(errorMessage, {
          position: "top-right",
          autoClose: 5000,
        })
        throw new Error(errorMessage)
      }

      if (data.user) {
        const convertedUser = convertSupabaseUser(data.user)
        setUser(convertedUser)
        apiClient.setAuthToken(data.session?.access_token || null)
        toast.success("ログインに成功しました", {
          position: "top-right",
          autoClose: 3000,
        })
      }
    } catch (error) {
      console.error("Login failed:", error)
      throw error
    }
  }

  const register = async (data: { email: string; password: string; name: string; company?: string; industries?: NewsCategory[] }) => {
    try {
      // Step 1: Register with Supabase
      const { data: authData, error } = await signUp(data.email, data.password, {
        name: data.name,
        company: data.company,
        industries: data.industries || [],
      })
      
      if (error) {
        console.log("error",error.message);
        const errorMessage = translateSupabaseAuthError(error.message || error)
        toast.error(errorMessage, {
          position: "top-right",
          autoClose: 5000,
        })
        throw new Error(errorMessage)
      }

      // Step 2: If Supabase registration succeeds, register with backend
      if (authData.user) {
        // Check if session is available from signUp response or get it
        let session = authData.session
        if (!session) {
          // Try to get session if not in response
          const { data: { session: currentSession } } = await supabase.auth.getSession()
          session = currentSession
        }
        
        if (session?.access_token) {
          // Session created - user is automatically registered and logged in
          // Set auth token to call backend
          apiClient.setAuthToken(session.access_token)
          
          try {
            // Call backend register API to create user in database
            await apiClient.auth.register({
              email: data.email,
              password: data.password, // Backend doesn't need this, but type requires it
              name: data.name,
              company: data.company,
              industries: data.industries || [],
            })
            console.log("Backend registration successful")
            
            // User is now logged in (session exists)
            const convertedUser = convertSupabaseUser(authData.user)
            setUser(convertedUser)
            
            toast.success("アカウントが正常に作成されました", {
              position: "top-right",
              autoClose: 3000,
            })
            
            // Return success with session created (auto-registered)
            return { 
              success: true, 
              requiresEmailConfirmation: false,
              email: data.email
            }
          } catch (backendError: any) {
            console.error("Backend registration failed:", backendError)
            // Extract error message from response
            const errorMessage = backendError.message || 
                                backendError.response?.data?.error || 
                                backendError.response?.data?.message ||
                                "Backend registration failed. Please try again."
            toast.error(errorMessage, {
              position: "top-right",
              autoClose: 5000,
            })
            throw new Error(errorMessage)
          }
        } else {
          // No session available yet (email confirmation required)
          // Note: This should be rare if Supabase is configured to auto-confirm users
          // If this happens, backend registration will happen when user verifies email and signs in
          console.warn("No session available after signup - backend registration will happen on first login")
          toast.info("確認メールを送信しました。メール内のリンクをクリックしてアカウントを有効化してください。", {
            position: "top-right",
            autoClose: 6000,
          })
          
          // Return success but requires email confirmation
          return { 
            success: true, 
            requiresEmailConfirmation: true,
            email: data.email
          }
        }
      }

      // Note: User will be set automatically when they verify their email
      // and the auth state change listener picks it up
      return { success: false, requiresEmailConfirmation: false }
    } catch (error) {
      console.error("Registration failed:", error)
      throw error
    }
  }

  const logout = async () => {
    try {
      const { error } = await signOut()
      if (error) {
        const errorMessage = translateSupabaseAuthError(error.message || error)
        toast.error(errorMessage, {
          position: "top-right",
          autoClose: 5000,
        })
        throw new Error(errorMessage)
      }
      
      setUser(null)
      apiClient.setAuthToken(null)
      toast.success("ログアウトしました", {
        position: "top-right",
        autoClose: 3000,
      })
    } catch (error) {
      console.error("Logout failed:", error)
      throw error
    }
  }

  const handleResetPassword = async (email: string) => {
    try {
      const { data, error } = await resetPassword(email)
      if (error) {
        const errorMessage = translateSupabaseAuthError(error.message || error)
        toast.error(errorMessage, {
          position: "top-right",
          autoClose: 5000,
        })
        throw new Error(errorMessage)
      }
      toast.success("パスワードリセットメールを送信しました", {
        position: "top-right",
        autoClose: 5000,
      })
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
