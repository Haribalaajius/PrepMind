// src/app/api/profile/route.ts
import { NextRequest } from 'next/server'
import { requireAuthUser } from '@/lib/supabase/server'
import { upsertProfile } from '@/lib/db/mutations'
import { getProfile } from '@/lib/db/queries'
import { ok, badRequest, unauthorized, serverError } from '@/lib/utils/validation'
import { isValidFocusMode } from '@/lib/utils/validation'

export async function GET(_req: NextRequest) {
  let user: Awaited<ReturnType<typeof requireAuthUser>>
  try { user = await requireAuthUser() } catch { return unauthorized() }
  try { return ok(await getProfile(user.id)) }
  catch (err) { console.error('[GET /api/profile]', err); return serverError() }
}

export async function PATCH(req: NextRequest) {
  let user: Awaited<ReturnType<typeof requireAuthUser>>
  try { user = await requireAuthUser() } catch { return unauthorized() }
  let body: Record<string, unknown>
  try { body = await req.json() } catch { return badRequest('Invalid JSON') }

  const updates: Parameters<typeof upsertProfile>[1] = {}
  if (typeof body.full_name === 'string') updates.full_name = body.full_name.trim().slice(0,100)
  if (isValidFocusMode(body.focus_mode))  updates.focus_mode = body.focus_mode
  if (typeof body.daily_hours === 'number' && body.daily_hours >= 1 && body.daily_hours <= 20)
    updates.daily_hours = Math.floor(body.daily_hours)
  if (typeof body.target_year === 'number' && body.target_year >= 2024 && body.target_year <= 2035)
    updates.target_year = body.target_year
  if (body.onboarded_at === 'now') updates.onboarded_at = new Date().toISOString()

  try { return ok(await upsertProfile(user.id, updates)) }
  catch (err) { console.error('[PATCH /api/profile]', err); return serverError() }
}
