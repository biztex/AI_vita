"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { useAuth } from "@/lib/auth-context"
import { Loader2, Upload, CheckCircle2, Clock } from "lucide-react"

// Profile form schema
const profileSchema = z.object({
  name: z.string().min(2, "名前は2文字以上である必要があります"),
  email: z.string().email("有効なメールアドレスを入力してください"),
  company: z.string().optional(),
  position: z.string().optional(),
  birthDate: z.string().optional(),
})

type ProfileFormData = z.infer<typeof profileSchema>

function ProfileContent() {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState({
    genetic: { uploaded: true, date: "2024-01-15" },
    personality: { uploaded: false, date: null },
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      company: user?.company || "",
      position: "",
      birthDate: "",
    },
  })

  const onSubmit = async (data: ProfileFormData) => {
    setIsLoading(true)
    // Mock API call
    await new Promise((resolve) => setTimeout(resolve, 1000))
    console.log("[v0] Profile update:", data)
    setIsLoading(false)
  }

  const handleFileUpload = (type: "genetic" | "personality") => {
    // Mock file upload
    console.log("[v0] Uploading", type, "file")
    setUploadStatus((prev) => ({
      ...prev,
      [type]: { uploaded: true, date: new Date().toISOString().split("T")[0] },
    }))
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="mb-2 text-4xl font-bold">プロフィール</h1>
        <p className="text-lg text-muted-foreground">アカウント情報と診断データを管理</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left Column - Profile Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>個人情報</CardTitle>
              <CardDescription>プロフィール詳細を更新</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Avatar */}
                <div className="flex items-center space-x-4">
                  <Avatar className="h-20 w-20">
                    <AvatarFallback className="bg-primary text-2xl text-primary-foreground">
                      {user?.name?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">プロフィール画像</p>
                    <Button variant="outline" size="sm" className="mt-2 bg-transparent">
                      アバター変更
                    </Button>
                  </div>
                </div>

                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">氏名</Label>
                  <Input id="name" {...register("name")} aria-invalid={errors.name ? "true" : "false"} />
                  {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">メールアドレス</Label>
                  <Input
                    id="email"
                    type="email"
                    {...register("email")}
                    aria-invalid={errors.email ? "true" : "false"}
                  />
                  {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
                </div>

                {/* Company */}
                <div className="space-y-2">
                  <Label htmlFor="company">会社名</Label>
                  <Input id="company" {...register("company")} />
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

                {/* Subscription Badge */}
                {user?.subscription && (
                  <div className="rounded-lg border border-primary/50 bg-primary/5 p-4">
                    <p className="text-sm font-medium text-muted-foreground">サブスクリプションタイプ</p>
                    <p className="text-lg font-bold capitalize">{user.subscription}</p>
                  </div>
                )}

                {/* Submit Button */}
                <Button type="submit" disabled={isLoading}>
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
              <p className="mt-6 text-xs text-muted-foreground">最終更新: 今日 10:30</p>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Diagnosis Status */}
        <div className="space-y-6">
          {/* Genetic Results */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">遺伝子検査結果</CardTitle>
              <CardDescription>遺伝子検査結果をアップロード</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {uploadStatus.genetic.uploaded ? (
                <div className="flex items-start space-x-3 rounded-lg bg-green-500/10 p-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">アップロード済み</p>
                    <p className="text-xs text-muted-foreground">日付: {uploadStatus.genetic.date}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start space-x-3 rounded-lg bg-muted/50 p-3">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">保留中</p>
                    <p className="text-xs text-muted-foreground">ファイル未アップロード</p>
                  </div>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                className="w-full bg-transparent"
                onClick={() => handleFileUpload("genetic")}
              >
                <Upload className="mr-2 h-4 w-4" />
                {uploadStatus.genetic.uploaded ? "再アップロード" : "アップロード"}
              </Button>
              <p className="text-xs text-muted-foreground">対応形式: PDF、PNG、JPG（最大10MB）</p>
            </CardContent>
          </Card>

          {/* Personality/Strengths */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">性格・強み診断</CardTitle>
              <CardDescription>性格診断結果をアップロード</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {uploadStatus.personality.uploaded ? (
                <div className="flex items-start space-x-3 rounded-lg bg-green-500/10 p-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">アップロード済み</p>
                    <p className="text-xs text-muted-foreground">日付: {uploadStatus.personality.date}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start space-x-3 rounded-lg bg-muted/50 p-3">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">保留中</p>
                    <p className="text-xs text-muted-foreground">ファイル未アップロード</p>
                  </div>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                className="w-full bg-transparent"
                onClick={() => handleFileUpload("personality")}
              >
                <Upload className="mr-2 h-4 w-4" />
                {uploadStatus.personality.uploaded ? "再アップロード" : "アップロード"}
              </Button>
              <p className="text-xs text-muted-foreground">対応形式: PDF、PNG、JPG（最大10MB）</p>
            </CardContent>
          </Card>
        </div>
      </div>
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
