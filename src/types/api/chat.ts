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
  voiceUrl?: string
  createdAt: string
  service: "VITAAI" | "EXECUWELL"
  conversationTitle: string | null
}

export type ChatResponse = {
  conversationId: string
  message: string
  service: string
  timestamp: string
}

export type VoiceUploadResponse = {
  conversationId: string
  audioPath: string
  service: string
  timestamp: string
}

export type VoiceProcessResponse = {
  conversationId: string
  message: string
  transcript: string
  service: string
  timestamp: string
}
