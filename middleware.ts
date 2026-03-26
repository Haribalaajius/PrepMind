// middleware.ts (root level)
// ─── Session refresh + route protection ──────────────────────────────────────
// Runs on every matched request before the page/route handler.

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Write cookies back on the request first
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          // Then recreate the response so cookies flow downstream
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: use getUser() not getSession() — validates JWT with Supabase Auth server
  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  // ── Dashboard routes: require auth ─────────────────────────────────────────
  const isDashboardRoute = pathname.startsWith('/dashboard') ||
    pathname.startsWith('/practice') ||
    pathname.startsWith('/learn') ||
    pathname.startsWith('/doubts') ||
    pathname.startsWith('/analyze') ||
    pathname.startsWith('/revise') ||
    pathname.startsWith('/progress') ||
    pathname.startsWith('/system')

  if (isDashboardRoute && !user) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // ── Auth pages: redirect already-logged-in users ──────────────────────────
  const isAuthRoute = pathname === '/login' || pathname === '/signup'
  if (isAuthRoute && user) {
    const next = request.nextUrl.searchParams.get('next') ?? '/dashboard'
    return NextResponse.redirect(new URL(next, request.url))
  }

  // ── Root: redirect to dashboard or login ──────────────────────────────────
  if (pathname === '/') {
    return NextResponse.redirect(
      new URL(user ? '/dashboard' : '/login', request.url)
    )
  }

  return response
}

export const config = {
  matcher: [
    // Skip static files and Next.js internals
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
