"use client"

import { useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { contactSchema, type ContactFormData } from "@/lib/validations/validation"
import { Loader2, CheckCircle2, ChevronLeft, Mail, Clock, ShieldCheck } from "lucide-react"
import { toast } from "react-toastify"

const VALID_PLANS = ["small", "corporate", "undecided"] as const

export default function InquiryForm() {
  const searchParams = useSearchParams()
  const planFromQuery = searchParams.get("plan")
  const defaultPlan = (VALID_PLANS as readonly string[]).includes(planFromQuery ?? "")
    ? (planFromQuery as (typeof VALID_PLANS)[number])
    : "undecided"
  // ?type=reservation switches the form into "予約のご相談" mode (used by the LINE rich-menu
  // "予約する" button until a proper external booking system is integrated).
  const isReservation = searchParams.get("type") === "reservation"

  const [isLoading, setIsLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      // Reservations land on "consultation" since the schema doesn't have a dedicated reservation type.
      inquiryType: isReservation ? "consultation" : "document",
      plan: defaultPlan,
      message: isReservation
        ? "ご希望の日程・時間帯（候補を複数いただけると調整しやすいです）と、ご相談内容をご記入ください。"
        : undefined,
      agreement: false as unknown as true,
    },
  })

  const onSubmit = async (data: ContactFormData) => {
    setIsLoading(true)
    setServerError(null)
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json?.error || "送信に失敗しました。時間をおいて再度お試しください。")
      }

      setSubmitted(true)
      reset()
      toast.success("お問い合わせを受け付けました。", {
        position: "top-right",
        autoClose: 5000,
      })
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "送信に失敗しました。時間をおいて再度お試しください。"
      setServerError(msg)
      toast.error(msg, { position: "top-right", autoClose: 6000 })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative mx-auto flex min-h-[calc(100vh-8rem)] max-w-5xl items-start justify-center px-4 py-16">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-32 top-1/4 h-[400px] w-[400px] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute -right-32 bottom-1/4 h-[400px] w-[400px] rounded-full bg-[#FFD700]/10 blur-[120px]" />
      </div>

      <div className="w-full">
        {/* Back link */}
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          <ChevronLeft className="h-4 w-4" />
          トップに戻る
        </Link>

        {submitted ? (
          <Card className="mx-auto w-full max-w-2xl border-primary/30 bg-card/80 backdrop-blur-sm">
            <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/15">
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">送信を受け付けました</h2>
              <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                お問い合わせありがとうございます。
                <br />
                内容を確認の上、通常2営業日以内にご返信いたします。
              </p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <Button asChild variant="outline" className="rounded-full">
                  <Link href="/">トップへ戻る</Link>
                </Button>
                <Button
                  onClick={() => setSubmitted(false)}
                  className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  別の問い合わせを送る
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-8 md:grid-cols-[1fr_360px]">
            {/* Form card */}
            <Card className="bg-card/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-2xl font-bold">
                  {isReservation ? "予約のご相談" : "お問い合わせ・資料請求"}
                </CardTitle>
                <CardDescription>
                  {isReservation ? (
                    <>
                      日程のご相談を承ります。
                      <br className="hidden sm:block" />
                      ご希望の候補をいくつかいただけますと、最短でご返信いたします。
                    </>
                  ) : (
                    <>
                      導入のご相談、資料のご請求を承っております。
                      <br className="hidden sm:block" />
                      通常2営業日以内にご返信いたします。
                    </>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
                  {/* Inquiry type */}
                  <div className="space-y-2">
                    <Label>
                      お問い合わせ種別
                      <span className="ml-1 text-destructive">*</span>
                    </Label>
                    <Controller
                      control={control}
                      name="inquiryType"
                      render={({ field }) => (
                        <div className="grid gap-2 sm:grid-cols-3">
                          {[
                            { value: "document", label: "資料請求" },
                            { value: "consultation", label: "無料相談" },
                            { value: "other", label: "その他" },
                          ].map((opt) => {
                            const active = field.value === opt.value
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => field.onChange(opt.value)}
                                className={`rounded-lg border px-4 py-2.5 text-sm font-medium transition-all ${
                                  active
                                    ? "border-primary bg-primary/10 text-primary"
                                    : "border-border/60 bg-card/40 text-muted-foreground hover:border-border"
                                }`}
                              >
                                {opt.label}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    />
                    {errors.inquiryType && (
                      <p className="text-sm text-destructive">{errors.inquiryType.message}</p>
                    )}
                  </div>

                  {/* Company + Position */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="company">会社名</Label>
                      <Input id="company" placeholder="株式会社〇〇" {...register("company")} />
                      {errors.company && (
                        <p className="text-sm text-destructive">{errors.company.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="position">役職</Label>
                      <Input id="position" placeholder="代表取締役 / 役員 など" {...register("position")} />
                      {errors.position && (
                        <p className="text-sm text-destructive">{errors.position.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Name */}
                  <div className="space-y-2">
                    <Label htmlFor="name">
                      お名前<span className="ml-1 text-destructive">*</span>
                    </Label>
                    <Input
                      id="name"
                      placeholder="山田 太郎"
                      {...register("name")}
                      aria-invalid={errors.name ? "true" : "false"}
                    />
                    {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                  </div>

                  {/* Email + Phone */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="email">
                        メールアドレス<span className="ml-1 text-destructive">*</span>
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        {...register("email")}
                        aria-invalid={errors.email ? "true" : "false"}
                      />
                      {errors.email && (
                        <p className="text-sm text-destructive">{errors.email.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">電話番号</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="03-1234-5678"
                        {...register("phone")}
                      />
                      {errors.phone && (
                        <p className="text-sm text-destructive">{errors.phone.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Plan + Employees */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>ご興味のあるプラン</Label>
                      <Controller
                        control={control}
                        name="plan"
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue placeholder="未定" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="small">スモールプラン（1〜3名）</SelectItem>
                              <SelectItem value="corporate">コーポレートプラン（4名以上）</SelectItem>
                              <SelectItem value="undecided">未定・相談したい</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="employees">予定利用人数</Label>
                      <Input
                        id="employees"
                        type="text"
                        inputMode="numeric"
                        placeholder="5"
                        {...register("employees")}
                      />
                      {errors.employees && (
                        <p className="text-sm text-destructive">{errors.employees.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Message */}
                  <div className="space-y-2">
                    <Label htmlFor="message">ご要望・ご質問</Label>
                    <Textarea
                      id="message"
                      rows={5}
                      placeholder="導入時期、気になる点、課題感などをお聞かせください。"
                      {...register("message")}
                    />
                    {errors.message && (
                      <p className="text-sm text-destructive">{errors.message.message}</p>
                    )}
                  </div>

                  {/* Agreement */}
                  <div className="rounded-lg border border-border/60 bg-card/40 p-4">
                    <Controller
                      control={control}
                      name="agreement"
                      render={({ field }) => (
                        <label className="flex items-start gap-3 text-sm text-foreground/90">
                          <Checkbox
                            checked={!!field.value}
                            onCheckedChange={(v) => field.onChange(v === true)}
                            aria-invalid={errors.agreement ? "true" : "false"}
                            className="mt-0.5"
                          />
                          <span className="leading-relaxed">
                            <Link href="/privacy" className="text-primary underline-offset-2 hover:underline">
                              個人情報の取り扱い
                            </Link>
                            について同意します
                            <span className="ml-1 text-destructive">*</span>
                          </span>
                        </label>
                      )}
                    />
                    {errors.agreement && (
                      <p className="mt-2 text-sm text-destructive">{errors.agreement.message}</p>
                    )}
                  </div>

                  {/* Server error */}
                  {serverError && (
                    <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive" role="alert">
                      {serverError}
                    </div>
                  )}

                  {/* Submit */}
                  <Button
                    type="submit"
                    size="lg"
                    disabled={isLoading}
                    className="w-full rounded-full bg-[#FFD700] text-[#0F2342] font-bold hover:bg-[#FFD700]/90 shadow-lg shadow-[#FFD700]/20"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        送信中...
                      </>
                    ) : (
                      "この内容で送信する"
                    )}
                  </Button>

                  <p className="text-center text-xs text-muted-foreground">
                    <span className="text-destructive">*</span> は必須項目です
                  </p>
                </form>
              </CardContent>
            </Card>

            {/* Side panel */}
            <aside className="space-y-4">
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-primary">
                  <Mail className="h-4 w-4" />
                  ご案内
                </h3>
                <ul className="space-y-4 text-sm">
                  <li className="flex items-start gap-3">
                    <Clock className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                    <div>
                      <p className="font-semibold text-foreground">通常2営業日以内に返信</p>
                      <p className="text-muted-foreground">土日祝日を除きます</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                    <div>
                      <p className="font-semibold text-foreground">情報は適切に管理</p>
                      <p className="text-muted-foreground">お問い合わせ対応の目的以外では使用しません</p>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="rounded-2xl border border-[#FFD700]/30 bg-gradient-to-br from-[#FFD700]/10 to-transparent p-6">
                <p className="text-sm font-bold text-foreground">
                  限定10社　先行導入受付中
                </p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  発売記念キャンペーン価格は予告なく終了する場合があります。
                </p>
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  )
}
