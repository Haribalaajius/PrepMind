// src/app/api/daily-plans/route.ts
import { NextRequest } from 'next/server'
import { requireAuthUser } from '@/lib/supabase/server'
import { saveDailyPlan, updateDailyPlan, insertPlanTasks, completePlanTask } from '@/lib/db/mutations'
import { getDailyPlanWithTasks } from '@/lib/db/queries'
import { ok, created, badRequest, unauthorized, serverError } from '@/lib/utils/validation'
import { isValidFocusMode } from '@/lib/utils/validation'

export async function GET(req: NextRequest) {
  let user: Awaited<ReturnType<typeof requireAuthUser>>
  try { user = await requireAuthUser() } catch { return unauthorized() }
  const date = new URL(req.url).searchParams.get('date') ?? new Date().toISOString().split('T')[0]
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return badRequest('Invalid `date` format (YYYY-MM-DD)')
  try { return ok(await getDailyPlanWithTasks(user.id, date)) }
  catch (err) { console.error('[GET /api/daily-plans]', err); return serverError() }
}

export async function POST(req: NextRequest) {
  let user: Awaited<ReturnType<typeof requireAuthUser>>
  try { user = await requireAuthUser() } catch { return unauthorized() }
  let body: Record<string, unknown>
  try { body = await req.json() } catch { return badRequest('Invalid JSON') }

  const date = typeof body.plan_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.plan_date)
    ? body.plan_date : new Date().toISOString().split('T')[0]

  try {
    const plan = await saveDailyPlan(user.id, date, {
      focus_mode:       isValidFocusMode(body.focus_mode) ? body.focus_mode : 'balanced',
      available_hours:  typeof body.available_hours === 'number' ? Math.min(20, Math.max(1, body.available_hours)) : 6,
      energy_level:     ['low','medium','high'].includes(body.energy_level as string) ? body.energy_level as 'low'|'medium'|'high' : 'medium',
      generated_summary: typeof body.generated_summary === 'string' ? body.generated_summary.slice(0,5000) : null,
      status:           'planned',
      completion_pct:   0,
      carried_over_from: null,
      mock_date_target: typeof body.mock_date_target === 'string' ? body.mock_date_target : null,
    })

    // Insert tasks if provided
    const tasks = Array.isArray(body.tasks) ? body.tasks : []
    let insertedTasks: any[] = []
    if (tasks.length) {
      insertedTasks = await insertPlanTasks(user.id, plan.id, tasks.map((t: any) => ({
        title:             typeof t.title === 'string' ? t.title.slice(0,300) : 'Task',
        task_type:         t.task_type ?? 'practice',
        subject:           typeof t.subject === 'string' ? t.subject.slice(0,120) : null,
        topic:             typeof t.topic   === 'string' ? t.topic.slice(0,120) : null,
        priority:          [1,2,3,4,5].includes(t.priority) ? t.priority : 2,
        estimated_minutes: typeof t.estimated_minutes === 'number' ? Math.min(480, Math.max(5, t.estimated_minutes)) : 30,
        source_reason:     typeof t.source_reason === 'string' ? t.source_reason.slice(0,500) : null,
        completed:         false,
      })))
    }

    return created({ plan, tasks: insertedTasks })
  } catch (err) { console.error('[POST /api/daily-plans]', err); return serverError() }
}

export async function PATCH(req: NextRequest) {
  let user: Awaited<ReturnType<typeof requireAuthUser>>
  try { user = await requireAuthUser() } catch { return unauthorized() }
  let body: Record<string, unknown>
  try { body = await req.json() } catch { return badRequest('Invalid JSON') }

  // Complete a task
  if (body.action === 'complete_task') {
    const { task_id } = body
    if (typeof task_id !== 'string') return badRequest('`task_id` required')
    try {
      await completePlanTask(user.id, task_id, typeof body.actual_minutes === 'number' ? body.actual_minutes : undefined)
      return ok({ success: true })
    } catch (err) { console.error('[PATCH /api/daily-plans complete_task]', err); return serverError() }
  }

  // Update plan
  const { id } = body
  if (typeof id !== 'string') return badRequest('`id` required')
  const updates: Parameters<typeof updateDailyPlan>[2] = {}
  if (['planned','in_progress','completed','skipped'].includes(body.status as string)) updates.status = body.status as any
  if (typeof body.completion_pct === 'number') updates.completion_pct = Math.min(100, Math.max(0, body.completion_pct))
  if (typeof body.generated_summary === 'string') updates.generated_summary = body.generated_summary.slice(0,5000)
  try { await updateDailyPlan(user.id, id, updates); return ok({ success: true }) }
  catch (err) { console.error('[PATCH /api/daily-plans]', err); return serverError() }
}
