"use client"

import { useState, useEffect } from "react"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { useAuth } from "@/lib/auth-context"
import { ChatMessage } from "@/components/chat/chat-message"
import { ChatInput } from "@/components/chat/chat-input"
import { ChatInfoPanel } from "@/components/chat/chat-info-panel"
import { ChatSidebar } from "@/components/chat/chat-sidebar"
import { ChatMobileSidebar } from "@/components/chat/chat-mobile-sidebar"
import { Button } from "@/components/ui/button"
import { Briefcase, Settings } from "lucide-react"
import { apiClient, ConversationMessage } from "@/lib/api-client"

type Message = {
  id: string
  role: "user" | "assistant"
  content: string
  kind?: "TEXT" | "VOICE" | "IMAGE"
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

  // Load initial conversation or show welcome message
  useEffect(() => {
    if (!currentConversationId && messages.length === 0) {
      setMessages([{
        id: "welcome",
        role: "assistant",
        content: "ExecuWellへようこそ！私はあなたのビジネスインテリジェンスパートナーです。市場インサイト、経済分析、戦略的推奨事項を提供します。業界トレンド、競争環境、新たな機会について情報を提供し続けることができます。今日は何を探求したいですか？",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }])
    }
  }, [currentConversationId, messages.length])

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
        setMessages((prev) => prev.map((m) => m.id === userMessage.id ? { ...m, content: upload.audioPath, kind: "VOICE" } : m))

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
        <div className="flex items-center justify-between border-b border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 px-4 md:px-6 py-4">
          <div className="flex items-center space-x-3">
            {/* Mobile sidebar trigger */}
            <div className="md:hidden">
              <ChatMobileSidebar
                service="EXECUWELL"
                currentConversationId={currentConversationId || undefined}
                onConversationSelect={handleConversationSelect}
                onNewConversation={handleNewConversation}
              />
            </div>
            
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 shadow-lg">
              <Briefcase className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-emerald-800">ExecuWell</h1>
              <p className="text-sm text-emerald-600">ビジネスインテリジェンスパートナー</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100">
            <Settings className="h-5 w-5" />
            <span className="sr-only">チャット設定</span>
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 space-y-6 overflow-y-auto p-4 md:p-6 bg-gradient-to-b from-white to-emerald-50/30">
          {isLoadingConversation ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 shadow-lg mx-auto mb-4">
                  <Briefcase className="h-4 w-4 text-white animate-pulse" />
                </div>
                <p className="text-sm text-emerald-600">会話を読み込み中...</p>
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
                  timestamp={message.timestamp}
                  userName={user?.name}
                  service="execuwell"
                />
              ))}
              {isLoading && (
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 shadow-lg">
                    <Briefcase className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex items-center space-x-2 rounded-2xl bg-gradient-to-r from-emerald-100 to-teal-100 px-4 py-3 border border-emerald-200">
                    <div className="h-2 w-2 animate-bounce rounded-full bg-emerald-500 [animation-delay:-0.3s]" />
                    <div className="h-2 w-2 animate-bounce rounded-full bg-teal-500 [animation-delay:-0.15s]" />
                    <div className="h-2 w-2 animate-bounce rounded-full bg-emerald-500" />
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
