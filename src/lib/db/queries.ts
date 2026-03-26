// src/lib/db/queries.ts
// ─── All read operations. Import only in server context. ─────────────────────

import { getSupabaseServerClient } from '@/lib/supabase/server'
import type {
  DbUserProfile,
  DbAppSettingsPublic,
  DbStudyLog,
  DbPracticeRecord,
  DbWeakTopic,
  DbRevisionItem,
  DbFormulaEntry,
  DbMistakeEntry,
  DbTestRecord,
  DbTopicMastery,
  DbDailyPlan,
  DbDailyPlanTask,
} from '@/types/database'
import type { DashboardSummary, SubjectAccuracy } from '@/types/domain'

// ── Profile ──────────────────────────────────────────────────────────────────

export async function getProfile(userId: string): Promise<DbUserProfile | null> {
  const sb = getSupabaseServerClient()
  const { data, error } = await sb
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single()
  if (error) { console.error('[getProfile]', error.message); return null }
  return data
}

export async function getSettings(userId: string): Promise<DbAppSettingsPublic | null> {
  const sb = getSupabaseServerClient()
  const { data, error } = await sb
    .from('app_settings')
    // Explicitly exclude api_key_enc
    .select('id,user_id,daily_plan_mode,api_key_hint,has_custom_api_key,theme,created_at,updated_at')
    .eq('user_id', userId)
    .single()
  if (error) { console.error('[getSettings]', error.message); return null }
  return data
}

// ── Study logs ────────────────────────────────────────────────────────────────

export async function getStudyLogs(userId: string, days = 90): Promise<DbStudyLog[]> {
  const sb = getSupabaseServerClient()
  const since = new Date()
  since.setDate(since.getDate() - days)
  const { data, error } = await sb
    .from('study_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('date', since.toISOString().split('T')[0])
    .order('date', { ascending: false })
  if (error) { console.error('[getStudyLogs]', error.message); return [] }
  return data ?? []
}

// ── Practice history ──────────────────────────────────────────────────────────

export async function getRecentPracticeHistory(
  userId: string,
  limit = 200,
  subject?: string
): Promise<DbPracticeRecord[]> {
  const sb = getSupabaseServerClient()
  let q = sb
    .from('practice_history')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (subject) q = q.eq('subject', subject)
  const { data, error } = await q
  if (error) { console.error('[getRecentPracticeHistory]', error.message); return [] }
  return data ?? []
}

// ── Weak topics ───────────────────────────────────────────────────────────────

export async function getWeakTopics(
  userId: string,
  status: 'active' | 'resolved' | 'monitoring' | 'all' = 'active'
): Promise<DbWeakTopic[]> {
  const sb = getSupabaseServerClient()
  let q = sb
    .from('weak_topics')
    .select('*')
    .eq('user_id', userId)
    .order('weakness_score', { ascending: false })
  if (status !== 'all') q = q.eq('status', status)
  const { data, error } = await q
  if (error) { console.error('[getWeakTopics]', error.message); return [] }
  return data ?? []
}

// ── Revision queue ────────────────────────────────────────────────────────────

export async function getRevisionQueue(userId: string): Promise<DbRevisionItem[]> {
  const sb = getSupabaseServerClient()
  const { data, error } = await sb
    .from('revision_queue')
    .select('*')
    .eq('user_id', userId)
    .not('revision_stage', 'eq', 'suspended')
    .order('next_due_at', { ascending: true })
  if (error) { console.error('[getRevisionQueue]', error.message); return [] }
  return data ?? []
}

export async function getTodayRevisionQueue(userId: string): Promise<{
  overdue: DbRevisionItem[]
  due_today: DbRevisionItem[]
  upcoming: DbRevisionItem[]
  mastered: DbRevisionItem[]
}> {
  const all = await getRevisionQueue(userId)
  const now = new Date()
  const endOfDay = new Date(now); endOfDay.setHours(23, 59, 59, 999)

  return {
    overdue:   all.filter(r => new Date(r.next_due_at) < now && r.revision_stage !== 'mastered'),
    due_today: all.filter(r => {
      const d = new Date(r.next_due_at)
      return d >= now && d <= endOfDay && r.revision_stage !== 'mastered'
    }),
    upcoming:  all.filter(r => new Date(r.next_due_at) > endOfDay && r.revision_stage !== 'mastered'),
    mastered:  all.filter(r => r.revision_stage === 'mastered'),
  }
}

// ── Formula book ──────────────────────────────────────────────────────────────

export async function getFormulas(userId: string, subject?: string): Promise<DbFormulaEntry[]> {
  const sb = getSupabaseServerClient()
  let q = sb
    .from('formula_book')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (subject) q = q.eq('subject', subject)
  const { data, error } = await q
  if (error) { console.error('[getFormulas]', error.message); return [] }
  return data ?? []
}

// ── Mistakes ──────────────────────────────────────────────────────────────────

export async function getMistakes(
  userId: string,
  opts: { resolved?: boolean; subject?: string } = {}
): Promise<DbMistakeEntry[]> {
  const sb = getSupabaseServerClient()
  let q = sb
    .from('mistake_journal')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (opts.resolved !== undefined) q = q.eq('resolved', opts.resolved)
  if (opts.subject)                q = q.eq('subject', opts.subject)
  const { data, error } = await q
  if (error) { console.error('[getMistakes]', error.message); return [] }
  return data ?? []
}

// ── Test history ──────────────────────────────────────────────────────────────

export async function getTestHistory(userId: string, limit = 30): Promise<DbTestRecord[]> {
  const sb = getSupabaseServerClient()
  const { data, error } = await sb
    .from('test_history')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) { console.error('[getTestHistory]', error.message); return [] }
  return data ?? []
}

// ── Topic mastery ─────────────────────────────────────────────────────────────

export async function getTopicMasteryList(userId: string): Promise<DbTopicMastery[]> {
  const sb = getSupabaseServerClient()
  const { data, error } = await sb
    .from('topic_mastery')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
  if (error) { console.error('[getTopicMasteryList]', error.message); return [] }
  return data ?? []
}

// ── Daily plans ───────────────────────────────────────────────────────────────

export async function getDailyPlan(userId: string, date: string): Promise<DbDailyPlan | null> {
  const sb = getSupabaseServerClient()
  const { data, error } = await sb
    .from('daily_plans')
    .select('*')
    .eq('user_id', userId)
    .eq('plan_date', date)
    .single()
  if (error && error.code !== 'PGRST116') console.error('[getDailyPlan]', error.message)
  return data ?? null
}

export async function getDailyPlanWithTasks(userId: string, date: string): Promise<{
  plan: DbDailyPlan | null
  tasks: DbDailyPlanTask[]
}> {
  const plan = await getDailyPlan(userId, date)
  if (!plan) return { plan: null, tasks: [] }
  const sb = getSupabaseServerClient()
  const { data, error } = await sb
    .from('daily_plan_tasks')
    .select('*')
    .eq('plan_id', plan.id)
    .eq('user_id', userId)
    .order('priority', { ascending: true })
  if (error) console.error('[getDailyPlanWithTasks tasks]', error.message)
  return { plan, tasks: data ?? [] }
}

// ── Analytics summary (derived from practice_history + study_logs etc.) ───────

export async function getAnalyticsSummary(userId: string): Promise<{
  total_attempted: number
  total_correct: number
  total_wrong: number
  overall_accuracy: number
  total_hours: number
  days_studied: number
  streak_days: number
  total_tests: number
  active_weak_topics: number
  unresolved_mistakes: number
  subject_accuracy: Record<string, SubjectAccuracy>
}> {
  // Fan out queries in parallel
  const [phData, slData, wtData, mjData, thData] = await Promise.all([
    (async () => {
      const sb = getSupabaseServerClient()
      const { data } = await sb
        .from('practice_history')
        .select('subject, is_correct')
        .eq('user_id', userId)
      return data ?? []
    })(),
    (async () => {
      const sb = getSupabaseServerClient()
      const { data } = await sb
        .from('study_logs')
        .select('date, hours_logged')
        .eq('user_id', userId)
        .order('date', { ascending: false })
      return data ?? []
    })(),
    (async () => {
      const sb = getSupabaseServerClient()
      const { count } = await sb
        .from('weak_topics')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'active')
      return count ?? 0
    })(),
    (async () => {
      const sb = getSupabaseServerClient()
      const { count } = await sb
        .from('mistake_journal')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('resolved', false)
      return count ?? 0
    })(),
    (async () => {
      const sb = getSupabaseServerClient()
      const { count } = await sb
        .from('test_history')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
      return count ?? 0
    })(),
  ])

  const total     = phData.length
  const correct   = phData.filter(r => r.is_correct).length
  const wrong     = total - correct
  const accuracy  = total > 0 ? Math.round(correct / total * 100 * 10) / 10 : 0
  const totalHrs  = slData.reduce((s, l) => s + (Number(l.hours_logged) || 0), 0)
  const daysStudied = slData.length

  // Streak: consecutive days from today backwards
  const dateSet = new Set(slData.map(l => l.date as string))
  let streak = 0
  const today = new Date()
  for (let i = 0; i < 366; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().split('T')[0]
    if (dateSet.has(key)) streak++
    else break
  }

  // Per-subject accuracy
  const subjMap: Record<string, SubjectAccuracy> = {}
  phData.forEach(r => {
    const s = r.subject as string
    if (!subjMap[s]) subjMap[s] = { attempted: 0, correct: 0, wrong: 0, accuracy: 0 }
    subjMap[s].attempted++
    if (r.is_correct) subjMap[s].correct++
    else subjMap[s].wrong++
  })
  Object.values(subjMap).forEach(s => {
    s.accuracy = s.attempted > 0 ? Math.round(s.correct / s.attempted * 100) : 0
  })

  return {
    total_attempted: total, total_correct: correct, total_wrong: wrong,
    overall_accuracy: accuracy,
    total_hours: Math.round(totalHrs * 10) / 10,
    days_studied: daysStudied,
    streak_days: streak,
    total_tests: thData,
    active_weak_topics: wtData,
    unresolved_mistakes: mjData,
    subject_accuracy: subjMap,
  }
}

// ── Full dashboard summary in one call ────────────────────────────────────────

export async function getDashboardSummary(userId: string): Promise<DashboardSummary> {
  const today = new Date().toISOString().split('T')[0]

  const [profile, analytics, revisionCounts, todayPlanWithTasks] = await Promise.all([
    getProfile(userId),
    getAnalyticsSummary(userId),
    (async () => {
      const sb = getSupabaseServerClient()
      const { data } = await sb
        .from('vw_revision_due_counts')
        .select('*')
        .eq('user_id', userId)
        .single()
      return data ?? { overdue_count: 0, due_today_count: 0, mastered_count: 0, active_count: 0 }
    })(),
    getDailyPlanWithTasks(userId, today),
  ])

  return {
    profile: {
      full_name:   profile?.full_name ?? null,
      focus_mode:  profile?.focus_mode ?? 'balanced',
      daily_hours: profile?.daily_hours ?? 7,
      target_year: profile?.target_year ?? 2027,
    },
    analytics: {
      ...analytics,
      streak_days: analytics.streak_days,
    },
    revision: {
      overdue_count:   revisionCounts.overdue_count,
      due_today_count: revisionCounts.due_today_count,
      mastered_count:  revisionCounts.mastered_count,
      active_count:    revisionCounts.active_count,
    },
    today_plan: todayPlanWithTasks.plan
      ? {
          plan_id:        todayPlanWithTasks.plan.id,
          plan_date:      todayPlanWithTasks.plan.plan_date,
          status:         todayPlanWithTasks.plan.status,
          completion_pct: todayPlanWithTasks.plan.completion_pct,
          summary:        todayPlanWithTasks.plan.generated_summary,
          tasks:          todayPlanWithTasks.tasks.map(t => ({
            id:                 t.id,
            title:              t.title,
            task_type:          t.task_type,
            subject:            t.subject,
            topic:              t.topic,
            estimated_minutes:  t.estimated_minutes,
            completed:          t.completed,
            priority:           t.priority,
          })),
        }
      : null,
  }
}
