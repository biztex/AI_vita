import type { NewsCategory } from "../../../shared/news-categories"

export type User = {
  id: string
  email: string
  name: string
  role: "USER" | "ADMIN"
  subscription?: "VITAAI" | "EXECUWELL" | "INTEGRATED"
  createdAt: string
  updatedAt: string
}

export type AuthResponse = {
  token: string
  user: User
}

export type LoginRequest = {
  email: string
  password: string
}

export type RegisterRequest = {
  email: string
  password: string
  name: string
  company?: string
  industries?: NewsCategory[]
}

export type RegisterResponse = {
  success: boolean
  message: string
  user: {
    id: string
    email: string | null
    role: string
  }
}
