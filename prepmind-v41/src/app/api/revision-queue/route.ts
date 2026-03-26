// src/app/api/revision-queue/route.ts
import { NextRequest } from 'next/server'
import { requireAuthUser } from '@/lib/supabase/server'
import { addRevisionItem, advanceRevisionStage, deleteRevisionItem } from '@/lib/db/mutations'
import { getRevisionQueue } from '@/lib/db/queries'
import { ok, created, badRequest, unauthorized, serverError } from '@/lib/utils/validation'
import { isValidRevisionDirection, isValidRevisionItemType } from '@/lib/utils/validation'
import { REVISION_INTERVALS } from '@/lib/utils/constants'
import type { RevisionItemType, RevisionStage } from '@/types/database'

export async function GET(_req: NextRequest) {
  let user: Awaited<ReturnType<typeof requireAuthUser>>
  try { user = await requireAuthUser() } catch { return unauthorized() }
  try { return ok(await getRevisionQueue(user.id)) }
  catch (err) { console.error('[GET /api/revision-queue]', err); return serverError() }
}

export async function POST(req: NextRequest) {
  let user: Awaited<ReturnType<typeof requireAuthUser>>
  try { user = await requireAuthUser() } catch { return unauthorized() }
  let body: Record<string, unknown>
  try { body = await req.json() } catch { return badRequest('Invalid JSON') }

  const { subject, topic, title } = body
  if (typeof subject !== 'string' || !subject.trim()) return badRequest('`subject` required')
  if (typeof topic   !== 'string' || !topic.trim())   return badRequest('`topic` required')

  const stage: RevisionStage = 'new'
  const nextDue = new Date()
  nextDue.setDate(nextDue.getDate() + (REVISION_INTERVALS[stage] ?? 0))

  const itemType = isValidRevisionItemType(body.item_type) ? body.item_type : 'topic'

  try {
    const item = await addRevisionItem(user.id, {
      item_type:        itemType as RevisionItemType,
      subject:          subject.trim().slice(0,120),
      topic:            topic.trim().slice(0,120),
      title:            typeof title === 'string' ? title.trim().slice(0,200) : topic.trim().slice(0,200),
      content_ref:      typeof body.content_ref === 'string' ? body.content_ref.slice(0,500) : null,
      notes:            typeof body.notes       === 'string' ? body.notes.slice(0,1000)     : null,
      confidence_level: [1,2,3,4,5].includes(Number(body.confidence_level)) ? Number(body.confidence_level) : 2,
      revision_stage:   stage,
      next_due_at:      nextDue.toISOString(),
    })
    return created(item)
  } catch (err) { console.error('[POST /api/revision-queue]', err); return serverError() }
}

export async function PATCH(req: NextRequest) {
  let user: Awaited<ReturnType<typeof requireAuthUser>>
  try { user = await requireAuthUser() } catch { return unauthorized() }
  let body: Record<string, unknown>
  try { body = await req.json() } catch { return badRequest('Invalid JSON') }

  const { id, direction } = body
  if (typeof id !== 'string')        return badRequest('`id` required')
  if (!isValidRevisionDirection(direction)) return badRequest('`direction` must be advance|reset|suspend|master')

  try {
    const newStage = await advanceRevisionStage(user.id, id, direction)
    return ok({ success: true, new_stage: newStage })
  } catch (err) { console.error('[PATCH /api/revision-queue]', err); return serverError() }
}

export async function DELETE(req: NextRequest) {
  let user: Awaited<ReturnType<typeof requireAuthUser>>
  try { user = await requireAuthUser() } catch { return unauthorized() }
  let body: Record<string, unknown>
  try { body = await req.json() } catch { return badRequest('Invalid JSON') }
  const { id } = body
  if (typeof id !== 'string') return badRequest('`id` required')
  try { await deleteRevisionItem(user.id, id); return ok({ success: true }) }
  catch (err) { console.error('[DELETE /api/revision-queue]', err); return serverError() }
}
