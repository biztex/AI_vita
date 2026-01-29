import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  const pathname = request.nextUrl.pathname

  // Check if the request is coming from vitaai.jp domain
  if (hostname === 'vitaai.jp' || hostname === 'www.vitaai.jp') {
    // If accessing the root path, rewrite to /vitaai/chat
    if (pathname === '/') {
      const url = request.nextUrl.clone()
      url.pathname = '/vitaai/chat'
      return NextResponse.rewrite(url)
    }
  }

  // For all other requests, continue normally
  return NextResponse.next()
}

// Configure which routes this middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
}

