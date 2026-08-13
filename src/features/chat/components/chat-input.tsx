"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, Mic, MicOff, ImageIcon, Paperclip, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

type ChatInputProps = {
  onSendMessage: (message: string, type: "text" | "voice" | "image", file?: File) => void
  disabled?: boolean
}

export function ChatInput({ onSendMessage, disabled }: ChatInputProps) {
  const [message, setMessage] = useState("")
  const [isRecording, setIsRecording] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [stagedImage, setStagedImage] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<BlobPart[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        try {
          mediaRecorderRef.current.stop()
        } catch {}
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [])

  // Stage an image for preview; it is only sent when the user presses Send.
  const stageImage = (file: File) => {
    if (!/^image\//.test(file.type)) {
      // Non-image (e.g. PDF) — keep the old immediate behavior
      onSendMessage(`Uploaded: ${file.name}`, "image", file)
      return
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setStagedImage(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  const clearStagedImage = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setStagedImage(null)
    setPreviewUrl(null)
  }

  const handleSendText = () => {
    if (disabled) return
    if (stagedImage) {
      // Send the image with the typed text as its caption
      onSendMessage(message.trim(), "image", stagedImage)
      clearStagedImage()
      setMessage("")
      setIsTyping(false)
      return
    }
    if (message.trim()) {
      onSendMessage(message, "text")
      setMessage("")
      setIsTyping(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendText()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value)
    setIsTyping(true)
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false)
    }, 1000)
  }

  const startRecording = async () => {
    if (disabled || isRecording) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const options: MediaRecorderOptions = {}
      // Prefer webm if supported
      if (MediaRecorder.isTypeSupported("audio/webm")) {
        options.mimeType = "audio/webm"
      } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
        options.mimeType = "audio/mp4"
      }
      const recorder = new MediaRecorder(stream, options)
      audioChunksRef.current = []
      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }
      recorder.onstop = async () => {
        const mimeType = recorder.mimeType || "audio/webm"
        const blob = new Blob(audioChunksRef.current, { type: mimeType })
        const fileName = mimeType.includes("mp4") ? "voice.mp4" : "voice.webm"
        const file = new File([blob], fileName, { type: mimeType })
        onSendMessage("[Voice message]", "voice", file)
        audioChunksRef.current = []
      }
      mediaRecorderRef.current = recorder
      recorder.start()
      setIsRecording(true)
    } catch (e) {
      console.warn("Failed to start recording", e)
      setIsRecording(false)
    }
  }

  const stopRecording = () => {
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop()
      }
    } catch {}
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    setIsRecording(false)
  }

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && !disabled) {
      stageImage(file)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) setIsDragging(true)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    if (disabled) return
    const file = e.dataTransfer.files?.[0]
    if (file) {
      stageImage(file)
    }
  }

  return (
    <div
      className={cn(
        "border-t border-border/50 bg-gradient-to-r from-background/95 to-background/90 backdrop-blur-sm p-4 transition-all duration-300",
        isDragging && "bg-gradient-to-r from-primary/10 to-accent/10 border-primary/50",
        isTyping && "border-primary/30"
      )}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {previewUrl && (
        <div className="mb-3 flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 p-2 w-fit">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="添付画像" className="h-16 w-16 rounded object-cover" />
          <div className="text-xs text-muted-foreground">
            画像を添付しました。<br />送信ボタンで解析します。
          </div>
          <button
            type="button"
            onClick={clearStagedImage}
            className="ml-1 rounded-full px-2 py-0.5 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            aria-label="画像を取り消す"
          >
            ✕
          </button>
        </div>
      )}

      <div className="flex items-end gap-3">
        <div className="flex-1 relative">
          <Textarea
            value={message}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={isRecording ? "🎤 録音中... 停止で送信" : "💬 AIに質問してください..."}
            className={cn(
              "min-h-[60px] resize-none border-2 transition-all duration-300 bg-background/80 backdrop-blur-sm",
              "focus:border-primary focus:ring-2 focus:ring-primary/20",
              isRecording && "border-destructive/50 bg-destructive/5",
              isTyping && "border-primary/50 bg-primary/5"
            )}
            disabled={disabled}
          />
          {isTyping && (
            <div className="absolute top-2 right-2 flex items-center gap-1 text-primary">
              <Sparkles className="h-3 w-3 animate-pulse" />
              <span className="text-xs font-medium">入力中...</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf"
            onChange={handleFileSelect}
            className="hidden"
            disabled={disabled}
          />
          
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="h-[60px] w-[60px] border-2 border-border/50 hover:border-primary/50 hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all duration-300 hover:scale-105"
          >
            <Paperclip className="h-5 w-5" />
            <span className="sr-only">ファイルを選択</span>
          </Button>

          <Button
            type="button"
            variant={isRecording ? "destructive" : "default"}
            size="icon"
            onClick={toggleRecording}
            disabled={disabled}
            className={cn(
              "h-[60px] w-[60px] transition-all duration-300",
              isRecording 
                ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-lg shadow-destructive/25 animate-pulse hover:scale-105" 
                : "bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-105"
            )}
          >
            {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            <span className="sr-only">{isRecording ? "録音停止" : "録音開始"}</span>
          </Button>

          <Button
            onClick={handleSendText}
            disabled={(!message.trim() && !stagedImage) || disabled}
            size="icon"
            className="h-[60px] w-[60px] bg-gradient-to-r from-success to-success/90 hover:from-success/90 hover:to-success text-success-foreground shadow-lg shadow-success/25 hover:shadow-success/40 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            <Send className="h-5 w-5" />
            <span className="sr-only">メッセージを送信</span>
          </Button>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <Paperclip className="h-3 w-3" />
            <span>ドラッグ＆ドロップでファイルをアップロード</span>
          </span>
          <span className="text-xs">PDF、PNG、JPG 最大10MB</span>
        </div>
        {isRecording && (
          <div className="flex items-center gap-2 text-destructive">
            <div className="h-2 w-2 rounded-full bg-destructive animate-pulse"></div>
            <span className="font-medium">録音中...</span>
          </div>
        )}
      </div>
    </div>
  )
}
