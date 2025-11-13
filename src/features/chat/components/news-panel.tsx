"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Skeleton } from "@/components/ui/skeleton"
import { apiClient } from "@/lib/api"
import { CalendarIcon, ExternalLink, Sparkles, Newspaper, AlertCircle } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { NEWS_CATEGORY_LABELS_JA, type NewsCategory } from "../../../../shared/news-categories"

type NewsItem = {
  category: NewsCategory
  title: string
  description: string
  link: string
  pubDate?: string
  source: string
  newsDate: string
}

export function NewsPanel() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [news, setNews] = useState<NewsItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchNews = async (date: Date) => {
    setIsLoading(true)
    setError(null)
    try {
      const dateStr = format(date, "yyyy-MM-dd")
      const response = await apiClient.news.getNews(dateStr)
      setNews(response.items || [])
    } catch (err: any) {
      console.error("Failed to fetch news:", err)
      setError("ニュースの取得に失敗しました")
      setNews([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchNews(selectedDate)
  }, [selectedDate])

  const dateStr = format(selectedDate, "yyyy年MM月dd日")

  return (
    <Card className="relative overflow-hidden border-2 border-execuwell/20 bg-gradient-to-br from-card via-card to-card/95 backdrop-blur-sm transition-all duration-300 hover:border-execuwell/40 hover:shadow-xl hover:shadow-execuwell/20">
      {/* Decorative gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-execuwell/5 via-transparent to-accent/5 pointer-events-none" />
      {/* Subtle shine effect on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      
      <CardHeader className="relative border-b border-execuwell/10 pb-3">
        <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-execuwell to-accent shadow-md transition-transform duration-300 hover:scale-110 hover:shadow-lg">
              <Sparkles className="h-4 w-4 text-execuwell-foreground animate-pulse" />
            </div>
            <CardTitle className="text-base font-semibold bg-gradient-to-r from-execuwell via-execuwell to-accent bg-clip-text text-transparent">
              今日のニュース
            </CardTitle>
        </div>
        <div className="flex items-center justify-between">
          
          {/* Date Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-8 w-auto gap-2 border-execuwell/20 text-xs hover:bg-execuwell/10 hover:border-execuwell/40 transition-all duration-300",
                  "focus-visible:ring-execuwell/20 hover:shadow-sm hover:scale-105 active:scale-100"
                )}
              >
                <CalendarIcon className="h-3.5 w-3.5 text-execuwell transition-transform group-hover:rotate-12" />
                <span className="text-execuwell font-medium">{dateStr}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                initialFocus
                className="rounded-md"
              />
            </PopoverContent>
          </Popover>
        </div>
      </CardHeader>

      <CardContent className="relative pt-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-3 p-3 rounded-lg border border-border/50">
                <div className="flex items-start justify-between gap-2">
                  <Skeleton className="h-4 w-16 rounded-md" />
                  <Skeleton className="h-3 w-12 rounded-md" />
                </div>
                <Skeleton className="h-4 w-full rounded-md" />
                <Skeleton className="h-3 w-5/6 rounded-md" />
                <Skeleton className="h-3 w-4/6 rounded-md" />
                <Skeleton className="h-2.5 w-20 rounded-md mt-1" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 mb-4">
              <AlertCircle className="h-8 w-8 text-destructive/60" />
            </div>
            <p className="text-sm font-medium text-muted-foreground mb-3">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchNews(selectedDate)}
              className="border-execuwell/20 hover:bg-execuwell/10 hover:border-execuwell/40 transition-all"
            >
              再試行
            </Button>
          </div>
        ) : news.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-execuwell/10 to-accent/10 mb-4">
              <Newspaper className="h-8 w-8 text-execuwell/50" />
            </div>
            <p className="text-sm font-medium text-muted-foreground mb-1">
              ニュースなし
            </p>
            <p className="text-xs text-muted-foreground/70 text-center max-w-[200px]">
              選択された日付にはニュースがアーカイブされていません
            </p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            {news.map((item, index) => (
              <div
                key={index}
                className={cn(
                  "group relative rounded-lg border border-border/50 bg-gradient-to-br from-background/50 to-background/30 p-3.5 transition-all duration-300",
                  "hover:border-execuwell/40 hover:bg-gradient-to-br hover:from-execuwell/5 hover:to-accent/5 hover:shadow-md hover:shadow-execuwell/10",
                  "before:absolute before:left-0 before:top-3.5 before:h-3 before:w-1 before:rounded-r-full before:bg-gradient-to-b before:from-execuwell before:to-accent before:opacity-0 before:transition-all before:duration-300",
                  "group-hover:before:opacity-100 group-hover:-translate-y-0.5"
                )}
              >
                {/* Source badge */}
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-execuwell/10 text-[10px] font-medium text-execuwell border border-execuwell/20 transition-all duration-300 group-hover:bg-execuwell/15 group-hover:border-execuwell/30 group-hover:shadow-sm">
                    {item.source}
                  </span>
                  {item.category && (
                    <span className="text-[10px] text-muted-foreground/70 tracking-wider">
                      {NEWS_CATEGORY_LABELS_JA[item.category] ?? item.category.toUpperCase()}
                    </span>
                  )}
                </div>

                {/* Title */}
                <h4 className="text-sm font-semibold text-foreground mb-2 leading-snug group-hover:text-execuwell transition-colors duration-300 line-clamp-2">
                  {item.title}
                </h4>

                {/* Description */}
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 mb-3 group-hover:text-muted-foreground/90 transition-colors">
                  {item.description}
                </p>

                {/* Link */}
                {item.link && (
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] text-execuwell hover:text-execuwell/80 font-medium transition-colors group/link"
                  >
                    <span>詳細を見る</span>
                    <ExternalLink className="h-2.5 w-2.5 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                  </a>
                )}

                {/* Separator period (except for last item) */}
                {index < news.length - 1 && (
                  <div className="flex items-center justify-center mt-5 mb-1">
                    <div className="h-2 w-2 rounded-full bg-gradient-to-br from-execuwell/40 to-accent/40 shadow-sm transition-all duration-300 hover:scale-125" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

