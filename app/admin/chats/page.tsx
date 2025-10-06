"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, Eye } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type Conversation = {
  id: string
  userId: string
  userName: string
  service: "vitaai" | "execuwell"
  messageCount: number
  lastMessage: string
  date: string
}

const mockConversations: Conversation[] = [
  {
    id: "1",
    userId: "1",
    userName: "John Doe",
    service: "vitaai",
    messageCount: 15,
    lastMessage: "Thank you for the health recommendations!",
    date: "2024-02-10",
  },
  {
    id: "2",
    userId: "2",
    userName: "Jane Smith",
    service: "execuwell",
    messageCount: 8,
    lastMessage: "Can you provide more details on the market trends?",
    date: "2024-02-09",
  },
  {
    id: "3",
    userId: "1",
    userName: "John Doe",
    service: "execuwell",
    messageCount: 12,
    lastMessage: "What are the key indicators for Q1?",
    date: "2024-02-08",
  },
]

export default function AdminChatsPage() {
  const [conversations] = useState<Conversation[]>(mockConversations)
  const [searchQuery, setSearchQuery] = useState("")
  const [serviceFilter, setServiceFilter] = useState<string>("all")

  const filteredConversations = conversations.filter((conv) => {
    const matchesSearch = conv.userName.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesService = serviceFilter === "all" || conv.service === serviceFilter

    return matchesSearch && matchesService
  })

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">Chat Management</h1>
        <p className="text-muted-foreground">View and monitor user conversations</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Conversations</CardTitle>
          <div className="mt-4 flex flex-col gap-4 md:flex-row">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by user..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Service Filter */}
            <Select value={serviceFilter} onValueChange={setServiceFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by service" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Services</SelectItem>
                <SelectItem value="vitaai">VitaAI</SelectItem>
                <SelectItem value="execuwell">ExecuWell</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredConversations.map((conv) => (
              <Card key={conv.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{conv.userName}</p>
                        <Badge variant="outline" className="capitalize">
                          {conv.service}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{conv.lastMessage}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{conv.messageCount} messages</span>
                        <span>•</span>
                        <span>{conv.date}</span>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="bg-transparent">
                      <Eye className="mr-2 h-4 w-4" />
                      View
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredConversations.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">No conversations found. Try adjusting your filters.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
