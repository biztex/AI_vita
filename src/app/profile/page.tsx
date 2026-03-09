"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ProtectedRoute } from "@/features/auth/components/protected-route"
import { useAuth } from "@/lib/auth-context"
import { apiClient } from "@/lib/api"
import { Loader2, Upload, CheckCircle2, Clock, CreditCard, Calendar, X, Camera, Crown, Brain, Activity, ChevronDown, CheckIcon, ClipboardCheck, MessageSquare, Link2, Unlink, Bell, BellOff } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { toast } from "react-toastify"
import { NEWS_CATEGORIES, NEWS_CATEGORY_LABELS_JA, type NewsCategory } from "../../../shared/news-categories"
import { DiagnosticResultsCard } from "@/features/diagnostic/components/diagnostic-results-card"
import type { DiagnosticResult } from "@/lib/diagnostic/scoring"

const LINE_FRIEND_URL = process.env.NEXT_PUBLIC_LINE_FRIEND_URL || "https://line.me/R/ti/p/@389rupfv"

const CATEGORY_OPTIONS: Array<{ value: NewsCategory; label: string }> = NEWS_CATEGORIES.map((category) => ({
  value: category,
  label: NEWS_CATEGORY_LABELS_JA[category] ?? category,
}))

// Profile form schema
const profileSchema = z.object({
  fullName: z.string().min(2, "名前は2文字以上である必要があります"),
  company: z.string().optional(),
  position: z.string().optional(),
  industries: z.array(z.string()).optional(),
})

type ProfileFormData = z.infer<typeof profileSchema>

function ProfileContent() {
  const { user, refreshUser } = useAuth()
  // Support ?tab=line URL param for deep linking from dashboard
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      const tab = params.get("tab")
      if (tab && ["basic", "diagnostic", "line", "billing"].includes(tab)) return tab
    }
    return "basic"
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [userData, setUserData] = useState<{ 
    avatarPath: string | null; 
    email: string | null; 
    name: string | null;
    industries: string[];
  } | null>(null)
  const [subscriptionData, setSubscriptionData] = useState<any>(null)
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(true)
  const [diagnosticResult, setDiagnosticResult] = useState<DiagnosticResult | null>(null)
  const [isLoadingDiagnostic, setIsLoadingDiagnostic] = useState(true)
  // LINE link state
  const [lineStatus, setLineStatus] = useState<{
    linked: boolean
    lineUserId: string | null
    userMode: string | null
    morningPushEnabled: boolean
  } | null>(null)
  const [isLoadingLine, setIsLoadingLine] = useState(true)
  const [linkInput, setLinkInput] = useState("")
  const [isLinking, setIsLinking] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Load profile data
  useEffect(() => {
    loadProfile()
    loadSubscription()
    loadDiagnostic()
    loadLineStatus()
  }, [])

  const loadLineStatus = async () => {
    try {
      setIsLoadingLine(true)
      const data = await apiClient.line.getStatus()
      setLineStatus(data)
    } catch (error) {
      console.error("Failed to load LINE status:", error)
    } finally {
      setIsLoadingLine(false)
    }
  }

  // Modern LINE Login (OAuth) - replaces manual input
  const handleLineLoginStart = async () => {
    setIsLinking(true)
    try {
      // Generate random state for CSRF protection
      const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
      sessionStorage.setItem("line_login_state", state)

      // Get LINE Login URL from backend
      const { url } = await apiClient.line.getLoginUrl(state)

      // Redirect user to LINE Login
      window.location.href = url
    } catch (error: any) {
      toast.error(error?.message || "LINE Login URL取得に失敗しました", { position: "top-right", autoClose: 5000 })
      setIsLinking(false)
    }
  }

  // Legacy manual linking (kept for backward compatibility, but hidden by default)
  const handleLineLink = async () => {
    if (!linkInput.trim()) return
    setIsLinking(true)
    try {
      await apiClient.line.link(linkInput.trim())
      toast.success("LINEアカウントを連携しました", { position: "top-right", autoClose: 3000 })
      setLinkInput("")
      await loadLineStatus()
    } catch (error: any) {
      toast.error(error?.message || "LINE連携に失敗しました", { position: "top-right", autoClose: 5000 })
    } finally {
      setIsLinking(false)
    }
  }

  const handleLineUnlink = async () => {
    try {
      await apiClient.line.unlink()
      toast.success("LINE連携を解除しました", { position: "top-right", autoClose: 3000 })
      await loadLineStatus()
    } catch (error: any) {
      toast.error(error?.message || "解除に失敗しました", { position: "top-right", autoClose: 5000 })
    }
  }

  const handleToggleMorningPush = async (enabled: boolean) => {
    try {
      const resp = await apiClient.line.toggleMorningPush(enabled)
      setLineStatus((prev) => prev ? { ...prev, morningPushEnabled: resp.morningPushEnabled } : prev)
      toast.success(enabled ? "朝のメッセージを有効にしました" : "朝のメッセージを無効にしました", {
        position: "top-right",
        autoClose: 2000,
      })
    } catch (error: any) {
      toast.error("設定の更新に失敗しました", { position: "top-right", autoClose: 3000 })
    }
  }

  const loadDiagnostic = async () => {
    try {
      setIsLoadingDiagnostic(true)
      const data = await apiClient.diagnostic.get()
      if (data.result) {
        setDiagnosticResult({
          mbtiType: data.result.mbtiType || "",
          mbtiLabel: data.result.mbtiLabel || "",
          discType: data.result.discType || "",
          discLabel: data.result.discLabel || "",
          enneagramTop3: data.result.enneagramTop3 || [],
          cognitiveTrend: data.result.cognitiveTrend || "",
          summary: data.result.summary || "",
        })
      }
    } catch (error) {
      console.error("Failed to load diagnostic:", error)
    } finally {
      setIsLoadingDiagnostic(false)
    }
  }

  const loadProfile = async () => {
    try {
      setIsLoadingProfile(true)
      const response = await apiClient.profile.get()
      setProfile(response.profile)
      setUserData(response.user || null)
      
      // Set avatar preview if user has avatarPath
      if (response.user?.avatarPath) {
        // Construct full URL to avatar
        const avatarUrl = `${process.env.NEXT_PUBLIC_API_URL || 'https://execuwell.jp/api'}${response.user.avatarPath}`
        setAvatarPreview(avatarUrl)
      }
    } catch (error) {
      console.error("Failed to load profile:", error)
      toast.error("プロフィールの読み込みに失敗しました", {
        position: "top-right",
        autoClose: 3000,
      })
    } finally {
      setIsLoadingProfile(false)
    }
  }

  const loadSubscription = async () => {
    try {
      setIsLoadingSubscription(true)
      const data = await apiClient.stripe.getSubscription()
      setSubscriptionData(data)
    } catch (error) {
      console.error("Failed to load subscription:", error)
    } finally {
      setIsLoadingSubscription(false)
    }
  }

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: "",
      company: "",
      position: "",
      industries: [],
    },
  })

  const selectedIndustries = watch("industries") || []

  // Reset form when profile loads
  useEffect(() => {
    if (profile || userData) {
      reset({
        fullName: profile?.fullName || userData?.name || user?.name || "",
        company: profile?.company || user?.company || "",
        position: profile?.position || "",
        industries: userData?.industries || [],
      })
    }
  }, [profile, userData, user, reset])

  const handleIndustryToggle = (category: string) => {
    const current = selectedIndustries || []
    if (current.includes(category)) {
      setValue("industries", current.filter((ind) => ind !== category))
    } else {
      setValue("industries", [...current, category])
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
        setSearchQuery("")
      }
    }

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isDropdownOpen])

  // Filter categories based on search
  const filteredCategories = CATEGORY_OPTIONS.filter((category) =>
    category.label.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast.error("画像ファイルを選択してください", {
          position: "top-right",
          autoClose: 3000,
        })
        return
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("画像サイズは5MB以下にしてください", {
          position: "top-right",
          autoClose: 3000,
        })
        return
      }

      setAvatarFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveAvatar = () => {
    setAvatarFile(null)
    setAvatarPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const onSubmit = async (data: ProfileFormData) => {
    setIsLoading(true)
    try {
      // Update profile with FormData (includes avatar if selected)
      const result = await apiClient.profile.update({
        fullName: data.fullName,
        company: data.company,
        position: data.position,
        industries: data.industries,
        avatar: avatarFile || undefined,
      })

      // Update avatar preview if new avatar was uploaded
      if (result.avatarPath) {
        const avatarUrl = `${process.env.NEXT_PUBLIC_API_URL || 'https://execuwell.jp/api'}${result.avatarPath}`
        setAvatarPreview(avatarUrl)
      }

      await loadProfile()
      
      // Refresh user data in auth context to update header avatar
      if (refreshUser) {
        await refreshUser()
      }
      
      toast.success("プロフィールを更新しました", {
        position: "top-right",
        autoClose: 3000,
      })
      
      // Clear file input after successful upload
      setAvatarFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    } catch (error: any) {
      console.error("Failed to update profile:", error)
      toast.error(error?.response?.data?.error || "プロフィールの更新に失敗しました", {
        position: "top-right",
        autoClose: 5000,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleManageBilling = async () => {
    try {
      const response = await apiClient.stripe.createPortalSession()
      if (response.url) {
        window.location.href = response.url
      }
    } catch (error: any) {
      console.error("Portal session error:", error)
      toast.error(error?.response?.data?.error || "請求管理ページの作成に失敗しました", {
        position: "top-right",
        autoClose: 5000,
      })
    }
  }

  const handleCancelSubscription = async () => {
    if (!subscriptionData?.subscription?.stripeSubscriptionId) return

    if (!confirm("本当にサブスクリプションをキャンセルしますか？現在の期間終了時にキャンセルされます。")) {
      return
    }

    try {
      await apiClient.stripe.cancelSubscription(subscriptionData.subscription.stripeSubscriptionId)
      toast.success("サブスクリプションは現在の期間終了時にキャンセルされます", {
        position: "top-right",
        autoClose: 5000,
      })
      await loadSubscription()
    } catch (error: any) {
      console.error("Cancel subscription error:", error)
      toast.error(error?.response?.data?.error || "サブスクリプションのキャンセルに失敗しました", {
        position: "top-right",
        autoClose: 5000,
      })
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "未設定"
    return new Date(dateString).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const getSubscriptionTypeLabel = (type: string) => {
    switch (type) {
      case "VITAAI":
        return "VitaAI"
      case "EXECUWELL":
        return "ExecuWell"
      case "INTEGRATED":
        return "統合プラン"
      default:
        return type
    }
  }

  const getSubscriptionIcon = (type: string) => {
    switch (type) {
      case "VITAAI":
        return <Activity className="w-5 h-5 text-[#00d1b2]" />
      case "EXECUWELL":
        return <Brain className="w-5 h-5 text-[#7c3aed]" />
      case "INTEGRATED":
        return <Crown className="w-5 h-5 text-[#FFD700]" />
      default:
        return <CreditCard className="w-5 h-5" />
    }
  }

  if (isLoadingProfile) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-8 py-12 max-w-4xl">
      <div className="mb-8">
        <h1 className="mb-2 text-4xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
          プロフィール
        </h1>
        <p className="text-lg text-muted-foreground">アカウント情報とサブスクリプションを管理</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
          <TabsTrigger value="basic">基本情報</TabsTrigger>
          <TabsTrigger value="diagnostic" className="gap-1.5">
            <ClipboardCheck className="w-4 h-4" />
            診断結果
          </TabsTrigger>
          <TabsTrigger value="line" className="gap-1.5">
            <MessageSquare className="w-4 h-4" />
            LINE連携
          </TabsTrigger>
          <TabsTrigger value="billing">サブスクリプション</TabsTrigger>
        </TabsList>

        {/* Basic Information Tab */}
        <TabsContent value="basic" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>個人情報</CardTitle>
              <CardDescription>プロフィール詳細を更新</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Avatar Section */}
                <div className="flex items-center space-x-6 mx-auto">
                  <div className="relative group">
                    <Avatar 
                      className="h-24 w-24 cursor-pointer ring-2 ring-primary/20 hover:ring-primary/40 transition-all duration-300"
                      onClick={handleAvatarClick}
                    >
                      {avatarPreview ? (
                        <AvatarImage src={avatarPreview} alt="Avatar preview" />
                      ) : (
                        <AvatarFallback className="bg-gradient-to-r from-primary to-accent text-3xl text-primary-foreground">
                          {profile?.fullName?.charAt(0).toUpperCase() || userData?.name?.charAt(0).toUpperCase() || user?.name?.charAt(0).toUpperCase() || "ユ"}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div 
                      className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-full flex items-center justify-center cursor-pointer pointer-events-none"
                      onClick={handleAvatarClick}
                    >
                      <Camera className="w-6 h-6 text-white" />
                    </div>
                    {avatarPreview && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemoveAvatar()
                        }}
                        className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90 transition-colors z-10"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="flex-1">
                    <Label className="text-base font-medium">プロフィール画像</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      画像をクリックして変更
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      JPG、PNG、GIF形式（最大5MB）
                    </p>
                  </div>
                </div>

                {/* Full Name */}
                <div className="space-y-2">
                  <Label htmlFor="fullName">氏名 *</Label>
                  <Input 
                    id="fullName" 
                    {...register("fullName")} 
                    aria-invalid={errors.fullName ? "true" : "false"} 
                  />
                  {errors.fullName && <p className="text-sm text-destructive">{errors.fullName.message}</p>}
                </div>

                {/* Company */}
                <div className="space-y-2">
                  <Label htmlFor="company">会社名</Label>
                  <Input id="company" {...register("company")} placeholder="株式会社サンプル" />
                </div>

                {/* Industries - Editable */}
                <div className="space-y-2">
                  <Label>業界・関心分野</Label>
                  <div className="relative" ref={dropdownRef}>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="w-full justify-between hover:bg-secondary/80"
                    >
                      <span className="truncate">
                        {selectedIndustries.length > 0
                          ? `${selectedIndustries.length}個選択中`
                          : "業界を選択してください"}
                      </span>
                      <ChevronDown className={`ml-2 h-4 w-4 shrink-0 opacity-50 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
                    </Button>
                    
                    {isDropdownOpen && (
                      <div className="absolute z-50 w-full mt-2 bg-card border border-border rounded-md shadow-lg">
                        <div className="p-2 border-b border-border">
                          <Input
                            type="text"
                            placeholder="業界を検索..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-9"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        <div className="max-h-[300px] overflow-y-auto p-1">
                          {filteredCategories.length > 0 ? (
                            filteredCategories.map((category) => {
                              const isSelected = selectedIndustries.includes(category.value)
                              return (
                                <div
                                  key={category.value}
                                  onClick={() => handleIndustryToggle(category.value)}
                                  className="flex items-center space-x-2 w-full px-2 py-2 cursor-pointer rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                                >
                                  <div
                                    className={`flex h-4 w-4 items-center justify-center rounded-sm border ${
                                      isSelected
                                        ? "bg-primary text-primary-foreground border-primary"
                                        : "border-input"
                                    }`}
                                  >
                                    {isSelected && (
                                      <CheckIcon className="h-3 w-3" />
                                    )}
                                  </div>
                                  <span className="text-sm">{category.label}</span>
                                </div>
                              )
                            })
                          ) : (
                            <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                              結果が見つかりません
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  {selectedIndustries.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedIndustries.map((industry) => {
                        const label = CATEGORY_OPTIONS.find((opt) => opt.value === industry)?.label || industry
                        return (
                          <Badge key={industry} variant="secondary" className="capitalize">
                            {label}
                          </Badge>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Position */}
                {/* <div className="space-y-2">
                  <Label htmlFor="position">役職</Label>
                  <Input id="position" placeholder="CEO、CTOなど" {...register("position")} />
                </div> */}

                {/* Email (read-only) */}
                <div className="space-y-2">
                  <Label htmlFor="email">メールアドレス</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={user?.email || ""} 
                    disabled 
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">メールアドレスは変更できません</p>
                </div>

                {/* Submit Button */}
                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      保存中...
                    </>
                  ) : (
                    "変更を保存"
                  )}
                </Button>
              </form>

              {/* Last Updated */}
              {profile?.updatedAt && (
                <p className="mt-6 text-xs text-muted-foreground">
                  最終更新: {new Date(profile.updatedAt).toLocaleString("ja-JP")}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Diagnostic Tab */}
        <TabsContent value="diagnostic" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-primary" />
                MyAI パーソナル診断結果
              </CardTitle>
              <CardDescription>
                MBTI・DISC・エニアグラムを統合したあなたのプロファイル
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingDiagnostic ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : diagnosticResult ? (
                <DiagnosticResultsCard result={diagnosticResult} />
              ) : (
                <div className="text-center py-12">
                  <ClipboardCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">
                    まだ診断を受けていません
                  </p>
                  <p className="text-sm text-muted-foreground mb-6">
                    ダッシュボードから21問の診断を受けて、あなた専用のプロファイルを作成しましょう
                  </p>
                  <Button asChild>
                    <a href="/dashboard">ダッシュボードへ</a>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* LINE Integration Tab */}
        <TabsContent value="line" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-green-600" />
                LINE連携
              </CardTitle>
              <CardDescription>
                LINEアカウントを連携して、MyAIとLINE上で会話したり朝のニュース配信を受け取れます
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isLoadingLine ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : lineStatus?.linked ? (
                <>
                  {/* Connected status */}
                  <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-800 p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                        <Link2 className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-green-700 dark:text-green-400">LINE連携済み</p>
                        <p className="text-sm text-muted-foreground">
                          モード: {lineStatus.userMode === "VITAAI" ? "VitaAI" : "ExecuWell"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Morning push toggle */}
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="flex items-center gap-3">
                      {lineStatus.morningPushEnabled ? (
                        <Bell className="w-5 h-5 text-amber-500" />
                      ) : (
                        <BellOff className="w-5 h-5 text-muted-foreground" />
                      )}
                      <div>
                        <p className="font-medium">朝の一言メッセージ</p>
                        <p className="text-sm text-muted-foreground">
                          毎朝MyAIからニュース要約をLINEで受信
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={lineStatus.morningPushEnabled}
                      onCheckedChange={handleToggleMorningPush}
                    />
                  </div>

                  {/* Unlink button */}
                  <Button
                    variant="outline"
                    className="text-destructive border-destructive/50 hover:bg-destructive/10"
                    onClick={handleLineUnlink}
                  >
                    <Unlink className="w-4 h-4 mr-2" />
                    LINE連携を解除
                  </Button>
                </>
              ) : (
                <>
                  {/* Not connected – friend add + modern LINE Login flow */}
                  <div className="text-center py-4">
                    <p className="text-muted-foreground mb-2">
                      Webアカウントとの連携がまだ完了していません
                    </p>
                    <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                      LINEログインで連携すると、あなたの診断結果やプロフィールに基づいたパーソナルな応答が可能になります
                    </p>
                  </div>

                  {/* Friend Add QR + Link */}
                  <div className="flex flex-col items-center gap-3 mb-6">
                    <p className="font-medium">① 公式LINEを友だち追加</p>

                    <div className="rounded-xl shadow-sm p-4 border max-w-xs w-full flex flex-col items-center">
                      <div className="relative w-48 h-48 mb-3">
                        <Image
                          src="/line-friend-qr.png"
                          alt="ExecuWell / VitaAI 公式LINE 友だち追加用QRコード"
                          fill
                          className="object-contain rounded-md"
                        />
                      </div>

                      <a
                        href={LINE_FRIEND_URL}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-medium text-[#06C755] underline"
                      >
                        友だち追加ページを開く
                      </a>

                      <p className="mt-2 text-xs text-muted-foreground text-center">
                        スマートフォンのカメラでQRコードを読み取るか、上のリンクからLINEアプリを開いて「追加」をタップしてください。
                      </p>
                    </div>
                  </div>

                  {/* LINE Login Button */}
                  <div className="flex justify-center">
                    <Button
                      onClick={handleLineLoginStart}
                      disabled={isLinking}
                      size="lg"
                      className="bg-[#06C755] hover:bg-[#05b34d] text-white font-medium px-8 py-6 rounded-lg shadow-lg transition-all hover:shadow-xl"
                    >
                      {isLinking ? (
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      ) : (
                        <Link2 className="w-5 h-5 mr-2" />
                      )}
                      ② LINEで連携する
                    </Button>
                  </div>

                  <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground mt-4 max-w-md mx-auto">
                    <p className="font-medium mb-2">連携の流れ：</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>① 上の「友だち追加」で公式LINEを追加</li>
                      <li>② 「LINEで連携する」ボタンでアカウント連携</li>
                      <li>完了後、LINEでMyAIとチャットできます</li>
                    </ol>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                サブスクリプション
              </CardTitle>
              <CardDescription>現在のプランと請求情報</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isLoadingSubscription ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : subscriptionData?.active && subscriptionData?.subscription ? (
                <>
                  {/* Current Subscription */}
                  <div className="rounded-lg border border-primary/50 bg-gradient-to-br from-primary/5 to-accent/5 p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {getSubscriptionIcon(subscriptionData.subscription.type)}
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">現在のプラン</p>
                          <p className="text-2xl font-bold">
                            {getSubscriptionTypeLabel(subscriptionData.subscription.type)}
                          </p>
                        </div>
                      </div>
                      <Badge 
                        variant={subscriptionData.subscription.status === "ACTIVE" ? "default" : "secondary"}
                        className="text-sm"
                      >
                        {subscriptionData.subscription.status === "ACTIVE" ? "アクティブ" : subscriptionData.subscription.status}
                      </Badge>
                    </div>

                    {/* Subscription Details */}
                    <div className="mt-4 space-y-2 text-sm">
                      {subscriptionData.subscription.currentPeriodStart && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          <span>
                            現在の期間: {formatDate(subscriptionData.subscription.currentPeriodStart)} 〜 {formatDate(subscriptionData.subscription.currentPeriodEnd)}
                          </span>
                        </div>
                      )}
                      {subscriptionData.subscription.cancelAtPeriodEnd && (
                        <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                          <Clock className="w-4 h-4" />
                          <span>現在の期間終了時にキャンセル予定</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      onClick={handleManageBilling}
                      variant="outline"
                      className="flex-1"
                    >
                      <CreditCard className="mr-2 h-4 w-4" />
                      請求を管理
                    </Button>
                    {!subscriptionData.subscription.cancelAtPeriodEnd && (
                      <Button
                        onClick={handleCancelSubscription}
                        variant="destructive"
                        className="flex-1"
                      >
                        サブスクリプションをキャンセル
                      </Button>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">アクティブなサブスクリプションがありません</p>
                  <Button asChild>
                    <a href="/subscription">プランを選択</a>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  )
}
