// src/app/api/sync/route.ts
import { NextRequest } from 'next/server'
import { requireAuthUser, getSupabaseServerClient } from '@/lib/supabase/server'
import { ok, badRequest, unauthorized, serverError } from '@/lib/utils/validation'
import type { OfflineQueueItem } from '@/types/domain'

const ALLOWED_TABLES = new Set([
  'practice_history','weak_topics','revision_queue','formula_book',
  'mistake_journal','test_history','study_logs','topic_mastery','daily_plans','daily_plan_tasks',
])

export async function POST(req: NextRequest) {
  let user: Awaited<ReturnType<typeof requireAuthUser>>
  try { user = await requireAuthUser() } catch { return unauthorized() }

  let item: OfflineQueueItem
  try { item = await req.json() } catch { return badRequest('Invalid JSON') }

  if (!ALLOWED_TABLES.has(item.table)) return badRequest(`Table not allowed: ${item.table}`)
  if (!['insert','upsert'].includes(item.action)) return badRequest(`Action not allowed: ${item.action}`)

  // Always enforce user ownership — client cannot spoof another user's data
  const data = { ...item.data, user_id: user.id }

  const sb = getSupabaseServerClient()
  try {
    if (item.action === 'insert') {
      const { error } = await sb.from(item.table as any).insert(data)
      if (error) throw error
    } else {
      const { error } = await sb.from(item.table as any).upsert(data)
      if (error) throw error
    }
    return ok({ success: true })
  } catch (err: any) {
    // 23505 = unique_violation — not a true failure for upserts
    if (err?.code === '23505') return ok({ success: true, note: 'duplicate ignored' })
    console.error('[POST /api/sync]', err)
    return serverError(err?.message ?? 'Sync failed')
  }
}
