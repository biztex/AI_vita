import { z } from "zod"
import { NEWS_CATEGORIES, type NewsCategory } from "../../../shared/news-categories"

// Login schema
export const loginSchema = z.object({
  email: z.string().email("有効なメールアドレスを入力してください"),
  password: z.string().min(6, "パスワードは6文字以上である必要があります"),
})

export type LoginFormData = z.infer<typeof loginSchema>

const NEWS_CATEGORY_VALUES = NEWS_CATEGORIES as unknown as [NewsCategory, ...NewsCategory[]];
export const NewsCategoryEnum = z.enum(NEWS_CATEGORY_VALUES);

// Register schema
export const registerSchema = z
  .object({
    name: z.string().min(2, "名前は2文字以上である必要があります"),
    email: z.string().email("有効なメールアドレスを入力してください"),
    company: z.string().optional(),
    industries: z.array(NewsCategoryEnum).optional(),
    password: z.string().min(6, "パスワードは6文字以上である必要があります"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "パスワードが一致しません",
    path: ["confirmPassword"],
  })

export type RegisterFormData = z.infer<typeof registerSchema>
