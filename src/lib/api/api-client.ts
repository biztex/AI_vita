// Centralized API client for all backend communication
import type { 
  ConversationSummary, 
  ConversationMessage, 
  ChatResponse, 
  VoiceUploadResponse, 
  VoiceProcessResponse 
} from '@/types/api/chat'
import type { User, AuthResponse, LoginRequest, RegisterRequest } from '@/types/api/auth'
import { API_CONFIG } from '@/lib/config/api'

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
    this.baseURL = API_CONFIG.BASE_URL
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
    login: (data: LoginRequest) =>
      this.request<AuthResponse>("/auth/login", {
        method: "POST",
        body: data,
      }),

    register: (data: RegisterRequest) =>
      this.request<AuthResponse>("/auth/register", {
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
    getMe: () => this.request<User>("/users/me"),

    updateMe: (data: Partial<User>) =>
      this.request<User>("/users/me", {
        method: "PATCH",
        body: data,
      }),

    list: (query?: Record<string, string>) => this.request<{ users: User[]; total: number }>("/users", { query }),

    updateById: (id: string, data: Partial<User>) =>
      this.request<User>(`/users/${id}`, {
        method: "PATCH",
        body: data,
      }),
  }

  // Chat endpoints (mapped to backend /chat)
  chats = {
    send: (service: "VITAAI" | "EXECUWELL", content: string, conversationId?: string, title?: string) =>
      this.request<ChatResponse>("/chat", {
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

    // Voice send (multipart)
    sendVoice: async (
      service: "VITAAI" | "EXECUWELL",
      audioFile: File,
      conversationId?: string,
      title?: string
    ) => {
      const url = `${this.baseURL}/chat/voice`;
      const formData = new FormData();
      formData.append("service", service);
      if (conversationId) formData.append("conversationId", conversationId);
      if (title) formData.append("title", title);
      formData.append("audio", audioFile);

      const headers: Record<string, string> = {};
      if (this.authToken) headers["Authorization"] = `Bearer ${this.authToken}`;
      // NOTE: Do not set Content-Type for FormData; browser will set boundary

      const resp = await fetch(url, {
        method: "POST",
        headers,
        body: formData,
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data?.error || data?.message || `HTTP ${resp.status}`);
      }
      return data as VoiceProcessResponse & { audioPath: string };
    },

    // Step 1: upload audio only
    uploadVoice: async (
      service: "VITAAI" | "EXECUWELL",
      audioFile: File,
      conversationId?: string,
      title?: string
    ) => {
      const url = `${this.baseURL}/chat/voice/upload`;
      const formData = new FormData();
      formData.append("service", service);
      if (conversationId) formData.append("conversationId", conversationId);
      if (title) formData.append("title", title);
      formData.append("audio", audioFile);

      const headers: Record<string, string> = {};
      if (this.authToken) headers["Authorization"] = `Bearer ${this.authToken}`;

      const resp = await fetch(url, { method: "POST", headers, body: formData });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || data?.message || `HTTP ${resp.status}`);
      return data as VoiceUploadResponse;
    },

    // Step 2: process audio at path (transcribe + AI)
    processVoice: async (
      service: "VITAAI" | "EXECUWELL",
      conversationId: string,
      audioPath: string
    ) => {
      return this.request<VoiceProcessResponse>("/chat/voice/process", {
        method: "POST",
        body: { service, conversationId, audioPath },
      });
    },
  }

  // Personality endpoints mapped to backend /personality
  personality = {
    getResults: () =>
      this.request<{ results: Array<{
        id: string
        testType: string
        result: string | null
        fileKey: string | null
        status: string
        createdAt: string
      }> }>("/personality"),

    upload: (testType: "SIXTEEN_PERSONALITIES" | "STRENGTHSFINDER" | "ENNEAGRAM" | "DISC" | "CLIFTONSTRENGTHS", result: string, fileKey?: string) =>
      this.request<{ ok: true }>("/personality", {
        method: "POST",
        body: { testType, result, fileKey },
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

  // News endpoints
  news = {
    getNews: (date?: string) =>
      this.request<{
        date: string
        count: number
        items: Array<{
          category: string
          title: string
          description: string
          link: string
          pubDate?: string
          source: string
          newsDate: string
        }>
      }>("/news", {
        query: date ? { date } : {},
      }),
  }
}

// Export singleton instance
export const apiClient = new APIClient()
