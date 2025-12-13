"use client"

import { useState, useEffect, useRef } from "react"
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
import { Loader2, Upload, CheckCircle2, Clock, CreditCard, Calendar, X, Camera, Crown, Brain, Activity } from "lucide-react"
import { toast } from "react-toastify"

// Profile form schema
const profileSchema = z.object({
  fullName: z.string().min(2, "名前は2文字以上である必要があります"),
  company: z.string().optional(),
  position: z.string().optional(),
  birthDate: z.string().optional(),
})

type ProfileFormData = z.infer<typeof profileSchema>

function ProfileContent() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState("basic")
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [subscriptionData, setSubscriptionData] = useState<any>(null)
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(true)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load profile data
  useEffect(() => {
    loadProfile()
    loadSubscription()
  }, [])

  const loadProfile = async () => {
    try {
      setIsLoadingProfile(true)
      const response = await apiClient.profile.get()
      setProfile(response.profile)
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
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: "",
      company: "",
      position: "",
      birthDate: "",
    },
  })

  // Reset form when profile loads
  useEffect(() => {
    if (profile) {
      reset({
        fullName: profile.fullName || user?.name || "",
        company: profile.company || user?.company || "",
        position: profile.position || "",
        birthDate: profile.birthDate ? new Date(profile.birthDate).toISOString().split("T")[0] : "",
      })
    }
  }, [profile, user, reset])

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
      // Update profile
      await apiClient.profile.update({
        fullName: data.fullName,
        company: data.company,
        position: data.position,
        birthDate: data.birthDate,
      })

      // TODO: Upload avatar if selected
      if (avatarFile) {
        // Implement avatar upload logic here
        console.log("Avatar upload:", avatarFile)
      }

      await loadProfile()
      toast.success("プロフィールを更新しました", {
        position: "top-right",
        autoClose: 3000,
      })
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
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="basic">基本情報</TabsTrigger>
          <TabsTrigger value="billing">請求・サブスクリプション</TabsTrigger>
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
                      className="h-24 w-24 cursor-pointer ring-2 ring-primary/20 hover:ring-primary/40 transition-all duration-300 hover:scale-105"
                      onClick={handleAvatarClick}
                    >
                      {avatarPreview ? (
                        <AvatarImage src={avatarPreview} alt="Avatar preview" />
                      ) : (
                        <AvatarFallback className="bg-gradient-to-r from-primary to-accent text-3xl text-primary-foreground">
                          {profile?.fullName?.charAt(0).toUpperCase() || user?.name?.charAt(0).toUpperCase() || "U"}
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

                {/* Position */}
                <div className="space-y-2">
                  <Label htmlFor="position">役職</Label>
                  <Input id="position" placeholder="CEO、CTOなど" {...register("position")} />
                </div>

                {/* Birth Date */}
                <div className="space-y-2">
                  <Label htmlFor="birthDate">生年月日</Label>
                  <Input id="birthDate" type="date" {...register("birthDate")} />
                </div>

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
