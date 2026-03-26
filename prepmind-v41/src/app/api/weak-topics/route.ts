// src/app/api/weak-topics/route.ts
import { NextRequest } from 'next/server'
import { requireAuthUser } from '@/lib/supabase/server'
import { upsertWeakTopic, resolveWeakTopic } from '@/lib/db/mutations'
import { getWeakTopics } from '@/lib/db/queries'
import { ok, created, badRequest, unauthorized, serverError } from '@/lib/utils/validation'

export async function GET(_req: NextRequest) {
  let user: Awaited<ReturnType<typeof requireAuthUser>>
  try { user = await requireAuthUser() } catch { return unauthorized() }
  try { return ok(await getWeakTopics(user.id, 'active')) }
  catch (err) { console.error('[GET /api/weak-topics]', err); return serverError() }
}

export async function POST(req: NextRequest) {
  let user: Awaited<ReturnType<typeof requireAuthUser>>
  try { user = await requireAuthUser() } catch { return unauthorized() }
  let body: Record<string, unknown>
  try { body = await req.json() } catch { return badRequest('Invalid JSON') }
  const { subject, topic } = body
  if (typeof subject !== 'string' || !subject.trim()) return badRequest('`subject` required')
  if (typeof topic   !== 'string' || !topic.trim())   return badRequest('`topic` required')
  try {
    const item = await upsertWeakTopic(user.id, {
      subject: subject.trim().slice(0,120),
      topic:   topic.trim().slice(0,120),
      weakness_score:  typeof body.weakness_score === 'number' ? Math.min(100, Math.max(0, body.weakness_score)) : 60,
      weakness_reason: typeof body.weakness_reason === 'string' ? body.weakness_reason.slice(0,500) : null,
      status: 'active',
    })
    return created(item)
  } catch (err) { console.error('[POST /api/weak-topics]', err); return serverError() }
}

export async function PATCH(req: NextRequest) {
  let user: Awaited<ReturnType<typeof requireAuthUser>>
  try { user = await requireAuthUser() } catch { return unauthorized() }
  let body: Record<string, unknown>
  try { body = await req.json() } catch { return badRequest('Invalid JSON') }
  const { id } = body
  if (typeof id !== 'string') return badRequest('`id` required')
  try { await resolveWeakTopic(user.id, id); return ok({ success: true }) }
  catch (err) { console.error('[PATCH /api/weak-topics]', err); return serverError() }
}
