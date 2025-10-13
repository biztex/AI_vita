// Centralized API client for all backend communication

export type ConversationSummary = {
  id: string
  service: "VITAAI" | "EXECUWELL"
  title: string | null
  createdAt: string
  lastMessage: {
    content: string
    sender: "USER" | "ASSISTANT"
    createdAt: string
  } | null
  messageCount: number
}

export type ConversationMessage = {
  id: string
  sender: "USER" | "ASSISTANT"
  content: string
  kind: "TEXT" | "VOICE" | "IMAGE"
  createdAt: string
  service: "VITAAI" | "EXECUWELL"
  conversationTitle: string | null
}

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
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"
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

  // Chat endpoints (mapped to backend /chat)
  chats = {
    send: (service: "VITAAI" | "EXECUWELL", content: string, conversationId?: string, title?: string) =>
      this.request<{ conversationId: string; message: string; service: string; timestamp: string }>("/chat", {
        method: "POST",
        body: { service, content, conversationId, title },
      }),

    getConversations: (service?: "VITAAI" | "EXECUWELL") =>
      this.request<{ conversations: ConversationSummary[]; timestamp: string }>("/chat/conversations", {
        query: service ? { service } : {},
      }),

    getConversation: (conversationId: string) =>
      this.request<{ conversationId: string; messages: ConversationMessage[]; timestamp: string }>(`/chat/conversation/${conversationId}`),

    updateConversationTitle: (conversationId: string, title: string) =>
      this.request<{ conversationId: string; title: string; timestamp: string }>(`/chat/conversation/${conversationId}`, {
        method: "PATCH",
        body: { title },
      }),

    deleteConversation: (conversationId: string) =>
      this.request<{ success: boolean; message: string; timestamp: string }>(`/chat/conversation/${conversationId}`, {
        method: "DELETE",
      }),

    // Convenience helpers to keep existing call sites working
    sendVitaAI: (message: string, conversationId?: string, title?: string) => this.chats.send("VITAAI", message, conversationId, title),
    sendExecuWell: (message: string, conversationId?: string, title?: string) => this.chats.send("EXECUWELL", message, conversationId, title),
  }

  // Personality upload mapped to backend /personality
  personality = {
    upload: (testType: "SIXTEEN_PERSONALITIES" | "STRENGTHSFINDER", fileKey: string) =>
      this.request<{ ok: true }>("/personality", {
        method: "POST",
        body: { testType, fileKey },
      }),
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
