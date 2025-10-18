import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Activity, Briefcase } from "lucide-react"

type ChatMessageProps = {
  role: "user" | "assistant"
  content: string
  kind?: "TEXT" | "VOICE" | "IMAGE"
  timestamp?: string
  userName?: string
  service?: "vitaai" | "execuwell"
}

export function ChatMessage({ role, content, kind = "TEXT", timestamp, userName, service = "vitaai" }: ChatMessageProps) {
  const isUser = role === "user"
  const Icon = service === "vitaai" ? Activity : Briefcase

  return (
    <div className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <Avatar className="h-8 w-8 ring-2 ring-blue-200">
          <AvatarFallback className="bg-gradient-to-r from-blue-100 to-purple-100">
            <Icon className="h-4 w-4 text-blue-600" />
          </AvatarFallback>
        </Avatar>
      )}
      <div className={cn("flex max-w-[80%] flex-col gap-1", isUser && "items-end")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-3 shadow-sm",
            isUser 
              ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-blue-200" 
              : "bg-gradient-to-r from-gray-50 to-blue-50 text-gray-800 border border-blue-100",
          )}
        >
          {kind === "VOICE" ? (
            <audio src={`/backend/${content}`} controls className="max-w-full" />
          ) : (
            <p className="text-sm leading-relaxed">{content}</p>
          )}
        </div>
        {timestamp && <span className="text-xs text-blue-500/70 font-medium">{timestamp}</span>}
      </div>
      {isUser && (
        <Avatar className="h-8 w-8 ring-2 ring-emerald-200">
          <AvatarFallback className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
            {userName?.charAt(0).toUpperCase() || "U"}
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  )
}
