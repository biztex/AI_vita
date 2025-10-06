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

    // Simulate AI response
    setIsLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 1500))

    const aiMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content:
        "現在の市場トレンドに基づくと、テクノロジーセクターはAIとクラウドインフラストラクチャで強い勢いを示しています。主要指標は、エンタープライズSaaS採用の継続的な成長を示唆しています。3つの特定分野の監視をお勧めします：従来産業へのAI統合、サイバーセキュリティ投資、持続可能なテクノロジーイニシアチブ。これらのセクターの詳細な内訳をご希望ですか？",
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
              <Briefcase className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">ExecuWell</h1>
              <p className="text-sm text-muted-foreground">ビジネスインテリジェンスパートナー</p>
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
              service="execuwell"
            />
          ))}
          {isLoading && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <Briefcase className="h-4 w-4 text-primary" />
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
