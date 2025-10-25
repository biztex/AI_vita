export type ChatInputProps = {
  onSendMessage: (message: string, type: "text" | "voice" | "image", file?: File) => void
  disabled?: boolean
}

export type ChatMessageProps = {
  role: "user" | "assistant"
  content: string
  kind?: "TEXT" | "VOICE" | "IMAGE"
  timestamp?: string
  userName?: string
  service?: "vitaai" | "execuwell"
}

export type ChatSidebarProps = {
  service: "VITAAI" | "EXECUWELL"
  currentConversationId?: string
  onConversationSelect: (conversationId: string | null) => void
  onNewConversation: (conversationId: string) => void
  className?: string
}
