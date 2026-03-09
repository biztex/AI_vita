// Centralized API client for all backend communication
import type { 
  ConversationSummary, 
  ConversationMessage, 
  ChatResponse, 
  VoiceUploadResponse, 
  VoiceProcessResponse 
} from '@/types/api/chat'
import type { User, AuthResponse, LoginRequest, RegisterRequest, RegisterResponse } from '@/types/api/auth'
import { API_CONFIG } from '@/lib/config/api'
import type { NewsCategory } from '../../../shared/news-categories'

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
  body?: any
  query?: Record<string, string>
  headers?: Record<string, string>
  isFormData?: boolean
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

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { method = "GET", body, query, headers = {}, isFormData = false } = options

    // Ensure we have a valid auth token
    if (!this.authToken) {
      console.log("[API Client] No auth token, checking Supabase session...")
      const { supabase } = await import("@/lib/supabase")
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        console.log("[API Client] Session found, setting auth token")
        this.authToken = session.access_token
      } else {
        console.warn("[API Client] No session found in Supabase")
      }
    }

    // Build URL with query params
    let url = `${this.baseURL}${path}`
    if (query) {
      const params = new URLSearchParams(query)
      url += `?${params.toString()}`
    }

    // Prepare headers
    const requestHeaders: HeadersInit = {
      ...headers,
    }

    // Only add Authorization and Content-Type if not FormData
    if (!isFormData) {
      if (this.authToken) {
        requestHeaders["Authorization"] = `Bearer ${this.authToken}`
      }
      if (body && typeof body === "object" && !(body instanceof FormData)) {
        requestHeaders["Content-Type"] = "application/json"
      }
    } else {
      // For FormData, only add Authorization (browser will set Content-Type with boundary)
      if (this.authToken) {
        requestHeaders["Authorization"] = `Bearer ${this.authToken}`
      }
    }

    // Make request
    try {
      const response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: body instanceof FormData ? body : (body ? JSON.stringify(body) : undefined),
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
        // Handle 401/403 - authentication errors
        if (response.status === 401 || response.status === 403) {
          console.error("[API Client] Authentication error, attempting to refresh session...")
          this.authToken = null
          
          // Try to get a fresh session
          const { supabase } = await import("@/lib/supabase")
          const { data: { session } } = await supabase.auth.getSession()
          
          if (session?.access_token && session.access_token !== this.authToken) {
            console.log("[API Client] Got fresh session, retrying request...")
            this.authToken = session.access_token
            
            // Retry the request once with the new token
            requestHeaders["Authorization"] = `Bearer ${this.authToken}`
            const retryResponse = await fetch(url, {
              method,
              headers: requestHeaders,
              body: body instanceof FormData ? body : (body ? JSON.stringify(body) : undefined),
            })
            
            if (retryResponse.ok) {
              const retryContentType = retryResponse.headers.get("content-type")
              if (retryContentType?.includes("application/json")) {
                return await retryResponse.json()
              }
              return {} as T
            }
          }
        }
        
        // Backend may return error in different formats
        const errorMessage = data.message || data.error || `HTTP ${response.status}: ${response.statusText}`
        const error = new Error(errorMessage) as any
        error.response = { data, status: response.status }
        throw error
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

    register: (data: RegisterRequest | FormData) =>
      this.request<RegisterResponse>("/auth/register", {
        method: "POST",
        body: data,
        isFormData: data instanceof FormData,
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

    getMyAIWelcome: () =>
      this.request<{ greeting: string; name: string }>("/chat/myai-welcome"),

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
          category: NewsCategory
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

  // Profile endpoints
  profile = {
    get: () =>
      this.request<{
        success: boolean
        profile: {
          id: string
          ownerId: string
          fullName: string | null
          company: string | null
          position: string | null
          birthDate: string | null
          execuWell: any
          vitaAI: any
          createdAt: string
          updatedAt: string
        }
        user?: {
          avatarPath: string | null
          email: string | null
          name: string | null
          industries: string[]
        }
      }>("/profile"),

    update: (data: {
      fullName?: string
      company?: string
      position?: string
      industries?: string[]
      avatar?: File
    }) => {
      const formData = new FormData()
      if (data.fullName !== undefined) formData.append("fullName", data.fullName)
      if (data.company !== undefined) formData.append("company", data.company)
      if (data.position !== undefined) formData.append("position", data.position)
      if (data.industries !== undefined) {
        // Send as JSON string for FormData
        formData.append("industries", JSON.stringify(data.industries))
      }
      if (data.avatar) formData.append("avatar", data.avatar)

      return this.request<{
        success: boolean
        message: string
        profile: any
        avatarPath?: string
      }>("/profile", {
        method: "PATCH",
        body: formData,
        isFormData: true,
      })
    },

    saveExecuWell: (data: {
      mbti?: string
      enneagram?: number
      disc?: string
      industries?: string[]
      currentRoles?: string[]
      licenses?: string[]
      businessGoal?: string
      values?: string[]
      interests?: string[]
      businessChallenges?: string[]
      healthScore?: number
      selfScore?: number
      tone?: string
      motivationStyle?: string
      analysisDepth?: string
    }) =>
      this.request<{
        success: boolean
        message: string
        profile: any
      }>("/profile/execuwell", {
        method: "POST",
        body: data,
      }),

    saveVitaAI: (data: {
      genetic_summary?: Record<string, number>
      sports_profile?: Record<string, number>
      testId?: string
      testDate?: string
      rawPayload?: any
    }) =>
      this.request<{
        success: boolean
        message: string
        profile: any
      }>("/profile/vitaai", {
        method: "POST",
        body: data,
      }),
  }

  // Diagnostic endpoints
  diagnostic = {
    get: () =>
      this.request<{
        result: {
          id: string
          ownerId: string
          answers: Record<string, string>
          mbtiType: string | null
          mbtiLabel: string | null
          discType: string | null
          discLabel: string | null
          enneagramTop3: number[] | null
          cognitiveTrend: string | null
          summary: string | null
          completedAt: string
          createdAt: string
          updatedAt: string
        } | null
      }>("/diagnostic"),

    save: (data: {
      answers: Record<string, string>
      mbtiType: string
      mbtiLabel: string
      discType: string
      discLabel: string
      enneagramTop3: number[]
      cognitiveTrend: string
      summary: string
    }) =>
      this.request<{
        ok: boolean
        diagnostic: any
      }>("/diagnostic", {
        method: "POST",
        body: data,
      }),

    phaseComplete: (data: {
      phase: "MBTI" | "DISC" | "ENNEAGRAM"
      answers: Record<string, string>
      mbtiType?: string
      discType?: string
      enneagramTop3?: number[]
    }) =>
      this.request<{
        ok: boolean
        phase: string
        insight: string
      }>("/diagnostic/phase-complete", {
        method: "POST",
        body: data,
      }),
  }

  // LINE integration endpoints
  line = {
    getStatus: () =>
      this.request<{
        linked: boolean
        lineUserId: string | null
        userMode: string | null
        morningPushEnabled: boolean
      }>("/line/status"),

    // Modern LINE Login (OAuth)
    getLoginUrl: (state: string) =>
      this.request<{ url: string }>("/line/login-url", {
        query: { state },
      }),

    linkOAuth: (code: string, state: string, expectedState: string) =>
      this.request<{
        ok: boolean
        lineUserId: string
        displayName: string | null
        linked: boolean
      }>("/line/link-oauth", {
        method: "POST",
        body: { code, state, expectedState },
      }),

    // Legacy manual linking (deprecated)
    link: (lineUserId: string) =>
      this.request<{ ok: boolean; message: string }>("/line/link", {
        method: "POST",
        body: { lineUserId },
      }),

    unlink: () =>
      this.request<{ ok: boolean; message: string }>("/line/unlink", {
        method: "POST",
      }),

    toggleMorningPush: (enabled: boolean) =>
      this.request<{ ok: boolean; morningPushEnabled: boolean }>("/line/morning-push", {
        method: "POST",
        body: { enabled },
      }),
  }

  // MyAI Payload (unified JSON)
  myaiPayload = {
    get: () =>
      this.request<{
        user_id: string
        name: string
        mbti: string
        disc: string
        enneagram: string[]
        cognitive: string
        strengths: string[]
        career: string
        goals: string
        values: string[]
        lifestyle: string[]
      }>("/profile/myai-payload"),
  }

  // Stripe endpoints
  stripe = {
    createCheckoutSession: (subscriptionType: "VITAAI" | "EXECUWELL" | "INTEGRATED") =>
      this.request<{
        sessionId: string
        url: string
      }>("/stripe/create-checkout-session", {
        method: "POST",
        body: { subscriptionType },
      }),

    getSubscription: () =>
      this.request<{
        subscription: {
          id: string
          type: string
          status: string
          currentPeriodStart: string
          currentPeriodEnd: string
          cancelAtPeriodEnd: boolean
          canceledAt: string | null
          stripeSubscriptionId: string
        } | null
        active: boolean
        stripeSubscription: {
          status: string
          cancel_at_period_end: boolean
        }
      }>("/stripe/subscription"),

    createPortalSession: () =>
      this.request<{
        url: string
      }>("/stripe/create-portal-session", {
        method: "POST",
      }),

    cancelSubscription: (subscriptionId: string) =>
      this.request<{
        success: boolean
        message: string
      }>("/stripe/cancel-subscription", {
        method: "POST",
        body: { subscriptionId },
      }),
  }
}

// Export singleton instance
export const apiClient = new APIClient()
