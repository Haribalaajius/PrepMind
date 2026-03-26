// src/lib/supabase/server.ts
// ─── Server-side Supabase clients (one per request) ──────────────────────────
// Import ONLY in Server Components, Route Handlers, and Server Actions.
// Never import in client components ('use client').

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Standard server client — uses anon key + cookie-based session.
 * Use for all normal authenticated server operations.
 */
export function getSupabaseServerClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll()              { return cookieStore.getAll() },
        setAll(cookiesToSet)  {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // ReadonlyRequestCookies in Server Components — fine, middleware handles it
          }
        },
      },
    }
  )
}

/**
 * Service-role client — bypasses RLS.
 * Use ONLY for:
 *   - writing analytics_snapshots (no client insert policy)
 *   - migration imports
 *   - admin operations
 * NEVER expose this client or its key to the browser.
 */
export function getSupabaseServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false },
      cookies: { getAll: () => [], setAll: () => {} },
    }
  )
}

/**
 * Returns the current authenticated user or null.
 * Uses getUser() — validates the JWT with Supabase Auth server,
 * not just from the cookie (safe against tampering).
 */
export async function getAuthUser() {
  const supabase = getSupabaseServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return user
}

/**
 * Like getAuthUser() but throws if not authenticated.
 * Use in API routes that require auth.
 */
export async function requireAuthUser() {
  const user = await getAuthUser()
  if (!user) {
    throw new Error('UNAUTHORIZED')
  }
  return user
}
