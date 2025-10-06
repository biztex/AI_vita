import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Activity, Briefcase } from "lucide-react"

type ChatMessageProps = {
  role: "user" | "assistant"
  content: string
  timestamp?: string
  userName?: string
  service?: "vitaai" | "execuwell"
}

export function ChatMessage({ role, content, timestamp, userName, service = "vitaai" }: ChatMessageProps) {
  const isUser = role === "user"
  const Icon = service === "vitaai" ? Activity : Briefcase

  return (
    <div className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-primary/10">
            <Icon className="h-4 w-4 text-primary" />
          </AvatarFallback>
        </Avatar>
      )}
      <div className={cn("flex max-w-[80%] flex-col gap-1", isUser && "items-end")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-3",
            isUser ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
          )}
        >
          <p className="text-sm leading-relaxed">{content}</p>
        </div>
        {timestamp && <span className="text-xs text-muted-foreground">{timestamp}</span>}
      </div>
      {isUser && (
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-primary text-primary-foreground">
            {userName?.charAt(0).toUpperCase() || "U"}
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  )
}
