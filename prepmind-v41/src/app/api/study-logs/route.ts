// src/app/api/study-logs/route.ts
import { NextRequest } from 'next/server'
import { requireAuthUser } from '@/lib/supabase/server'
import { upsertStudyLog } from '@/lib/db/mutations'
import { getStudyLogs } from '@/lib/db/queries'
import { ok, created, badRequest, unauthorized, serverError } from '@/lib/utils/validation'

export async function GET(req: NextRequest) {
  let user: Awaited<ReturnType<typeof requireAuthUser>>
  try { user = await requireAuthUser() } catch { return unauthorized() }
  const days = Math.min(parseInt(new URL(req.url).searchParams.get('days') ?? '90'), 365)
  try { return ok(await getStudyLogs(user.id, days)) }
  catch (err) { console.error('[GET /api/study-logs]', err); return serverError() }
}

export async function POST(req: NextRequest) {
  let user: Awaited<ReturnType<typeof requireAuthUser>>
  try { user = await requireAuthUser() } catch { return unauthorized() }
  let body: Record<string, unknown>
  try { body = await req.json() } catch { return badRequest('Invalid JSON') }
  const date = typeof body.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.date)
    ? body.date
    : new Date().toISOString().split('T')[0]
  try {
    const log = await upsertStudyLog(user.id, date, {
      hours_logged:        typeof body.hours_logged === 'number' ? Math.min(24, Math.max(0, body.hours_logged)) : 0,
      questions_solved:    typeof body.questions_solved === 'number' ? Math.max(0, body.questions_solved) : 0,
      revisions_completed: typeof body.revisions_completed === 'number' ? Math.max(0, body.revisions_completed) : 0,
      mocks_taken:         typeof body.mocks_taken === 'number' ? Math.max(0, body.mocks_taken) : 0,
    }, typeof body.notes === 'string' ? body.notes.slice(0,1000) : undefined)
    return created(log)
  } catch (err) { console.error('[POST /api/study-logs]', err); return serverError() }
}
