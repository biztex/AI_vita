import { z } from "zod"
import { NEWS_CATEGORIES, type NewsCategory } from "../../../shared/news-categories"

// Login schema
export const loginSchema = z.object({
  email: z.string().email("有効なメールアドレスを入力してください"),
  password: z.string().min(6, "パスワードは6文字以上で入力してください"),
})

export type LoginFormData = z.infer<typeof loginSchema>

const NEWS_CATEGORY_VALUES = NEWS_CATEGORIES as unknown as [NewsCategory, ...NewsCategory[]];
export const NewsCategoryEnum = z.enum(NEWS_CATEGORY_VALUES);

// Register schema
export const registerSchema = z
  .object({
    name: z.string().min(2, "氏名は2文字以上で入力してください"),
    email: z.string().email("有効なメールアドレスを入力してください"),
    company: z.string().optional(),
    industries: z.array(NewsCategoryEnum).optional(),
    password: z.string().min(6, "パスワードは6文字以上で入力してください"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "パスワードが一致しません",
    path: ["confirmPassword"],
  })

export type RegisterFormData = z.infer<typeof registerSchema>

// Contact / Inquiry schema (LP お問い合わせフォーム)
export const InquiryTypeEnum = z.enum(["document", "consultation", "other"])
export const InquiryPlanEnum = z.enum(["small", "corporate", "undecided"])

export const contactSchema = z.object({
  company: z.string().max(120).optional().or(z.literal("")),
  name: z.string().min(1, "お名前を入力してください").max(80),
  position: z.string().max(80).optional().or(z.literal("")),
  email: z.string().email("有効なメールアドレスを入力してください"),
  phone: z
    .string()
    .regex(/^[0-9+\-()\s]*$/, "電話番号の形式が正しくありません")
    .max(30)
    .optional()
    .or(z.literal("")),
  inquiryType: InquiryTypeEnum,
  plan: InquiryPlanEnum.optional(),
  employees: z
    .string()
    .regex(/^[0-9]*$/, "半角数字で入力してください")
    .max(6)
    .optional()
    .or(z.literal("")),
  message: z.string().max(2000).optional().or(z.literal("")),
  agreement: z.literal(true, {
    errorMap: () => ({ message: "個人情報の取り扱いへの同意が必要です" }),
  }),
})

export type ContactFormData = z.infer<typeof contactSchema>
