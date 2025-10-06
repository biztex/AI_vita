"use client"

import { useState } from "react"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { useAuth } from "@/lib/auth-context"
import { ChatMessage } from "@/components/chat/chat-message"
import { ChatInput } from "@/components/chat/chat-input"
import { ChatInfoPanel } from "@/components/chat/chat-info-panel"
import { Button } from "@/components/ui/button"
import { Activity, Settings } from "lucide-react"

type Message = {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: string
}

function VitaAIChatContent() {
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "こんにちは！私はVitaAI、あなた専用の健康インテリジェンスアシスタントです。遺伝子データの理解、パーソナライズされた健康推奨事項の提供、ウェルビーイングに関する質問への回答をお手伝いします。今日はどのようにお手伝いできますか？",
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

    // Simulate AI response
    setIsLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 1500))

    const aiMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content:
        "あなたの遺伝子プロファイルと最近の健康データに基づいて、心血管の健康に焦点を当てることをお勧めします。あなたのマーカーは持久力活動に優れた可能性を示しています。具体的な運動の推奨事項をご希望ですか？",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }
    setMessages((prev) => [...prev, aiMessage])
    setIsLoading(false)
  }

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Main Chat Area */}
      <div className="flex flex-1 flex-col">
        {/* Chat Header */}
        <div className="flex items-center justify-between border-b border-border bg-muted/30 px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Activity className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">VitaAI</h1>
              <p className="text-sm text-muted-foreground">健康インテリジェンスアシスタント</p>
            </div>
          </div>
          <Button variant="ghost" size="icon">
            <Settings className="h-5 w-5" />
            <span className="sr-only">チャット設定</span>
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              role={message.role}
              content={message.content}
              timestamp={message.timestamp}
              userName={user?.name}
              service="vitaai"
            />
          ))}
          {isLoading && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <Activity className="h-4 w-4 text-primary" />
              </div>
              <div className="flex items-center space-x-2 rounded-2xl bg-muted px-4 py-3">
                <div className="h-2 w-2 animate-bounce rounded-full bg-foreground [animation-delay:-0.3s]" />
                <div className="h-2 w-2 animate-bounce rounded-full bg-foreground [animation-delay:-0.15s]" />
                <div className="h-2 w-2 animate-bounce rounded-full bg-foreground" />
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <ChatInput onSendMessage={handleSendMessage} disabled={isLoading} />
      </div>

      {/* Info Panel */}
      {user && <ChatInfoPanel user={user} service="vitaai" />}
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
