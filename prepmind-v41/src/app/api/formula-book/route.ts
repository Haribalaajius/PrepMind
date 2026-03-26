// src/app/api/formula-book/route.ts
import { NextRequest } from 'next/server'
import { requireAuthUser } from '@/lib/supabase/server'
import { saveFormula, deleteFormula } from '@/lib/db/mutations'
import { getFormulas } from '@/lib/db/queries'
import { ok, created, badRequest, unauthorized, serverError } from '@/lib/utils/validation'
import type { FormulaSourceType } from '@/types/database'

const VALID_SOURCES: FormulaSourceType[] = ['custom','ai_generated','saved_from_teach','imported']

export async function GET(req: NextRequest) {
  let user: Awaited<ReturnType<typeof requireAuthUser>>
  try { user = await requireAuthUser() } catch { return unauthorized() }
  const subject = new URL(req.url).searchParams.get('subject') ?? undefined
  try { return ok(await getFormulas(user.id, subject)) }
  catch (err) { console.error('[GET /api/formula-book]', err); return serverError() }
}

export async function POST(req: NextRequest) {
  let user: Awaited<ReturnType<typeof requireAuthUser>>
  try { user = await requireAuthUser() } catch { return unauthorized() }
  let body: Record<string, unknown>
  try { body = await req.json() } catch { return badRequest('Invalid JSON') }
  const { subject, topic, formula_content } = body
  if (typeof subject         !== 'string' || !subject.trim())         return badRequest('`subject` required')
  if (typeof topic           !== 'string' || !topic.trim())           return badRequest('`topic` required')
  if (typeof formula_content !== 'string' || !formula_content.trim()) return badRequest('`formula_content` required')
  const src: FormulaSourceType = VALID_SOURCES.includes(body.source_type as FormulaSourceType) ? body.source_type as FormulaSourceType : 'custom'
  try {
    const entry = await saveFormula(user.id, {
      subject:         subject.trim().slice(0,120),
      topic:           topic.trim().slice(0,120),
      title:           typeof body.title === 'string' ? body.title.trim().slice(0,200) : topic.trim().slice(0,120),
      formula_content: formula_content.trim().slice(0,5000),
      source_type:     src,
    })
    return created(entry)
  } catch (err) { console.error('[POST /api/formula-book]', err); return serverError() }
}

export async function DELETE(req: NextRequest) {
  let user: Awaited<ReturnType<typeof requireAuthUser>>
  try { user = await requireAuthUser() } catch { return unauthorized() }
  let body: Record<string, unknown>
  try { body = await req.json() } catch { return badRequest('Invalid JSON') }
  const { id } = body
  if (typeof id !== 'string') return badRequest('`id` required')
  try { await deleteFormula(user.id, id); return ok({ success: true }) }
  catch (err) { console.error('[DELETE /api/formula-book]', err); return serverError() }
}
