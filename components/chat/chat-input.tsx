"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, Mic, MicOff, ImageIcon } from "lucide-react"
import { cn } from "@/lib/utils"

type ChatInputProps = {
  onSendMessage: (message: string, type: "text" | "voice" | "image", file?: File) => void
  disabled?: boolean
}

export function ChatInput({ onSendMessage, disabled }: ChatInputProps) {
  const [message, setMessage] = useState("")
  const [isRecording, setIsRecording] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<BlobPart[]>([])
  const streamRef = useRef<MediaStream | null>(null)

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
    }
  }, [])

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
      onSendMessage(`Uploaded: ${file.name}`, "image", file)
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
      onSendMessage(`Uploaded: ${file.name}`, "image", file)
    }
  }

  return (
    <div
      className={cn(
        "border-t border-blue-200 bg-gradient-to-r from-blue-50/50 to-purple-50/50 p-4",
        isDragging && "bg-gradient-to-r from-blue-100 to-purple-100"
      )}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isRecording ? "🎤 録音中... 停止で送信" : "💬 メッセージを入力..."}
            className="min-h-[60px] resize-none border-2 border-blue-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-200/50 bg-white/80 backdrop-blur-sm"
            disabled={disabled}
          />
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
            className="h-[60px] w-[60px] border-2 border-green-300 hover:border-green-400 hover:bg-green-50 text-green-600 hover:text-green-700 transition-all duration-200"
          >
            <ImageIcon className="h-5 w-5" />
            <span className="sr-only">ファイルを選択</span>
          </Button>

          <Button
            type="button"
            variant={isRecording ? "destructive" : "default"}
            size="icon"
            onClick={toggleRecording}
            disabled={disabled}
            className={cn(
              "h-[60px] w-[60px] transition-all duration-200",
              isRecording 
                ? "bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-200 animate-pulse" 
                : "bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg shadow-blue-200 hover:shadow-blue-300"
            )}
          >
            {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            <span className="sr-only">{isRecording ? "録音停止" : "録音開始"}</span>
          </Button>

          <Button 
            onClick={handleSendText} 
            disabled={!message.trim() || disabled} 
            size="icon" 
            className="h-[60px] w-[60px] bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-200 hover:shadow-emerald-300 transition-all duration-200"
          >
            <Send className="h-5 w-5" />
            <span className="sr-only">メッセージを送信</span>
          </Button>
        </div>
      </div>

      <div className="mt-3 text-center text-sm text-blue-600/70 font-medium">
        📁 ドラッグ＆ドロップでPDF/画像をアップロード（対応: PDF、PNG、JPG 最大10MB）
      </div>
    </div>
  )
}
