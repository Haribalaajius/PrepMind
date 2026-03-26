// src/app/api/practice/route.ts

import { NextRequest } from 'next/server'
import { requireAuthUser } from '@/lib/supabase/server'
import { savePracticeAttempt } from '@/lib/db/mutations'
import { getRecentPracticeHistory } from '@/lib/db/queries'
import { ok, created, badRequest, unauthorized, serverError } from '@/lib/utils/validation'
import type { SourceType } from '@/types/database'

const VALID_SOURCE_TYPES: SourceType[] = [
  'smart_practice','pyq_mode','timed_test','weak_topic_drill','recall_trainer','manual','imported'
]

export async function POST(req: NextRequest) {
  let user: Awaited<ReturnType<typeof requireAuthUser>>
  try { user = await requireAuthUser() } catch { return unauthorized() }

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return badRequest('Invalid JSON') }

  // Validate required fields
  const { subject, is_correct, correct_answer, source_type } = body
  if (typeof subject !== 'string' || !subject.trim())
    return badRequest('`subject` is required')
  if (typeof is_correct !== 'boolean')
    return badRequest('`is_correct` must be boolean')
  if (typeof correct_answer !== 'number' || correct_answer < 0 || correct_answer > 3)
    return badRequest('`correct_answer` must be 0-3')
  if (source_type && !VALID_SOURCE_TYPES.includes(source_type as SourceType))
    return badRequest(`Invalid source_type: ${source_type}`)

  const confidence = typeof body.confidence_level === 'number'
    ? Math.min(1, Math.max(0, body.confidence_level))
    : null

  try {
    const record = await savePracticeAttempt(user.id, {
      subject:            subject.trim().slice(0, 120),
      topic:              typeof body.topic === 'string' ? body.topic.trim().slice(0, 120) : null,
      concept:            typeof body.concept === 'string' ? body.concept.trim().slice(0, 200) : null,
      question_text:      typeof body.question_text === 'string' ? body.question_text.trim().slice(0, 2000) : null,
      question_type:      ['mcq','nat','msq','pyq'].includes(body.question_type as string) ? body.question_type as 'mcq'|'nat'|'msq'|'pyq' : 'mcq',
      difficulty:         ['easy','medium','hard','trap'].includes(body.difficulty as string) ? body.difficulty as 'easy'|'medium'|'hard'|'trap' : 'medium',
      confidence_level:   confidence,
      selected_answer:    typeof body.selected_answer === 'number' ? body.selected_answer : null,
      correct_answer:     correct_answer as number,
      is_correct:         is_correct as boolean,
      source_type:        (source_type as SourceType) ?? 'smart_practice',
      time_taken_seconds: typeof body.time_taken_seconds === 'number' && body.time_taken_seconds > 0 ? body.time_taken_seconds : null,
    })
    return created(record)
  } catch (err) {
    console.error('[POST /api/practice]', err)
    return serverError()
  }
}

export async function GET(req: NextRequest) {
  let user: Awaited<ReturnType<typeof requireAuthUser>>
  try { user = await requireAuthUser() } catch { return unauthorized() }

  const { searchParams } = new URL(req.url)
  const limit   = Math.min(parseInt(searchParams.get('limit') ?? '100'), 500)
  const subject = searchParams.get('subject') ?? undefined

  try {
    const data = await getRecentPracticeHistory(user.id, limit, subject)
    return ok(data)
  } catch (err) {
    console.error('[GET /api/practice]', err)
    return serverError()
  }
}
