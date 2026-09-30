/**
 * AXEL home-screen launcher (client 2026-09-30 item 6, 案A).
 *
 * /axel     — guide: how to add the AXEL icon to the home screen (per OS).
 * /axel/go  — what the icon opens: jumps straight into the AXEL LINE talk.
 *
 * Served as raw HTML route handlers (outside the site layout — no header /
 * footer). display:"browser" on purpose: from a standalone web-app window
 * iOS will not hand https LINE links to the LINE app.
 */

export const LINE_OA_ID = process.env.NEXT_PUBLIC_LINE_OA_ID || "@389rupfv"
const oa = encodeURIComponent(LINE_OA_ID)
/** Universal / App Link — opens the talk room directly when tapped. */
export const LINE_TALK_URL = `https://line.me/R/oaMessage/${oa}/`
/** Custom scheme (iOS automatic attempt). */
export const LINE_TALK_SCHEME = `line://oaMessage/${oa}/`
/** Android intent — opens LINE directly, falls back to the https link. */
export const LINE_TALK_INTENT =
  `intent://oaMessage/${oa}/#Intent;scheme=line;package=jp.naver.line.android;` +
  `S.browser_fallback_url=${encodeURIComponent(LINE_TALK_URL)};end`

export function htmlResponse(body: string): Response {
  return new Response(body, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  })
}

export function head(title: string): string {
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${title}</title>
<meta name="apple-mobile-web-app-title" content="AXEL">
<meta name="application-name" content="AXEL">
<meta name="theme-color" content="#0F2342">
<meta name="robots" content="noindex">
<link rel="manifest" href="/axel-app/manifest.webmanifest">
<link rel="apple-touch-icon" href="/axel-app/icon-180.png">
<link rel="icon" type="image/png" sizes="192x192" href="/axel-app/icon-192.png">
<style>
*{box-sizing:border-box}
body{margin:0;min-height:100vh;background:#0F2342;color:#fff;font-family:-apple-system,BlinkMacSystemFont,"Hiragino Sans","Noto Sans JP",sans-serif;
padding:calc(env(safe-area-inset-top,0px) + 28px) 20px calc(env(safe-area-inset-bottom,0px) + 32px)}
.wrap{max-width:440px;margin:0 auto}
.icon{display:block;width:88px;height:88px;border-radius:20px;margin:0 auto;box-shadow:0 10px 30px -10px rgba(201,168,106,.55)}
h1{font-family:"Hiragino Mincho ProN","Noto Serif JP",serif;font-weight:600;font-size:22px;text-align:center;margin:18px 0 6px}
.lead{text-align:center;color:rgba(255,255,255,.7);font-size:13px;line-height:1.7;margin:0 0 22px}
.card{background:rgba(255,255,255,.05);border:1px solid rgba(201,168,106,.35);border-radius:18px;padding:18px 18px 8px;margin-bottom:14px}
.card h2{margin:0 0 10px;font-size:14px;color:#C9A86A;letter-spacing:.05em}
ol{margin:0;padding-left:1.3em}li{font-size:14px;line-height:1.7;margin-bottom:10px;color:rgba(255,255,255,.88)}
b{color:#fff}
.btn{display:block;width:100%;text-align:center;text-decoration:none;background:#C9A86A;color:#0F2342;font-weight:700;font-size:16px;padding:15px;border-radius:999px;border:0;margin:6px 0 12px}
.btn.ghost{background:transparent;color:#C9A86A;border:1px solid rgba(201,168,106,.6);font-size:14px;padding:12px}
.note{font-size:11.5px;line-height:1.7;color:rgba(255,255,255,.5);margin:6px 0 0}
[hidden]{display:none!important}
</style></head>`
}
