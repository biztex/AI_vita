import { z } from "zod"

// Login schema
export const loginSchema = z.object({
  email: z.string().email("有効なメールアドレスを入力してください"),
  password: z.string().min(6, "パスワードは6文字以上である必要があります"),
})

export type LoginFormData = z.infer<typeof loginSchema>

// Register schema
export const registerSchema = z
  .object({
    name: z.string().min(2, "名前は2文字以上である必要があります"),
    email: z.string().email("有効なメールアドレスを入力してください"),
    company: z.string().optional(),
    password: z.string().min(6, "パスワードは6文字以上である必要があります"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "パスワードが一致しません",
    path: ["confirmPassword"],
  })

export type RegisterFormData = z.infer<typeof registerSchema>
