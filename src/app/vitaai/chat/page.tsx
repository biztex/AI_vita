"use client"

import { useState, useEffect } from "react"
import { ProtectedRoute } from "@/features/auth/components/protected-route"
import { useAuth } from "@/lib/auth-context"
import { ChatMessage } from "@/features/chat/components/chat-message"
import { ChatInput } from "@/features/chat/components/chat-input"
import { ChatInfoPanel } from "@/features/chat/components/chat-info-panel"
import { ChatSidebar } from "@/features/chat/components/chat-sidebar"
import { ChatMobileSidebar } from "@/features/chat/components/chat-mobile-sidebar"
import { Button } from "@/components/ui/button"
import { Activity, Settings } from "lucide-react"
import { apiClient, ConversationMessage } from "@/lib/api"

type Message = {
  id: string
  role: "user" | "assistant"
  content: string
  kind?: "TEXT" | "VOICE" | "IMAGE"
  voiceUrl?: string
  imageUrl?: string
  timestamp: string
}

function VitaAIChatContent() {
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [isLoadingConversation, setIsLoadingConversation] = useState(false)

  // Load conversation when conversationId changes
  const loadConversation = async (conversationId: string) => {
    setIsLoadingConversation(true)
    try {
      const response = await apiClient.chats.getConversation(conversationId)
      const formattedMessages: Message[] = response.messages.map((msg: ConversationMessage) => ({
        id: msg.id,
        role: msg.sender === "USER" ? "user" : "assistant",
        content: msg.content,
        kind: msg.kind,
        voiceUrl: msg.voiceUrl,
        imageUrl: msg.kind === "IMAGE" ? msg.voiceUrl : undefined,
        timestamp: new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }))
      setMessages(formattedMessages)
    } catch (error) {
      console.error("Failed to load conversation:", error)
      setMessages([{
        id: "load-error",
        role: "assistant",
        content: "会話を読み込めませんでした。もう一度お試しください。",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }])
    } finally {
      setIsLoadingConversation(false)
    }
  }

  // Handle conversation selection
  const handleConversationSelect = (conversationId: string | null) => {
    setCurrentConversationId(conversationId)
    if (conversationId) {
      loadConversation(conversationId)
    } else {
      setMessages([])
    }
  }

  // Handle new conversation
  const handleNewConversation = (conversationId: string) => {
    setCurrentConversationId(conversationId)
    loadConversation(conversationId)
  }

  // Load MyAI personalized welcome when no conversation is selected
  useEffect(() => {
    if (currentConversationId) return
    let cancelled = false
    apiClient.chats
      .getMyAIWelcome()
      .then((data) => {
        if (!cancelled) {
          setMessages([{
            id: "welcome",
            role: "assistant",
            content: data.greeting,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          }])
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMessages([{
            id: "welcome",
            role: "assistant",
            content: "こんにちは！私はVitaAI、あなた専用の健康インテリジェンスアシスタントです。今日はどんなことをお話ししましょうか？",
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          }])
        }
      })
    return () => { cancelled = true }
  }, [currentConversationId])

  const handleSendMessage = async (content: string, type: "text" | "voice" | "image", file?: File) => {
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: type === "image" ? (content || "[画像]") : content,
      kind: type === "voice" ? "VOICE" : type === "image" ? "IMAGE" : undefined,
      imageUrl: type === "image" && file ? URL.createObjectURL(file) : undefined,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }
    setMessages((prev) => [...prev, userMessage])

    setIsLoading(true)
    try {
      let resp: { conversationId: string; message: string; timestamp: string }
      if (type === "voice" && file) {
        // Step 1: upload, show audio bubble immediately
        const upload = await apiClient.chats.uploadVoice("VITAAI", file, currentConversationId || undefined)
        // If no conversation yet, set it now
        if (!currentConversationId) {
          setCurrentConversationId(upload.conversationId)
        }
        setMessages((prev) => prev.map((m) => m.id === userMessage.id ? { ...m, content: "音声メッセージを処理中...", kind: "VOICE", voiceUrl: upload.audioPath } : m))

        // Step 2: process (transcribe + AI)
        const processed = await apiClient.chats.processVoice("VITAAI", upload.conversationId, upload.audioPath)
        resp = { conversationId: processed.conversationId, message: processed.message, timestamp: processed.timestamp }
      } else if (type === "image" && file) {
        const img = await apiClient.chats.sendImage("VITAAI", file, content, currentConversationId || undefined)
        resp = { conversationId: img.conversationId, message: img.message, timestamp: img.timestamp }
      } else {
        // Call backend VitaAI chat with conversation ID
        resp = await apiClient.chats.send("VITAAI", content, currentConversationId || undefined)
      }

      // Update conversation ID if this was a new conversation
      if (!currentConversationId) {
        setCurrentConversationId(resp.conversationId)
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: resp.message,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }
      setMessages((prev) => [...prev, aiMessage])
    } catch (e: any) {
      // If a voice bubble is stuck in processing, mark it as failed
      setMessages((prev) => prev.map((m) => m.id === userMessage.id && m.content === "音声メッセージを処理中..." ? { ...m, content: "音声メッセージ（処理できませんでした）" } : m))
      // Prefer a meaningful Japanese backend message (4xx) over the generic fallback
      const status = e?.response?.status
      const backendMessage =
        typeof e?.message === "string" &&
        /[\u3040-\u30ff\u4e00-\u9fff]/.test(e.message) &&
        (!status || (status >= 400 && status < 500))
          ? e.message
          : null
      const errMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: backendMessage || "エラーが発生しました。しばらくしてから再度お試しください。",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }
      setMessages((prev) => [...prev, errMessage])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:w-80">
        <ChatSidebar
          service="VITAAI"
          currentConversationId={currentConversationId || undefined}
          onConversationSelect={handleConversationSelect}
          onNewConversation={handleNewConversation}
          className="w-full"
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex flex-1 flex-col">
        {/* Chat Header */}
        <div className="flex items-center justify-between border-b border-border/50 bg-gradient-to-r from-background/95 to-background/90 backdrop-blur-sm px-4 md:px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r from-vitaai to-success shadow-lg hover:shadow-xl hover:shadow-vitaai/30 transition-all duration-300 hover:scale-105">
              <Activity className="h-6 w-6 text-vitaai-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-vitaai">VitaAI</h1>
              <p className="text-sm text-muted-foreground">健康インテリジェンスアシスタント</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-vitaai hover:bg-vitaai/10 transition-all duration-300 hover:scale-105">
            <Settings className="h-5 w-5" />
            <span className="sr-only">チャット設定</span>
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 space-y-6 overflow-y-auto p-4 md:p-6 bg-gradient-to-b from-background to-background/50">
          {isLoadingConversation ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r from-vitaai to-success shadow-lg mx-auto mb-4 animate-pulse">
                  <Activity className="h-6 w-6 text-vitaai-foreground" />
                </div>
                <p className="text-sm text-muted-foreground font-medium">会話を読み込み中...</p>
              </div>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  role={message.role}
                  content={message.content}
                  kind={message.kind}
                  voiceUrl={message.voiceUrl}
                  imageUrl={message.imageUrl}
                  timestamp={message.timestamp}
                  userName={user?.name}
                  service="vitaai"
                />
              ))}
              {isLoading && (
                <div className="flex gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-r from-vitaai to-success shadow-lg">
                    <Activity className="h-5 w-5 text-vitaai-foreground animate-pulse" />
                  </div>
                  <div className="flex items-center space-x-2 rounded-2xl bg-gradient-to-r from-card to-card/80 px-5 py-4 border border-border/50 shadow-sm">
                    <div className="h-2 w-2 animate-bounce rounded-full bg-vitaai [animation-delay:-0.3s]" />
                    <div className="h-2 w-2 animate-bounce rounded-full bg-success [animation-delay:-0.15s]" />
                    <div className="h-2 w-2 animate-bounce rounded-full bg-vitaai" />
                    <span className="ml-2 text-sm text-muted-foreground font-medium">AIが考えています...</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Input */}
        <ChatInput onSendMessage={handleSendMessage} disabled={isLoading} />
      </div>

      {/* Info Panel */}
      {user && <ChatInfoPanel user={user} service="vitaai" />}

      {/* Mobile Sidebar */}
      <ChatMobileSidebar
        service="VITAAI"
        currentConversationId={currentConversationId || undefined}
        onConversationSelect={handleConversationSelect}
        onNewConversation={handleNewConversation}
      />
    </div>
  )
}

export default function VitaAIChatPage() {
  return (
    <ProtectedRoute>
      <VitaAIChatContent />
    </ProtectedRoute>
  )
}
