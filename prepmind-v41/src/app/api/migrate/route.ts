// src/app/api/migrate/route.ts
// ─── One-time import from localStorage (Phase 1-3) into Supabase ─────────────
import { NextRequest } from 'next/server'
import { requireAuthUser, getSupabaseServiceClient } from '@/lib/supabase/server'
import { getProfile } from '@/lib/db/queries'
import { ok, badRequest, unauthorized, serverError } from '@/lib/utils/validation'
import type { MistakeType, FormulaSourceType, TestType } from '@/types/database'

interface MigrationResult {
  weak_topics: number
  revision_items: number
  mistakes: number
  formulas: number
  tests: number
  practice_records: number
}

export async function POST(req: NextRequest) {
  let user: Awaited<ReturnType<typeof requireAuthUser>>
  try { user = await requireAuthUser() } catch { return unauthorized() }

  // Guard: already migrated
  const profile = await getProfile(user.id)
  if (profile?.migrated_at) return ok({ already_migrated: true })

  let state: Record<string, any>
  try { const body = await req.json(); state = body.state ?? {} }
  catch { return badRequest('Invalid JSON') }

  if (!state || typeof state !== 'object') return badRequest('`state` must be an object')

  const service = getSupabaseServiceClient()
  const result: MigrationResult = { weak_topics: 0, revision_items: 0, mistakes: 0, formulas: 0, tests: 0, practice_records: 0 }

  try {
    // ── Weak topics ─────────────────────────────────────────────────
    const weakTopics: string[] = Array.isArray(state.weakTopics) ? state.weakTopics.filter((t: any) => typeof t === 'string' && t.trim()) : []
    if (weakTopics.length) {
      const rows = weakTopics.slice(0, 200).map(t => ({ user_id: user.id, subject: 'General', topic: t.trim().slice(0,120), status: 'active', weakness_score: 60 }))
      const { error } = await service.from('weak_topics').upsert(rows, { onConflict: 'user_id,topic', ignoreDuplicates: true })
      if (!error) result.weak_topics = rows.length
    }

    // ── Revision items ───────────────────────────────────────────────
    const revItems = Array.isArray(state.revisionQueue) ? state.revisionQueue :
                     Array.isArray(state.revisionItems)  ? state.revisionItems : []
    if (revItems.length) {
      const rows = revItems.slice(0, 500).map((r: any) => ({
        user_id:         user.id,
        item_type:       'topic' as const,
        subject:         String(r.subject || 'General').slice(0,120),
        topic:           String(r.topic || r.text || r.title || 'Unknown').slice(0,120),
        title:           String(r.title  || r.text || r.topic || 'Item').slice(0,200),
        revision_stage:  'new' as const,
        confidence_level: 2,
        next_due_at:     new Date().toISOString(),
      }))
      const { error } = await service.from('revision_queue').insert(rows)
      if (!error) result.revision_items = rows.length
    }

    // ── Mistakes ─────────────────────────────────────────────────────
    const mistakes = Array.isArray(state.mistakeJournal) ? state.mistakeJournal : []
    if (mistakes.length) {
      const VALID_TYPES: MistakeType[] = ['concept_gap','silly_mistake','formula_error','calculation_error','guessed_wrong','time_pressure','unknown']
      const rows = mistakes.slice(0, 500).map((m: any) => ({
        user_id:          user.id,
        subject:          String(m.subject || 'General').slice(0,120),
        topic:            m.topic ? String(m.topic).slice(0,120) : null,
        question_summary: m.questionSummary ? String(m.questionSummary).slice(0,1000) : null,
        mistake_type:     VALID_TYPES.includes(m.mistakeType as MistakeType) ? m.mistakeType as MistakeType : 'unknown',
        lesson_learned:   m.lessonLearned ? String(m.lessonLearned).slice(0,1000) : null,
        fix_action:       m.fixAction ? String(m.fixAction).slice(0,500) : null,
        severity:         [1,2,3].includes(Number(m.severity)) ? Number(m.severity) : 2,
        resolved:         Boolean(m.resolved),
      }))
      const { error } = await service.from('mistake_journal').insert(rows)
      if (!error) result.mistakes = rows.length
    }

    // ── Formulas ─────────────────────────────────────────────────────
    const formulas = Array.isArray(state.formulaBook) ? state.formulaBook : []
    if (formulas.length) {
      const rows = formulas.slice(0, 200).filter((f: any) => f.content || f.formula_content).map((f: any) => ({
        user_id:         user.id,
        subject:         String(f.subject || 'General').slice(0,120),
        topic:           String(f.topic   || 'General').slice(0,120),
        title:           String(f.title   || f.topic || 'Formula').slice(0,200),
        formula_content: String(f.content || f.formula_content || '').slice(0,5000),
        source_type:     'imported' as FormulaSourceType,
      }))
      const { error } = await service.from('formula_book').insert(rows)
      if (!error) result.formulas = rows.length
    }

    // ── Test history ──────────────────────────────────────────────────
    const tests = [...(Array.isArray(state.testHistory) ? state.testHistory : []),
                   ...(Array.isArray(state.timedTestHistory) ? state.timedTestHistory : [])]
    if (tests.length) {
      const VALID_TYPES: TestType[] = ['quick_quiz','subject_test','full_mock','weak_topic_mock','roi_mock','custom_mock','manual_entry']
      const typeMap: Record<string, TestType> = { quick:'quick_quiz', subject:'subject_test', full:'full_mock', weak:'weak_topic_mock', manual:'manual_entry', '10q':'quick_quiz', '25q':'subject_test', '65q':'full_mock' }
      const rows = tests.slice(0, 50).map((t: any) => ({
        user_id:       user.id,
        test_type:     (VALID_TYPES.includes(t.test_type) ? t.test_type : typeMap[t.type] ?? 'manual_entry') as TestType,
        title:         String(t.label || t.title || t.type || 'Imported Mock').slice(0,200),
        score:         parseFloat(t.score) || null,
        max_score:     200,
        attempted:     parseInt(t.attempted) || null,
        correct_count: parseInt(t.correct)   || null,
        wrong_count:   parseInt(t.wrong)     || null,
        accuracy:      parseFloat(t.accuracy || t.acc) || null,
      }))
      const { error } = await service.from('test_history').insert(rows)
      if (!error) result.tests = rows.length
    }

    // ── Practice history summary ──────────────────────────────────────
    const ph = Array.isArray(state.practiceHistory) ? state.practiceHistory : []
    if (ph.length) {
      const rows = ph.slice(0, 500).map((p: any) => ({
        user_id:         user.id,
        subject:         String(p.subject || 'General').slice(0,120),
        topic:           p.topic ? String(p.topic).slice(0,120) : null,
        question_type:   'mcq' as const,
        difficulty:      'medium' as const,
        correct_answer:  0,
        is_correct:      Boolean(p.isCorrect),
        source_type:     'imported' as const,
        confidence_level: typeof p.confidence === 'number' ? p.confidence : 0.5,
      }))
      const { error } = await service.from('practice_history').insert(rows)
      if (!error) result.practice_records = rows.length
    }

    // ── Mark migrated ─────────────────────────────────────────────────
    await service.from('user_profiles').update({ migrated_at: new Date().toISOString() }).eq('user_id', user.id)

    return ok({ success: true, imported: result })
  } catch (err) {
    console.error('[POST /api/migrate]', err)
    return serverError('Migration failed')
  }
}
