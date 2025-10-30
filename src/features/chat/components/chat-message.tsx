import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Activity, Briefcase, Bot, User, Volume2 } from "lucide-react"

type ChatMessageProps = {
  role: "user" | "assistant"
  content: string
  kind?: "TEXT" | "VOICE" | "IMAGE"
  voiceUrl?: string
  timestamp?: string
  userName?: string
  service?: "vitaai" | "execuwell"
}

export function ChatMessage({ role, content, kind = "TEXT", voiceUrl, timestamp, userName, service = "vitaai" }: ChatMessageProps) {
  const isUser = role === "user"
  const Icon = service === "vitaai" ? Activity : Briefcase

  return (
    <div className={cn("flex gap-4 group", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="flex flex-col items-center gap-2">
          <Avatar className="h-10 w-10 ring-2 ring-primary/20 hover:ring-primary/40 transition-all duration-300 group-hover:scale-105">
            <AvatarFallback className={cn(
              "bg-gradient-to-br shadow-lg",
              service === "vitaai" 
                ? "from-vitaai to-success text-vitaai-foreground" 
                : "from-execuwell to-accent text-execuwell-foreground"
            )}>
              <Icon className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Bot className="h-3 w-3" />
            <span className="font-medium">{service === "vitaai" ? "VitaAI" : "ExecuWell"}</span>
          </div>
        </div>
      )}
      
      <div className={cn("flex max-w-[80%] flex-col gap-2", isUser && "items-end")}>
        <div
          className={cn(
            "rounded-2xl px-5 py-4 shadow-sm transition-all duration-300 group-hover:shadow-md",
            kind === "VOICE" 
              ? "bg-transparent shadow-none" 
              : isUser 
                ? "bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-primary/20 hover:shadow-primary/30" 
                : cn(
                    "bg-gradient-to-r from-card to-card/80 text-card-foreground border border-border/50 hover:border-border/80",
                    service === "vitaai" 
                      ? "hover:shadow-vitaai/10" 
                      : "hover:shadow-execuwell/10"
                  ),
          )}
        >
          {kind === "VOICE" ? (
            <div className="space-y-3">
              {/* <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Volume2 className="h-4 w-4" />
                <span>音声メッセージ</span>
              </div> */}
              {
                voiceUrl && (
                  <audio 
                    controls
                    className="h-10"
                  >
                    <source src={`/backend${voiceUrl}`} type="audio/webm" />
                    {/* お使いのブラウザは音声の再生をサポートしていません。 */}
                  </audio>
                )
              }
              {/* Display transcribed text */}
              {/* <div className="prose prose-sm max-w-none">
                <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground/90">{content}</p>
              </div> */}
            </div>
          ) : (
            <div className="prose prose-sm max-w-none">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
            </div>
          )}
        </div>
        
        {timestamp && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">{timestamp}</span>
            {!isUser && (
              <div className="flex items-center gap-1">
                <div className="h-1.5 w-1.5 rounded-full bg-success animate-pulse"></div>
                <span className="text-xs text-success font-medium">AI</span>
              </div>
            )}
          </div>
        )}
      </div>
      
      {isUser && (
        <div className="flex flex-col items-center gap-2">
          <Avatar className="h-10 w-10 ring-2 ring-primary/20 hover:ring-primary/40 transition-all duration-300 group-hover:scale-105">
            <AvatarFallback className="bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold">
              {userName?.charAt(0).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            <span className="font-medium">あなた</span>
          </div>
        </div>
      )}
    </div>
  )
}
