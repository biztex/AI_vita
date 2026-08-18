import { createClient } from '@supabase/supabase-js'
import type { NewsCategory } from '../../shared/news-categories'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  }
})

// Auth helpers
export const signUp = async (email: string, password: string, userData?: { name?: string; company?: string; industries?: NewsCategory[] }) => {
  // NOTE: never log credentials here. Admin is granted server-side via the
  // ADMIN_EMAILS allowlist (backend/src/middlewares/auth.ts) — role must NOT
  // be written into user_metadata (it is client-writable and was an
  // admin-privilege-escalation vector).
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        ...userData,
        subscription: 'integrated'
      },
      // After the user clicks the verification link, land them on OUR
      // Japanese login page with a success banner — not a bare/English page.
      emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/login?verified=1` : undefined,
    }
  })

  return { data, error }
}

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  return { data, error }
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser()
  return { user, error }
}

export const resetPassword = async (email: string) => {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  })
  return { data, error }
}
