"use client"

import { useEffect, useState } from "react"

type LiffState =
  | { status: "loading" }
  | { status: "ready"; lineUserId: string; displayName: string }
  | { status: "error"; message: string }

const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID_PAGES!

export function useLiff(): LiffState {
  const [state, setState] = useState<LiffState>({ status: "loading" })

  useEffect(() => {
    let cancelled = false

    async function init() {
      try {
        const liff = (await import("@line/liff")).default
        await liff.init({ liffId: LIFF_ID })

        if (!liff.isLoggedIn()) {
          liff.login({ redirectUri: window.location.href })
          return
        }

        const profile = await liff.getProfile()
        if (!cancelled) {
          setState({
            status: "ready",
            lineUserId: profile.userId,
            displayName: profile.displayName,
          })
        }
      } catch (err: any) {
        if (!cancelled) {
          setState({ status: "error", message: err?.message || "LIFF初期化に失敗しました。" })
        }
      }
    }

    init()
    return () => { cancelled = true }
  }, [])

  return state
}
