"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { ChevronRight, ChevronLeft } from "lucide-react"
import { ChatSidebar } from "./chat-sidebar"

interface ChatMobileSidebarProps {
  service: "VITAAI" | "EXECUWELL"
  currentConversationId?: string
  onConversationSelect: (conversationId: string | null) => void
  onNewConversation: (conversationId: string) => void
}

export function ChatMobileSidebar({
  service,
  currentConversationId,
  onConversationSelect,
  onNewConversation
}: ChatMobileSidebarProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleConversationSelect = (conversationId: string | null) => {
    onConversationSelect(conversationId)
    setIsOpen(false) // Close sidebar after selection
  }

  const handleNewConversation = () => {
    onNewConversation()
    setIsOpen(false) // Close sidebar after creating new conversation
  }

  const toggleSidebar = () => {
    setIsOpen(!isOpen)
  }

  return (
    <>
      {/* Small White Toggle Button */}
      <div className="md:hidden fixed left-0 top-1/2 transform -translate-y-1/2 z-50">
        <Button
          onClick={toggleSidebar}
          className="h-8 w-6 rounded-r-lg bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 shadow-md transition-all duration-200 hover:scale-105"
          size="icon"
        >
          {isOpen ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          <span className="sr-only">
            {isOpen ? "サイドバーを閉じる" : "サイドバーを開く"}
          </span>
        </Button>
      </div>

      {/* Sidebar Sheet */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent 
          side="left" 
          className="w-80 p-0 border-l-0 rounded-r-2xl shadow-2xl [&>button]:hidden"
        >
          <ChatSidebar
            service={service}
            currentConversationId={currentConversationId}
            onConversationSelect={handleConversationSelect}
            onNewConversation={handleNewConversation}
            className="h-full rounded-r-2xl"
          />
        </SheetContent>
      </Sheet>
    </>
  )
}
