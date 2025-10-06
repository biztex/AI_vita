"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/lib/auth-context"
import { registerSchema, type RegisterFormData } from "@/lib/validation"
import { Loader2, CheckCircle2, Mail } from "lucide-react"

export default function RegisterPage() {
  const router = useRouter()
  const { register: registerUser } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [userEmail, setUserEmail] = useState<string>("")

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true)
    setError(null)
    setSuccess(false)

    try {
      await registerUser({
        email: data.email,
        password: data.password,
        name: data.name,
        company: data.company,
      })
      setUserEmail(data.email)
      setSuccess(true)
    } catch (err: any) {
      setError(err.message || "登録に失敗しました。もう一度お試しください。")
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="container mx-auto flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
              <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl font-bold">アカウント作成完了</CardTitle>
            <CardDescription>
              アカウントが正常に作成されました。
              <br />
              メールアドレスを確認してください。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-800 dark:bg-blue-900/20 dark:text-blue-200">
              <div className="flex items-start space-x-3">
                <Mail className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <div>
                  <p className="font-medium">確認メールを送信しました</p>
                  <p className="mt-1">
                    <strong>{userEmail}</strong> に確認メールを送信しました。
                    <br />
                    メール内のリンクをクリックしてアカウントを有効化してください。
                  </p>
                </div>
              </div>
            </div>
            
            <div className="rounded-lg bg-yellow-50 p-4 text-sm text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200">
              <p className="font-medium">次の手順：</p>
              <ol className="mt-2 list-decimal list-inside space-y-1">
                <li>メールボックスを確認してください</li>
                <li>確認メール内のリンクをクリックしてください</li>
                <li>アカウントが有効化されたらログインできます</li>
              </ol>
            </div>
            
            <div className="flex flex-col space-y-2">
              <Button asChild className="w-full">
                <Link href="/auth/login">ログインページに移動</Link>
              </Button>
              <Button variant="outline" asChild className="w-full">
                <Link href="/">ホームに戻る</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">アカウント作成</CardTitle>
          <CardDescription>情報を入力して始めましょう</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">氏名</Label>
              <Input
                id="name"
                type="text"
                placeholder="山田太郎"
                {...register("name")}
                aria-invalid={errors.name ? "true" : "false"}
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">メールアドレス</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                {...register("email")}
                aria-invalid={errors.email ? "true" : "false"}
              />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>

            {/* Company (optional) */}
            <div className="space-y-2">
              <Label htmlFor="company">
                会社名 <span className="text-muted-foreground">(任意)</span>
              </Label>
              <Input
                id="company"
                type="text"
                placeholder="株式会社サンプル"
                {...register("company")}
                aria-invalid={errors.company ? "true" : "false"}
              />
              {errors.company && <p className="text-sm text-destructive">{errors.company.message}</p>}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">パスワード</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...register("password")}
                aria-invalid={errors.password ? "true" : "false"}
              />
              {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">パスワード確認</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                {...register("confirmPassword")}
                aria-invalid={errors.confirmPassword ? "true" : "false"}
              />
              {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>}
            </div>

            {/* Error message */}
            {error && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive" role="alert">
                {error}
              </div>
            )}

            {/* Submit button */}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  アカウント作成中...
                </>
              ) : (
                "アカウント作成"
              )}
            </Button>

            {/* Terms */}
            <p className="text-center text-xs text-muted-foreground">
              アカウントを作成することで、
              <Link href="/terms" className="underline hover:text-foreground">
                利用規約
              </Link>
              と
              <Link href="/privacy" className="underline hover:text-foreground">
                プライバシーポリシー
              </Link>
              に同意したことになります
            </p>
          </form>

          {/* Login link */}
          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">すでにアカウントをお持ちですか？ </span>
            <Link href="/auth/login" className="font-medium text-primary hover:underline">
              ログイン
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
