"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Plus, MessageSquare } from "lucide-react"

interface NewChatDialogProps {
  service: "VITAAI" | "EXECUWELL"
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onCreateChat: (title: string) => void
}

export function NewChatDialog({ service, isOpen, onOpenChange, onCreateChat }: NewChatDialogProps) {
  const [title, setTitle] = useState("")
  const [isCreating, setIsCreating] = useState(false)

  const handleCreate = async () => {
    if (!title.trim()) return
    
    setIsCreating(true)
    try {
      await onCreateChat(title.trim())
      setTitle("")
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to create chat:", error)
    } finally {
      setIsCreating(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isCreating) {
      e.preventDefault()
      handleCreate()
    }
  }

  const getServiceInfo = () => {
    if (service === "VITAAI") {
      return {
        name: "VitaAI",
        description: "健康インテリジェンスアシスタント",
        icon: "🏥",
        placeholder: "例: 健康相談、症状について、栄養指導など"
      }
    } else {
      return {
        name: "ExecuWell",
        description: "ビジネスインテリジェンスパートナー",
        icon: "💼",
        placeholder: "例: 市場分析、戦略相談、リーダーシップ指導など"
      }
    }
  }

  const serviceInfo = getServiceInfo()

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-purple-500">
              <Plus className="h-4 w-4 text-white" />
            </div>
            新しい{serviceInfo.name}チャット
          </DialogTitle>
          <DialogDescription>
            {serviceInfo.name}との新しい会話を作成 - {serviceInfo.description}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="chat-title" className="text-sm font-medium">
              チャットタイトル
            </Label>
            <Input
              id="chat-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={serviceInfo.placeholder}
              className="w-full"
              disabled={isCreating}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              後で簡単に見つけられるよう、会話にわかりやすい名前を付けてください
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isCreating}
          >
            キャンセル
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!title.trim() || isCreating}
            className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
          >
            {isCreating ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                作成中...
              </>
            ) : (
              <>
                <MessageSquare className="h-4 w-4 mr-2" />
                チャットを作成
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
