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
import { Briefcase, Settings } from "lucide-react"
import { apiClient, ConversationMessage } from "@/lib/api"

type Message = {
  id: string
  role: "user" | "assistant"
  content: string
  kind?: "TEXT" | "VOICE" | "IMAGE"
  voiceUrl?: string
  timestamp: string
}

function ExecuWellChatContent() {
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
        timestamp: new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }))
      setMessages(formattedMessages)
    } catch (error) {
      console.error("Failed to load conversation:", error)
      setMessages([])
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
            content: "ExecuWellへようこそ！私はあなたのビジネスインテリジェンスパートナーです。今日はどんなことを話そうか？",
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
      content,
      kind: type === "voice" ? "VOICE" : undefined,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }
    setMessages((prev) => [...prev, userMessage])

    setIsLoading(true)
    try {
      let resp: { conversationId: string; message: string; timestamp: string }
      if (type === "voice" && file) {
        // Step 1: upload, show audio bubble immediately
        const upload = await apiClient.chats.uploadVoice("EXECUWELL", file, currentConversationId || undefined)
        if (!currentConversationId) {
          setCurrentConversationId(upload.conversationId)
        }
        setMessages((prev) => prev.map((m) => m.id === userMessage.id ? { ...m, content: "音声メッセージを処理中...", kind: "VOICE", voiceUrl: upload.audioPath } : m))

        // Step 2: process (transcribe + AI)
        const processed = await apiClient.chats.processVoice("EXECUWELL", upload.conversationId, upload.audioPath)
        resp = { conversationId: processed.conversationId, message: processed.message, timestamp: processed.timestamp }
      } else {
        // Call backend ExecuWell chat with conversation ID
        resp = await apiClient.chats.send("EXECUWELL", content, currentConversationId || undefined)
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
      const errMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "エラーが発生しました。しばらくしてから再度お試しください。",
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
          service="EXECUWELL"
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
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r from-execuwell to-accent shadow-lg hover:shadow-xl hover:shadow-execuwell/30 transition-all duration-300 hover:scale-105">
              <Briefcase className="h-6 w-6 text-execuwell-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-execuwell">ExecuWell</h1>
              <p className="text-sm text-muted-foreground">ビジネスインテリジェンスパートナー</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-execuwell hover:bg-execuwell/10 transition-all duration-300 hover:scale-105">
            <Settings className="h-5 w-5" />
            <span className="sr-only">チャット設定</span>
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 space-y-6 overflow-y-auto p-4 md:p-6 bg-gradient-to-b from-background to-background/50">
          {isLoadingConversation ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r from-execuwell to-accent shadow-lg mx-auto mb-4 animate-pulse">
                  <Briefcase className="h-6 w-6 text-execuwell-foreground" />
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
                  timestamp={message.timestamp}
                  userName={user?.name}
                  service="execuwell"
                />
              ))}
              {isLoading && (
                <div className="flex gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-r from-execuwell to-accent shadow-lg">
                    <Briefcase className="h-5 w-5 text-execuwell-foreground animate-pulse" />
                  </div>
                  <div className="flex items-center space-x-2 rounded-2xl bg-gradient-to-r from-card to-card/80 px-5 py-4 border border-border/50 shadow-sm">
                    <div className="h-2 w-2 animate-bounce rounded-full bg-execuwell [animation-delay:-0.3s]" />
                    <div className="h-2 w-2 animate-bounce rounded-full bg-accent [animation-delay:-0.15s]" />
                    <div className="h-2 w-2 animate-bounce rounded-full bg-execuwell" />
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
      {user && <ChatInfoPanel user={user} service="execuwell" />}

      {/* Mobile Sidebar */}
      <ChatMobileSidebar
        service="EXECUWELL"
        currentConversationId={currentConversationId || undefined}
        onConversationSelect={handleConversationSelect}
        onNewConversation={handleNewConversation}
      />
    </div>
  )
}

export default function ExecuWellChatPage() {
  return (
    <ProtectedRoute>
      <ExecuWellChatContent />
    </ProtectedRoute>
  )
}
