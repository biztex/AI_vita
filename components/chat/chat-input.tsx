"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Send, Mic, ImageIcon, Square } from "lucide-react"
import { cn } from "@/lib/utils"

type ChatInputProps = {
  onSendMessage: (message: string, type: "text" | "voice" | "image", file?: File) => void
  disabled?: boolean
}

export function ChatInput({ onSendMessage, disabled }: ChatInputProps) {
  const [message, setMessage] = useState("")
  const [isRecording, setIsRecording] = useState(false)
  const [activeTab, setActiveTab] = useState("text")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSendText = () => {
    if (message.trim() && !disabled) {
      onSendMessage(message, "text")
      setMessage("")
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendText()
    }
  }

  const toggleRecording = () => {
    if (disabled) return
    setIsRecording(!isRecording)
    if (!isRecording) {
      // Start recording
      console.log("[v0] Starting voice recording")
      // Mock: send after 2 seconds
      setTimeout(() => {
        onSendMessage("Voice message transcribed", "voice")
        setIsRecording(false)
      }, 2000)
    } else {
      // Stop recording
      console.log("[v0] Stopping voice recording")
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && !disabled) {
      console.log("[v0] File selected:", file.name)
      onSendMessage(`Uploaded: ${file.name}`, "image", file)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  return (
    <div className="border-t border-border bg-background p-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-3 grid w-full grid-cols-3">
          <TabsTrigger value="text">テキスト</TabsTrigger>
          <TabsTrigger value="voice">音声</TabsTrigger>
          <TabsTrigger value="image">画像</TabsTrigger>
        </TabsList>

        {/* Text Input */}
        <TabsContent value="text" className="mt-0">
          <div className="flex gap-2">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="メッセージを入力..."
              className="min-h-[60px] resize-none"
              disabled={disabled}
            />
            <Button onClick={handleSendText} disabled={!message.trim() || disabled} size="icon" className="h-[60px]">
              <Send className="h-4 w-4" />
              <span className="sr-only">メッセージを送信</span>
            </Button>
          </div>
        </TabsContent>

        {/* Voice Input */}
        <TabsContent value="voice" className="mt-0">
          <div className="flex flex-col items-center justify-center space-y-4 py-8">
            <Button
              onClick={toggleRecording}
              disabled={disabled}
              size="lg"
              variant={isRecording ? "destructive" : "default"}
              className={cn("h-20 w-20 rounded-full", isRecording && "animate-pulse")}
            >
              {isRecording ? <Square className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
              <span className="sr-only">{isRecording ? "録音停止" : "録音開始"}</span>
            </Button>
            <p className="text-sm text-muted-foreground">
              {isRecording ? "録音中...クリックして停止" : "クリックして録音開始"}
            </p>
          </div>
        </TabsContent>

        {/* Image Upload */}
        <TabsContent value="image" className="mt-0">
          <div className="flex flex-col items-center justify-center space-y-4 rounded-lg border-2 border-dashed border-border py-12">
            <ImageIcon className="h-12 w-12 text-muted-foreground" />
            <div className="text-center">
              <p className="mb-2 text-sm font-medium">PDF/画像をドロップまたはクリックしてアップロード</p>
              <p className="text-xs text-muted-foreground">対応形式: PDF、PNG、JPG（最大10MB）</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileSelect}
              className="hidden"
              disabled={disabled}
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              variant="outline"
              className="bg-transparent"
            >
              ファイル選択
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
