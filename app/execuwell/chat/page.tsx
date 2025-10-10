"use client"

import { useState } from "react"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { useAuth } from "@/lib/auth-context"
import { ChatMessage } from "@/components/chat/chat-message"
import { ChatInput } from "@/components/chat/chat-input"
import { ChatInfoPanel } from "@/components/chat/chat-info-panel"
import { Button } from "@/components/ui/button"
import { Briefcase, Settings } from "lucide-react"

type Message = {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: string
}

function ExecuWellChatContent() {
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "ExecuWellへようこそ！私はあなたのビジネスインテリジェンスパートナーです。市場インサイト、経済分析、戦略的推奨事項を提供します。業界トレンド、競争環境、新たな機会について情報を提供し続けることができます。今日は何を探求したいですか？",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ])
  const [isLoading, setIsLoading] = useState(false)

  const handleSendMessage = async (content: string, type: "text" | "voice" | "image", file?: File) => {
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }
    setMessages((prev) => [...prev, userMessage])

    setIsLoading(true)
    try {
      // Call backend ExecuWell chat
      const { apiClient } = await import("@/lib/api-client")
      const resp = await apiClient.chats.send("EXECUWELL", content)

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
      {/* Main Chat Area */}
      <div className="flex flex-1 flex-col">
        {/* Chat Header */}
        <div className="flex items-center justify-between border-b border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 px-6 py-4">
          <div className="flex items-center space-x-3">
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
        <div className="flex-1 space-y-6 overflow-y-auto p-6 bg-gradient-to-b from-white to-emerald-50/30">
          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              role={message.role}
              content={message.content}
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
