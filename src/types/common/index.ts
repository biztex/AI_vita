export type Service = "VITAAI" | "EXECUWELL"

export type MessageKind = "TEXT" | "VOICE" | "IMAGE"

export type MessageRole = "user" | "assistant"

export type Message = {
  id: string
  role: MessageRole
  content: string
  kind?: MessageKind
  timestamp: string
}

export type ApiError = {
  message: string
  code?: string
  status?: number
}
