"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu } from "lucide-react"
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

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="md:hidden"
        >
          <Menu className="w-4 h-4" />
          <span className="sr-only">Open chat history</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 p-0">
        <ChatSidebar
          service={service}
          currentConversationId={currentConversationId}
          onConversationSelect={handleConversationSelect}
          onNewConversation={handleNewConversation}
          className="h-full"
        />
      </SheetContent>
    </Sheet>
  )
}
