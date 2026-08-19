"use client"

import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from "react"
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
  avatarPath?: string | null  // Add avatarPath
}

type AuthContextType = {
  user: User | null
  loading: boolean
  register: (data: { email: string; password: string; name: string; company?: string; industries?: NewsCategory[]; avatar?: File; position?: string; birthDate?: string }) => Promise<{ success: boolean; requiresEmailConfirmation: boolean; email: string }>
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser?: () => Promise<void>  // Add refreshUser
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const isRegisteringRef = useRef(false)

  // Convert Supabase user to our User type.
  // If the user has confirmed email but AppUser was never created (404), sync by calling register then retry.
  const convertSupabaseUser = async (supabaseUser: SupabaseUser, options?: { skipSyncOn404?: boolean }): Promise<User> => {
    const userMetadata = supabaseUser.user_metadata || {}
    
    const tryGetProfile = async (): Promise<User> => {
      const profileResponse = await apiClient.profile.get()
      const dbUser = profileResponse.user
      return {
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        name: dbUser?.name ?? userMetadata.name ?? userMetadata.full_name ?? supabaseUser.email?.split('@')[0] ?? 'ユーザー',
        role: (userMetadata.role as 'user' | 'admin') || 'user',
        company: userMetadata.company,
        subscription: userMetadata.subscription || 'integrated',
        avatarPath: dbUser?.avatarPath ?? null,
      }
    }

    try {
      const user = await tryGetProfile()
      console.log("[Auth] Successfully fetched user profile from backend")
      return user
    } catch (error: any) {
      const status = error?.response?.status
      const isUserNotFound = status === 404

      // After email confirmation, Supabase has a session but AppUser may not exist yet. Create it from JWT/metadata.
      if (isUserNotFound && !options?.skipSyncOn404) {
        console.log("[Auth] User not in database (e.g. after email confirm), syncing via register...")
        try {
          const formData = new FormData()
          const name = userMetadata.name ?? userMetadata.full_name ?? supabaseUser.email?.split('@')[0] ?? ''
          formData.append("name", name)
          formData.append("fullName", name)
          if (userMetadata.company) formData.append("company", String(userMetadata.company))
          if (userMetadata.position) formData.append("position", String(userMetadata.position))
          if (userMetadata.birthDate) formData.append("birthDate", String(userMetadata.birthDate))
          await apiClient.auth.register(formData)
          console.log("[Auth] Backend registration (sync) successful after email confirmation")
          const user = await tryGetProfile()
          return user
        } catch (syncError: any) {
          console.warn("[Auth] Sync after 404 failed:", syncError?.message)
        }
      }

      // Fallback if profile fetch fails for other reasons
      console.warn("[Auth] Failed to fetch user profile from backend, using fallback:", error?.message)
      return {
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        name: userMetadata.name ?? userMetadata.full_name ?? supabaseUser.email?.split('@')[0] ?? 'User',
        role: (userMetadata.role as 'user' | 'admin') || 'user',
        company: userMetadata.company,
        subscription: userMetadata.subscription || 'integrated',
        avatarPath: null,
      }
    }
  }

  // Add function to refresh user data
  const refreshUser = async () => {
    try {
      // Get session first to ensure auth token is set
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        apiClient.setAuthToken(session.access_token)
      }
      
      const { user: supabaseUser } = await getCurrentUser()
      if (supabaseUser) {
        const updatedUser = await convertSupabaseUser(supabaseUser)
        setUser(updatedUser)
      }
    } catch (error) {
      console.error("Failed to refresh user:", error)
    }
  }

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log("[Auth] Initializing auth state...")
        
        // Get session first to set auth token
        // (supabase.auth.getSession() reads persisted session from storage itself;
        // no artificial delay needed — the delay only lengthened the auth flicker.)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        console.log("[Auth] Session retrieved:", session ? "Yes" : "No", sessionError ? `Error: ${sessionError.message}` : "")
        
        if (session?.access_token) {
          // Set auth token before any API calls
          console.log("[Auth] Session found, setting auth token")
          apiClient.setAuthToken(session.access_token)
          
          // If we have a session, we should have a user
          if (session.user) {
            console.log("[Auth] User found in session, converting...")
            const convertedUser = await convertSupabaseUser(session.user)
            setUser(convertedUser)
            console.log("[Auth] User state set successfully from session")
          } else {
            console.warn("[Auth] Session exists but no user found")
            setUser(null)
            apiClient.setAuthToken(null)
          }
        } else {
          console.log("[Auth] No session found, checking for user via API...")
          
          // Fallback: try to get user directly (this makes an API call)
          const { user: supabaseUser, error } = await getCurrentUser()
          
          if (error) {
            console.error('[Auth] Error getting current user:', error)
            setUser(null)
            apiClient.setAuthToken(null)
          } else if (supabaseUser) {
            console.log("[Auth] User found via API, getting session again...")
            // If we found a user, we should have a session - get it again
            const { data: { session: newSession } } = await supabase.auth.getSession()
            if (newSession?.access_token) {
              apiClient.setAuthToken(newSession.access_token)
            }
            const convertedUser = await convertSupabaseUser(supabaseUser)
            setUser(convertedUser)
            console.log("[Auth] User state set successfully from API")
          } else {
            console.log("[Auth] No user found")
            setUser(null)
            apiClient.setAuthToken(null)
          }
        }
      } catch (error) {
        console.error('[Auth] Auth initialization error:', error)
        setUser(null)
        apiClient.setAuthToken(null)
      } finally {
        setLoading(false)
        console.log("[Auth] Auth initialization complete, loading set to false")
      }
    }

    initializeAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("[Auth] Auth state change event:", event, "session exists:", !!session, "isRegistering:", isRegisteringRef.current)
        
        if (event === 'INITIAL_SESSION') {
          // Initial session is already handled by initializeAuth
          console.log("[Auth] INITIAL_SESSION - already handled by initializeAuth")
        } else if (event === 'SIGNED_IN' && session?.user && !isRegisteringRef.current) {
          // User signed in (not during registration)
          console.log("[Auth] SIGNED_IN - updating user state")
          apiClient.setAuthToken(session.access_token)
          const convertedUser = await convertSupabaseUser(session.user)
          setUser(convertedUser)
        } else if (event === 'SIGNED_OUT') {
          console.log("[Auth] SIGNED_OUT - clearing user state")
          setUser(null)
          apiClient.setAuthToken(null)
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          console.log("[Auth] TOKEN_REFRESHED - updating token and user")
          apiClient.setAuthToken(session.access_token)
          const convertedUser = await convertSupabaseUser(session.user)
          setUser(convertedUser)
        } else if (event === 'USER_UPDATED' && session?.user) {
          console.log("[Auth] USER_UPDATED - refreshing user data")
          const convertedUser = await convertSupabaseUser(session.user)
          setUser(convertedUser)
        }
        
        // Only set loading to false if it's not already false
        if (event !== 'INITIAL_SESSION') {
          setLoading(false)
        }
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
        const convertedUser = await convertSupabaseUser(data.user)
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

  const register = async (data: { 
    email: string; 
    password: string; 
    name: string; 
    company?: string; 
    industries?: NewsCategory[];
    avatar?: File;
    position?: string;
    birthDate?: string;
  }) => {
    try {
      // Set flag to prevent auth state change handler from interfering
      isRegisteringRef.current = true
      
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
        let session = authData.session
        if (!session) {
          const { data: { session: currentSession } } = await supabase.auth.getSession()
          session = currentSession
        }
        
        if (session?.access_token) {
          apiClient.setAuthToken(session.access_token)
          
          try {
            // Prepare FormData for backend registration
            const formData = new FormData()
            formData.append("name", data.name) // Send name to AppUser
            formData.append("fullName", data.name) // Also send as fullName for PersonalProfile
            if (data.company) formData.append("company", data.company)
            if (data.position) formData.append("position", data.position)
            if (data.birthDate) formData.append("birthDate", data.birthDate)
            if (data.avatar) formData.append("avatar", data.avatar)
            if (data.industries && data.industries.length > 0) {
              // Industries are sent via Supabase metadata, not FormData
            }

            // Call backend register API with FormData
            console.log("[Auth] Calling backend registration...")
            await apiClient.auth.register(formData)
            console.log("[Auth] Backend registration successful")
            
            // Now that backend registration is complete, convert user
            // This will fetch the user from the database successfully
            const convertedUser = await convertSupabaseUser(authData.user)
            setUser(convertedUser)
            console.log("[Auth] User state set after registration")
            
            toast.success("アカウントが正常に作成されました", {
              position: "top-right",
              autoClose: 3000,
            })
            
            return { 
              success: true, 
              requiresEmailConfirmation: false,
              email: data.email
            }
          } catch (backendError: any) {
            console.error("[Auth] Backend registration failed:", backendError)
            // Extract error message from response
            const errorMessage = backendError.message || 
                                backendError.response?.data?.error || 
                                backendError.response?.data?.message ||
                                "アカウント登録処理に失敗しました。もう一度お試しください。"
            toast.error(errorMessage, {
              position: "top-right",
              autoClose: 5000,
            })
            throw new Error(errorMessage)
          } finally {
            // Clear registration flag
            isRegisteringRef.current = false
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
    } finally {
      // Ensure registration flag is cleared even if error occurs
      isRegisteringRef.current = false
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

  return <AuthContext.Provider value={{ user, loading, register, login, logout, refreshUser }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
