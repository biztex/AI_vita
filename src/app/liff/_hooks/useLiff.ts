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
          // Guard against an infinite login loop: only attempt login once.
          // If we come back still not logged in, surface a clear message
          // instead of redirecting forever.
          if (sessionStorage.getItem("liff_login_attempted")) {
            if (!cancelled) {
              setState({
                status: "error",
                message: "ログインを完了できませんでした。LINEアプリのメニューから開き直してください。",
              })
            }
            return
          }
          sessionStorage.setItem("liff_login_attempted", "1")
          // Return to a CLEAN url (no transient ?code/?state/?liff.state), so
          // the OAuth return target stays inside the LIFF endpoint scope.
          liff.login({ redirectUri: window.location.origin + window.location.pathname })
          return
        }

        // Logged in — clear the one-shot guard for future navigations.
        sessionStorage.removeItem("liff_login_attempted")
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
