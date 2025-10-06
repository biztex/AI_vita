// Centralized API client for all backend communication

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
  body?: any
  query?: Record<string, string>
  headers?: Record<string, string>
}

class APIClient {
  private baseURL: string
  private authToken: string | null = null

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
  }

  setAuthToken(token: string | null) {
    this.authToken = token
  }

  private async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { method = "GET", body, query, headers = {} } = options

    // Build URL with query params
    let url = `${this.baseURL}${path}`
    if (query) {
      const params = new URLSearchParams(query)
      url += `?${params.toString()}`
    }

    // Build headers
    const requestHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      ...headers,
    }

    if (this.authToken) {
      requestHeaders["Authorization"] = `Bearer ${this.authToken}`
    }

    // Make request
    try {
      const response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
      })

      // Handle non-JSON responses
      const contentType = response.headers.get("content-type")
      if (!contentType?.includes("application/json")) {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        return {} as T
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`)
      }

      return data
    } catch (error) {
      console.error("[API Client Error]", error)
      throw error
    }
  }

  // Auth endpoints
  auth = {
    login: (email: string, password: string) =>
      this.request<{ token: string; user: any }>("/auth/login", {
        method: "POST",
        body: { email, password },
      }),

    register: (data: { email: string; password: string; name: string; company?: string }) =>
      this.request<{ token: string; user: any }>("/auth/register", {
        method: "POST",
        body: data,
      }),

    logout: () =>
      this.request("/auth/logout", {
        method: "POST",
      }),

    refresh: () =>
      this.request<{ token: string }>("/auth/refresh", {
        method: "POST",
      }),
  }

  // User endpoints
  users = {
    getMe: () => this.request<any>("/users/me"),

    updateMe: (data: any) =>
      this.request<any>("/users/me", {
        method: "PATCH",
        body: data,
      }),

    list: (query?: Record<string, string>) => this.request<{ users: any[]; total: number }>("/users", { query }),

    updateById: (id: string, data: any) =>
      this.request<any>(`/users/${id}`, {
        method: "PATCH",
        body: data,
      }),
  }

  // Chat endpoints
  chats = {
    sendVitaAI: (message: string, attachments?: any[]) =>
      this.request<{ response: string; conversationId: string }>("/chats/vitaai", {
        method: "POST",
        body: { message, attachments },
      }),

    sendExecuWell: (message: string, attachments?: any[]) =>
      this.request<{ response: string; conversationId: string }>("/chats/execuwell", {
        method: "POST",
        body: { message, attachments },
      }),

    search: (query?: Record<string, string>) =>
      this.request<{ conversations: any[]; total: number }>("/chats/search", { query }),

    getConversation: (id: string) => this.request<any>(`/chats/${id}`),
  }

  // Diagnosis endpoints
  diagnosis = {
    uploadGenetic: (file: File) => {
      // Note: This would need FormData handling in a real implementation
      return this.request<{ success: boolean }>("/diagnosis/genetic", {
        method: "POST",
        body: { file },
      })
    },

    uploadPersonality: (file: File) => {
      return this.request<{ success: boolean }>("/diagnosis/personality", {
        method: "POST",
        body: { file },
      })
    },

    status: () =>
      this.request<{
        genetic: { uploaded: boolean; date?: string }
        personality: { uploaded: boolean; date?: string }
      }>("/diagnosis/status"),
  }

  // Reports endpoints
  reports = {
    getDaily: () => this.request<any>("/reports/daily"),

    toggleDaily: (enabled: boolean) =>
      this.request<{ success: boolean }>("/reports/daily/toggle", {
        method: "POST",
        body: { enabled },
      }),

    toggleNews: (enabled: boolean) =>
      this.request<{ success: boolean }>("/reports/news/toggle", {
        method: "POST",
        body: { enabled },
      }),
  }
}

// Export singleton instance
export const apiClient = new APIClient()
