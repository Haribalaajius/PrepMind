// src/app/api/test-history/route.ts
import { NextRequest } from 'next/server'
import { requireAuthUser } from '@/lib/supabase/server'
import { saveMockResult } from '@/lib/db/mutations'
import { getTestHistory } from '@/lib/db/queries'
import { ok, created, badRequest, unauthorized, serverError } from '@/lib/utils/validation'
import type { TestType } from '@/types/database'

const VALID_TEST_TYPES: TestType[] = ['quick_quiz','subject_test','full_mock','weak_topic_mock','roi_mock','custom_mock','manual_entry']

export async function GET(_req: NextRequest) {
  let user: Awaited<ReturnType<typeof requireAuthUser>>
  try { user = await requireAuthUser() } catch { return unauthorized() }
  try { return ok(await getTestHistory(user.id)) }
  catch (err) { console.error('[GET /api/test-history]', err); return serverError() }
}

export async function POST(req: NextRequest) {
  let user: Awaited<ReturnType<typeof requireAuthUser>>
  try { user = await requireAuthUser() } catch { return unauthorized() }
  let body: Record<string, unknown>
  try { body = await req.json() } catch { return badRequest('Invalid JSON') }
  const { test_type } = body
  if (!VALID_TEST_TYPES.includes(test_type as TestType)) return badRequest('Invalid `test_type`')
  try {
    const record = await saveMockResult(user.id, {
      test_type:          test_type as TestType,
      title:              typeof body.title === 'string' ? body.title.slice(0,200) : null,
      subject_scope:      typeof body.subject_scope === 'string' ? body.subject_scope.slice(0,120) : null,
      score:              typeof body.score === 'number'           ? body.score           : null,
      max_score:          typeof body.max_score === 'number'       ? body.max_score       : 200,
      attempted:          typeof body.attempted === 'number'       ? body.attempted       : null,
      total_questions:    typeof body.total_questions === 'number' ? body.total_questions : null,
      correct_count:      typeof body.correct_count === 'number'   ? body.correct_count   : null,
      wrong_count:        typeof body.wrong_count === 'number'     ? body.wrong_count     : null,
      accuracy:           typeof body.accuracy === 'number'        ? body.accuracy        : null,
      time_spent_seconds: typeof body.time_spent_seconds === 'number' ? body.time_spent_seconds : null,
      subject_breakdown:  body.subject_breakdown ?? null,
      recommendations:    typeof body.recommendations === 'string' ? body.recommendations.slice(0,3000) : null,
    })
    return created(record)
  } catch (err) { console.error('[POST /api/test-history]', err); return serverError() }
}
