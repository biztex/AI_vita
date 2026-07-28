import { NextResponse } from "next/server"
import { contactSchema } from "@/lib/validations/validation"

export const runtime = "nodejs"

export async function POST(req: Request) {
  let payload: unknown
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 })
  }

  const parsed = contactSchema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "Validation failed.",
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    )
  }

  const data = parsed.data

  // Server-side log so inquiries are visible in the Next.js process output.
  // Hook up SMTP / Slack / CRM here when ready.
  console.log("[contact] new inquiry:", {
    receivedAt: new Date().toISOString(),
    name: data.name,
    email: data.email,
    company: data.company || null,
    position: data.position || null,
    phone: data.phone || null,
    inquiryType: data.inquiryType,
    plan: data.plan || null,
    employees: data.employees || null,
    message: data.message || null,
  })

  return NextResponse.json({ ok: true })
}
