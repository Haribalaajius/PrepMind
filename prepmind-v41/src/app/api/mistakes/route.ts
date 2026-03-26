// src/app/api/mistakes/route.ts
import { NextRequest } from 'next/server'
import { requireAuthUser } from '@/lib/supabase/server'
import { saveMistake, updateMistake, deleteMistake } from '@/lib/db/mutations'
import { getMistakes } from '@/lib/db/queries'
import { ok, created, badRequest, unauthorized, serverError } from '@/lib/utils/validation'
import type { MistakeType } from '@/types/database'

const VALID_TYPES: MistakeType[] = ['concept_gap','silly_mistake','formula_error','calculation_error','guessed_wrong','time_pressure','unknown']

export async function GET(_req: NextRequest) {
  let user: Awaited<ReturnType<typeof requireAuthUser>>
  try { user = await requireAuthUser() } catch { return unauthorized() }
  try { return ok(await getMistakes(user.id)) }
  catch (err) { console.error('[GET /api/mistakes]', err); return serverError() }
}

export async function POST(req: NextRequest) {
  let user: Awaited<ReturnType<typeof requireAuthUser>>
  try { user = await requireAuthUser() } catch { return unauthorized() }
  let body: Record<string, unknown>
  try { body = await req.json() } catch { return badRequest('Invalid JSON') }

  const { subject, mistake_type } = body
  if (typeof subject !== 'string' || !subject.trim()) return badRequest('`subject` required')
  if (typeof mistake_type !== 'string' || !VALID_TYPES.includes(mistake_type as MistakeType)) return badRequest('Invalid `mistake_type`')

  try {
    const record = await saveMistake(user.id, {
      subject:           subject.trim().slice(0,120),
      topic:             typeof body.topic === 'string' ? body.topic.trim().slice(0,120) : null,
      question_summary:  typeof body.question_summary === 'string' ? body.question_summary.trim().slice(0,1000) : null,
      mistake_type:      mistake_type as MistakeType,
      lesson_learned:    typeof body.lesson_learned === 'string' ? body.lesson_learned.trim().slice(0,1000) : null,
      fix_action:        typeof body.fix_action === 'string' ? body.fix_action.trim().slice(0,500) : null,
      ai_diagnosis:      null,
      severity:          [1,2,3].includes(Number(body.severity)) ? Number(body.severity) as 1|2|3 : 2,
      resolved:          false,
    })
    return created(record)
  } catch (err) { console.error('[POST /api/mistakes]', err); return serverError() }
}

export async function PATCH(req: NextRequest) {
  let user: Awaited<ReturnType<typeof requireAuthUser>>
  try { user = await requireAuthUser() } catch { return unauthorized() }
  let body: Record<string, unknown>
  try { body = await req.json() } catch { return badRequest('Invalid JSON') }

  const { id } = body
  if (typeof id !== 'string') return badRequest('`id` required')

  const updates: Parameters<typeof updateMistake>[2] = {}
  if (typeof body.resolved === 'boolean') updates.resolved = body.resolved
  if (typeof body.ai_diagnosis === 'string') updates.ai_diagnosis = body.ai_diagnosis.slice(0,2000)
  if (typeof body.lesson_learned === 'string') updates.lesson_learned = body.lesson_learned.slice(0,1000)
  if (typeof body.fix_action === 'string') updates.fix_action = body.fix_action.slice(0,500)
  if ([1,2,3].includes(Number(body.severity))) updates.severity = Number(body.severity) as 1|2|3

  try { await updateMistake(user.id, id, updates); return ok({ success: true }) }
  catch (err) { console.error('[PATCH /api/mistakes]', err); return serverError() }
}

export async function DELETE(req: NextRequest) {
  let user: Awaited<ReturnType<typeof requireAuthUser>>
  try { user = await requireAuthUser() } catch { return unauthorized() }
  let body: Record<string, unknown>
  try { body = await req.json() } catch { return badRequest('Invalid JSON') }
  const { id } = body
  if (typeof id !== 'string') return badRequest('`id` required')
  try { await deleteMistake(user.id, id); return ok({ success: true }) }
  catch (err) { console.error('[DELETE /api/mistakes]', err); return serverError() }
}
