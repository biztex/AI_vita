"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { 
  MessageSquare, 
  Plus, 
  Search, 
  MoreVertical, 
  Edit2, 
  Trash2,
  Calendar,
  MessageCircle
} from "lucide-react"
import { NewChatDialog } from "./new-chat-dialog"
import { DeleteConfirmationDialog } from "./delete-confirmation-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { apiClient, ConversationSummary } from "@/lib/api-client"

interface ChatSidebarProps {
  service: "VITAAI" | "EXECUWELL"
  currentConversationId?: string
  onConversationSelect: (conversationId: string | null) => void
  onNewConversation: (conversationId: string) => void
  className?: string
}

export function ChatSidebar({ 
  service, 
  currentConversationId, 
  onConversationSelect, 
  onNewConversation,
  className 
}: ChatSidebarProps) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [editingTitle, setEditingTitle] = useState<string | null>(null)
  const [editingValue, setEditingValue] = useState("")
  const [isNewChatDialogOpen, setIsNewChatDialogOpen] = useState(false)
  const [deletingConversationId, setDeletingConversationId] = useState<string | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [conversationToDelete, setConversationToDelete] = useState<{id: string, title: string} | null>(null)

  // Load conversations
  useEffect(() => {
    loadConversations()
  }, [service])

  const loadConversations = async () => {
    try {
      setIsLoading(true)
      const response = await apiClient.chats.getConversations(service)
      setConversations(response.conversations)
    } catch (error) {
      console.error("Failed to load conversations:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Filter conversations based on search query
  const filteredConversations = conversations?.filter(conv =>
    conv.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.lastMessage?.content.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleEditTitle = (conversationId: string, currentTitle: string) => {
    setEditingTitle(conversationId)
    setEditingValue(currentTitle || "")
  }

  const handleSaveTitle = async (conversationId: string) => {
    try {
      await apiClient.chats.updateConversationTitle(conversationId, editingValue)
      setConversations(prev => 
        prev.map(conv => 
          conv.id === conversationId 
            ? { ...conv, title: editingValue }
            : conv
        )
      )
      setEditingTitle(null)
      setEditingValue("")
    } catch (error) {
      console.error("Failed to update title:", error)
    }
  }

  const handleCancelEdit = () => {
    setEditingTitle(null)
    setEditingValue("")
  }

  const handleCreateNewChat = async (title: string) => {
    try {
      // Create a new conversation with the provided title
      const response = await apiClient.chats.send(service, "こんにちは？", undefined, title)
      
      // Reload conversations to show the new one
      await loadConversations()
      
      // Switch to the new conversation
      onNewConversation(response.conversationId)
    } catch (error) {
      console.error("Failed to create new chat:", error)
      throw error
    }
  }

  const handleDeleteClick = (conversationId: string) => {
    // Find the conversation to get its title
    const conversation = conversations.find(conv => conv.id === conversationId)
    const conversationTitle = conversation?.title || `Chat ${conversationId.slice(-8)}`
    
    // Set up the conversation to delete and show dialog
    setConversationToDelete({ id: conversationId, title: conversationTitle })
    setIsDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!conversationToDelete) return
    
    const { id: conversationId } = conversationToDelete
    
    try {
      setDeletingConversationId(conversationId)
      console.log("Attempting to delete conversation:", conversationId)
      
      const response = await apiClient.chats.deleteConversation(conversationId)
      console.log("Delete response:", response)
      
      // Remove from local state
      setConversations(prev => prev.filter(conv => conv.id !== conversationId))
      
      // If this was the current conversation, clear it
      if (currentConversationId === conversationId) {
        onConversationSelect(null)
      }
      
      console.log("Conversation deleted successfully")
      
      // Close dialog and reset state
      setIsDeleteDialogOpen(false)
      setConversationToDelete(null)
    } catch (error) {
      console.error("Failed to delete conversation:", error)
      alert(`Failed to delete conversation: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setDeletingConversationId(null)
    }
  }

  const handleDeleteCancel = () => {
    setIsDeleteDialogOpen(false)
    setConversationToDelete(null)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: "short" })
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" })
    }
  }

  const truncateText = (text: string, maxLength: number = 50) => {
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text
  }

  return (
    <div className={cn("flex flex-col h-full bg-white border-r border-gray-200", className)}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center",
              service === "VITAAI" 
                ? "bg-gradient-to-r from-blue-500 to-purple-500"
                : "bg-gradient-to-r from-emerald-500 to-teal-500"
            )}>
              <MessageSquare className="w-4 h-4 text-white" />
            </div>
            <h2 className="font-semibold text-gray-900">
              {service === "VITAAI" ? "VitaAI" : "ExecuWell"}チャット
            </h2>
          </div>
          <Button
            onClick={() => setIsNewChatDialogOpen(true)}
            size="sm"
            className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="会話を検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Conversations List */}
      <ScrollArea className="flex-1 overflow-y-scroll">
        <div className="p-2">
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="p-3 rounded-lg bg-gray-100 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : filteredConversations?.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">
                {searchQuery ? "会話が見つかりません" : "まだ会話がありません"}
              </p>
              {!searchQuery && (
                <Button
                  onClick={() => setIsNewChatDialogOpen(true)}
                  variant="outline"
                  size="sm"
                  className="mt-3"
                >
                  最初のチャットを開始
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredConversations?.map((conversation) => (
                <div
                  key={conversation.id}
                  className={cn(
                    "group relative p-3 rounded-lg cursor-pointer transition-all duration-200",
                    currentConversationId === conversation.id
                      ? "bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200"
                      : "hover:bg-gray-50"
                  )}
                  onClick={() => onConversationSelect(conversation.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      {editingTitle === conversation.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleSaveTitle(conversation.id)
                              } else if (e.key === "Escape") {
                                handleCancelEdit()
                              }
                            }}
                            className="h-6 text-sm"
                            autoFocus
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleSaveTitle(conversation.id)}
                            className="h-6 w-6 p-0"
                          >
                            ✓
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleCancelEdit}
                            className="h-6 w-6 p-0"
                          >
                            ✕
                          </Button>
                        </div>
                      ) : (
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {conversation.title || `チャット ${conversation.id.slice(-8)}`}
                        </h3>
                      )}
                      
                      {conversation.lastMessage && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                          {conversation.lastMessage.sender === "USER" ? "あなた: " : ""}
                          {truncateText(conversation.lastMessage.content, 60)}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-gray-400">
                          {formatDate(conversation.lastMessage?.createdAt || conversation.createdAt)}
                        </span>
                        <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                          {conversation.messageCount}件のメッセージ
                        </Badge>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="text-lg font-bold leading-none">⋯</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEditTitle(conversation.id, conversation.title || "")
                          }}
                        >
                          <Edit2 className="w-4 h-4 mr-2" />
                          名前を変更
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteClick(conversation.id)
                          }}
                          className="text-red-600"
                          disabled={deletingConversationId === conversation.id}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          {deletingConversationId === conversation.id ? "削除中..." : "削除"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* New Chat Dialog */}
      <NewChatDialog
        service={service}
        isOpen={isNewChatDialogOpen}
        onOpenChange={setIsNewChatDialogOpen}
        onCreateChat={handleCreateNewChat}
      />

      {/* Delete Confirmation Dialog */}
      {conversationToDelete && (
        <DeleteConfirmationDialog
          isOpen={isDeleteDialogOpen}
          onOpenChange={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
          conversationTitle={conversationToDelete.title}
          isDeleting={deletingConversationId === conversationToDelete.id}
        />
      )}
    </div>
  )
}
