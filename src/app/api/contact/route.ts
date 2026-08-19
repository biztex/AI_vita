import { appendFile, mkdir } from "fs/promises"
import path from "path"
import { NextResponse } from "next/server"
import { z } from "zod"
import { contactSchema } from "@/lib/validations/validation"

export const runtime = "nodejs"

// The LP / contact form now sends plan=integrated|executive|vita. The shared schema
// still enumerates the legacy values, so override the field here — and keep accepting
// the legacy keys so older cached pages don't start failing validation.
const inquirySchema = contactSchema.extend({
  plan: z
    .enum(["integrated", "executive", "vita", "undecided", "small", "corporate"])
    .optional(),
})

// Persist inquiries as JSON Lines so they survive process restarts / rotated logs.
const INQUIRY_LOG_DIR = "/home/dev/axel-data"
const INQUIRY_LOG_FILE = path.join(INQUIRY_LOG_DIR, "inquiries.jsonl")

export async function POST(req: Request) {
  let payload: unknown
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 })
  }

  const parsed = inquirySchema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "入力内容をご確認ください。",
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    )
  }

  const data = parsed.data

  const record = {
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
  }

  // Server-side log so inquiries are visible in the Next.js process output.
  // Hook up SMTP / Slack / CRM here when ready.
  console.log("[contact] new inquiry:", record)

  // Append to the JSONL store as well; the console.log above remains the fallback,
  // so a disk error must not turn a received inquiry into a user-facing failure.
  try {
    await mkdir(INQUIRY_LOG_DIR, { recursive: true })
    await appendFile(INQUIRY_LOG_FILE, JSON.stringify(record) + "\n", "utf8")
  } catch (err) {
    console.error("[contact] failed to persist inquiry to", INQUIRY_LOG_FILE, err)
  }

  return NextResponse.json({ ok: true })
}
