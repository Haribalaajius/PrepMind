// src/lib/db/mutations.ts
// ─── All write operations. Import only in server context. ────────────────────

import { getSupabaseServerClient } from '@/lib/supabase/server'
import type {
  InsertPracticeRecord,
  InsertWeakTopic,
  InsertRevisionItem,
  InsertFormulaEntry,
  InsertMistakeEntry,
  InsertTestRecord,
  InsertStudyLog,
  InsertDailyPlan,
  InsertDailyPlanTask,
  UpdateUserProfile,
  UpdateWeakTopic,
  UpdateRevisionItem,
  UpdateMistakeEntry,
  UpdateDailyPlan,
  UpdateDailyPlanTask,
  DbUserProfile,
  DbPracticeRecord,
  DbWeakTopic,
  DbRevisionItem,
  DbFormulaEntry,
  DbMistakeEntry,
  DbTestRecord,
  DbStudyLog,
  DbDailyPlan,
  DbDailyPlanTask,
} from '@/types/database'

// ── Profile ──────────────────────────────────────────────────────────────────

export async function upsertProfile(
  userId: string,
  updates: UpdateUserProfile
): Promise<DbUserProfile> {
  const sb = getSupabaseServerClient()
  const { data, error } = await sb
    .from('user_profiles')
    .upsert({ user_id: userId, ...updates }, { onConflict: 'user_id' })
    .select()
    .single()
  if (error) throw new Error(`[upsertProfile] ${error.message}`)
  return data
}

// ── Study logs ────────────────────────────────────────────────────────────────

/**
 * Upsert a study log for a given date, INCREMENTING existing values.
 * Safe to call multiple times per day.
 */
export async function upsertStudyLog(
  userId: string,
  date: string,
  increments: Partial<Pick<InsertStudyLog, 'hours_logged' | 'questions_solved' | 'revisions_completed' | 'mocks_taken'>>,
  notes?: string
): Promise<DbStudyLog> {
  const sb = getSupabaseServerClient()
  // Read existing first to increment safely
  const { data: existing } = await sb
    .from('study_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .single()

  const updated = {
    user_id:             userId,
    date,
    hours_logged:        (Number(existing?.hours_logged) || 0) + (increments.hours_logged || 0),
    questions_solved:    (existing?.questions_solved || 0) + (increments.questions_solved || 0),
    revisions_completed: (existing?.revisions_completed || 0) + (increments.revisions_completed || 0),
    mocks_taken:         (existing?.mocks_taken || 0) + (increments.mocks_taken || 0),
    notes:               notes ?? existing?.notes ?? null,
  }

  const { data, error } = await sb
    .from('study_logs')
    .upsert(updated, { onConflict: 'user_id,date' })
    .select()
    .single()
  if (error) throw new Error(`[upsertStudyLog] ${error.message}`)
  return data
}

// ── Practice history ──────────────────────────────────────────────────────────

export async function savePracticeAttempt(
  userId: string,
  payload: Omit<InsertPracticeRecord, 'user_id'>
): Promise<DbPracticeRecord> {
  const sb = getSupabaseServerClient()
  const { data, error } = await sb
    .from('practice_history')
    .insert({ user_id: userId, ...payload })
    .select()
    .single()
  if (error) throw new Error(`[savePracticeAttempt] ${error.message}`)

  // Fire-and-forget: update mastery via SQL function (no await needed for UI)
  if (payload.topic && payload.subject) {
    sb.rpc('fn_upsert_topic_mastery', {
      p_user_id:    userId,
      p_subject:    payload.subject,
      p_topic:      payload.topic,
      p_is_correct: payload.is_correct,
      p_confidence: payload.confidence_level ?? 0.5,
    }).then(({ error: e }) => {
      if (e) console.error('[fn_upsert_topic_mastery]', e.message)
    })
  }

  // Also increment today's questions_solved in study_logs
  const today = new Date().toISOString().split('T')[0]
  upsertStudyLog(userId, today, { questions_solved: 1 }).catch(console.error)

  return data
}

// ── Weak topics ───────────────────────────────────────────────────────────────

export async function upsertWeakTopic(
  userId: string,
  payload: Omit<InsertWeakTopic, 'user_id'>
): Promise<DbWeakTopic> {
  const sb = getSupabaseServerClient()
  const { data, error } = await sb
    .from('weak_topics')
    .upsert(
      { user_id: userId, ...payload },
      { onConflict: 'user_id,topic' }
    )
    .select()
    .single()
  if (error) throw new Error(`[upsertWeakTopic] ${error.message}`)
  return data
}

export async function updateWeakTopic(
  userId: string,
  id: string,
  updates: UpdateWeakTopic
): Promise<void> {
  const sb = getSupabaseServerClient()
  const { error } = await sb
    .from('weak_topics')
    .update(updates)
    .eq('id', id)
    .eq('user_id', userId)
  if (error) throw new Error(`[updateWeakTopic] ${error.message}`)
}

export async function resolveWeakTopic(userId: string, id: string): Promise<void> {
  const sb = getSupabaseServerClient()
  const { error } = await sb
    .from('weak_topics')
    .update({ status: 'resolved', resolved_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId)
  if (error) throw new Error(`[resolveWeakTopic] ${error.message}`)
}

// ── Revision queue ────────────────────────────────────────────────────────────

export async function addRevisionItem(
  userId: string,
  payload: Omit<InsertRevisionItem, 'user_id'>
): Promise<DbRevisionItem> {
  const sb = getSupabaseServerClient()
  const { data, error } = await sb
    .from('revision_queue')
    .insert({ user_id: userId, ...payload })
    .select()
    .single()
  if (error) throw new Error(`[addRevisionItem] ${error.message}`)
  return data
}

export async function advanceRevisionStage(
  userId: string,
  itemId: string,
  direction: 'advance' | 'reset' | 'suspend' | 'master'
): Promise<string> {
  const sb = getSupabaseServerClient()
  const { data, error } = await sb.rpc('fn_advance_revision_stage', {
    p_user_id:   userId,
    p_item_id:   itemId,
    p_direction: direction,
  })
  if (error) throw new Error(`[advanceRevisionStage] ${error.message}`)
  return data as string
}

export async function updateRevisionItem(
  userId: string,
  id: string,
  updates: UpdateRevisionItem
): Promise<void> {
  const sb = getSupabaseServerClient()
  const { error } = await sb
    .from('revision_queue')
    .update(updates)
    .eq('id', id)
    .eq('user_id', userId)
  if (error) throw new Error(`[updateRevisionItem] ${error.message}`)
}

export async function deleteRevisionItem(userId: string, id: string): Promise<void> {
  const sb = getSupabaseServerClient()
  const { error } = await sb
    .from('revision_queue')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
  if (error) throw new Error(`[deleteRevisionItem] ${error.message}`)
}

// ── Formula book ──────────────────────────────────────────────────────────────

export async function saveFormula(
  userId: string,
  payload: Omit<InsertFormulaEntry, 'user_id'>
): Promise<DbFormulaEntry> {
  const sb = getSupabaseServerClient()
  const { data, error } = await sb
    .from('formula_book')
    .insert({ user_id: userId, ...payload })
    .select()
    .single()
  if (error) throw new Error(`[saveFormula] ${error.message}`)
  return data
}

export async function deleteFormula(userId: string, id: string): Promise<void> {
  const sb = getSupabaseServerClient()
  const { error } = await sb
    .from('formula_book')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
  if (error) throw new Error(`[deleteFormula] ${error.message}`)
}

// ── Mistakes ──────────────────────────────────────────────────────────────────

export async function saveMistake(
  userId: string,
  payload: Omit<InsertMistakeEntry, 'user_id'>
): Promise<DbMistakeEntry> {
  const sb = getSupabaseServerClient()
  const { data, error } = await sb
    .from('mistake_journal')
    .insert({ user_id: userId, ...payload })
    .select()
    .single()
  if (error) throw new Error(`[saveMistake] ${error.message}`)
  return data
}

export async function updateMistake(
  userId: string,
  id: string,
  updates: UpdateMistakeEntry
): Promise<void> {
  const sb = getSupabaseServerClient()
  const payload: Record<string, unknown> = { ...updates }
  if (updates.resolved === true && !('resolved_at' in updates)) {
    payload.resolved_at = new Date().toISOString()
  }
  const { error } = await sb
    .from('mistake_journal')
    .update(payload)
    .eq('id', id)
    .eq('user_id', userId)
  if (error) throw new Error(`[updateMistake] ${error.message}`)
}

export async function deleteMistake(userId: string, id: string): Promise<void> {
  const sb = getSupabaseServerClient()
  const { error } = await sb
    .from('mistake_journal')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
  if (error) throw new Error(`[deleteMistake] ${error.message}`)
}

// ── Test history ──────────────────────────────────────────────────────────────

export async function saveMockResult(
  userId: string,
  payload: Omit<InsertTestRecord, 'user_id'>
): Promise<DbTestRecord> {
  const sb = getSupabaseServerClient()
  const { data, error } = await sb
    .from('test_history')
    .insert({ user_id: userId, ...payload })
    .select()
    .single()
  if (error) throw new Error(`[saveMockResult] ${error.message}`)

  // Also bump mocks_taken in today's study log
  const today = new Date().toISOString().split('T')[0]
  upsertStudyLog(userId, today, { mocks_taken: 1 }).catch(console.error)

  return data
}

// ── Daily plans ───────────────────────────────────────────────────────────────

export async function saveDailyPlan(
  userId: string,
  date: string,
  payload: Omit<InsertDailyPlan, 'user_id' | 'plan_date'>
): Promise<DbDailyPlan> {
  const sb = getSupabaseServerClient()
  const { data, error } = await sb
    .from('daily_plans')
    .upsert(
      { user_id: userId, plan_date: date, ...payload },
      { onConflict: 'user_id,plan_date' }
    )
    .select()
    .single()
  if (error) throw new Error(`[saveDailyPlan] ${error.message}`)
  return data
}

export async function updateDailyPlan(
  userId: string,
  id: string,
  updates: UpdateDailyPlan
): Promise<void> {
  const sb = getSupabaseServerClient()
  const { error } = await sb
    .from('daily_plans')
    .update(updates)
    .eq('id', id)
    .eq('user_id', userId)
  if (error) throw new Error(`[updateDailyPlan] ${error.message}`)
}

export async function insertPlanTasks(
  userId: string,
  planId: string,
  tasks: Omit<InsertDailyPlanTask, 'user_id' | 'plan_id'>[]
): Promise<DbDailyPlanTask[]> {
  if (!tasks.length) return []
  const sb = getSupabaseServerClient()
  const { data, error } = await sb
    .from('daily_plan_tasks')
    .insert(tasks.map(t => ({ ...t, user_id: userId, plan_id: planId })))
    .select()
  if (error) throw new Error(`[insertPlanTasks] ${error.message}`)
  return data ?? []
}

export async function completePlanTask(
  userId: string,
  taskId: string,
  actualMinutes?: number
): Promise<void> {
  const sb = getSupabaseServerClient()
  const updates: UpdateDailyPlanTask = {
    completed:    true,
    completed_at: new Date().toISOString(),
    actual_minutes: actualMinutes,
  }
  const { error } = await sb
    .from('daily_plan_tasks')
    .update(updates)
    .eq('id', taskId)
    .eq('user_id', userId)
  if (error) throw new Error(`[completePlanTask] ${error.message}`)

  // Also update completion_pct on the parent plan
  const { data: plan } = await sb
    .from('daily_plan_tasks')
    .select('plan_id')
    .eq('id', taskId)
    .single()
  if (plan?.plan_id) {
    const { data: allTasks } = await sb
      .from('daily_plan_tasks')
      .select('completed')
      .eq('plan_id', plan.plan_id)
    if (allTasks) {
      const pct = Math.round(allTasks.filter(t => t.completed).length / allTasks.length * 100)
      await sb
        .from('daily_plans')
        .update({ completion_pct: pct, status: pct === 100 ? 'completed' : 'in_progress' })
        .eq('id', plan.plan_id)
        .eq('user_id', userId)
    }
  }
}

// ── Settings ──────────────────────────────────────────────────────────────────

/**
 * Save API key encrypted. The key is stored as simple XOR-encrypted base64.
 * For higher security use Supabase Vault or a KMS — but this prevents it
 * sitting in the database in plaintext.
 */
function xorEncrypt(text: string, secret: string): string {
  let result = ''
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ secret.charCodeAt(i % secret.length))
  }
  return Buffer.from(result, 'binary').toString('base64')
}

export async function saveApiKey(userId: string, apiKey: string): Promise<void> {
  if (!apiKey || !apiKey.startsWith('sk-ant-')) {
    throw new Error('Invalid Anthropic API key format')
  }
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 32) ?? 'prepmind-fallback-encrypt-32chars'
  const enc = xorEncrypt(apiKey, secret)
  const hint = '•••• ' + apiKey.slice(-4)
  const sb = getSupabaseServerClient()
  const { error } = await sb
    .from('app_settings')
    .upsert(
      { user_id: userId, api_key_enc: enc, api_key_hint: hint, has_custom_api_key: true },
      { onConflict: 'user_id' }
    )
  if (error) throw new Error(`[saveApiKey] ${error.message}`)
}

export async function getDecryptedApiKey(userId: string): Promise<string | null> {
  const sb = getSupabaseServerClient()
  const { data, error } = await sb
    .from('app_settings')
    .select('api_key_enc')
    .eq('user_id', userId)
    .single()
  if (error || !data?.api_key_enc) return null
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 32) ?? 'prepmind-fallback-encrypt-32chars'
  const binary = Buffer.from(data.api_key_enc, 'base64').toString('binary')
  let result = ''
  for (let i = 0; i < binary.length; i++) {
    result += String.fromCharCode(binary.charCodeAt(i) ^ secret.charCodeAt(i % secret.length))
  }
  return result
}

export async function removeApiKey(userId: string): Promise<void> {
  const sb = getSupabaseServerClient()
  const { error } = await sb
    .from('app_settings')
    .update({ api_key_enc: null, api_key_hint: null, has_custom_api_key: false })
    .eq('user_id', userId)
  if (error) throw new Error(`[removeApiKey] ${error.message}`)
}
