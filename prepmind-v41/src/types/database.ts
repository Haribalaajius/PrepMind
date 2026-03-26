// src/types/database.ts
// ─── Mirrors the Supabase schema. Keep in sync with migrations. ───────────────

// ── Enums ────────────────────────────────────────────────────────────────────

export type MistakeType =
  | 'concept_gap'
  | 'silly_mistake'
  | 'formula_error'
  | 'calculation_error'
  | 'guessed_wrong'
  | 'time_pressure'
  | 'unknown'

export type RevisionStage =
  | 'new'
  | 'revision_1'
  | 'revision_2'
  | 'revision_3'
  | 'mastered'
  | 'suspended'

export type MasteryLabel =
  | 'unseen'
  | 'started'
  | 'fragile'
  | 'improving'
  | 'strong'
  | 'exam_ready'
  | 'overconfident_risk'

export type TestType =
  | 'quick_quiz'
  | 'subject_test'
  | 'full_mock'
  | 'weak_topic_mock'
  | 'roi_mock'
  | 'custom_mock'
  | 'manual_entry'

export type SourceType =
  | 'smart_practice'
  | 'pyq_mode'
  | 'timed_test'
  | 'weak_topic_drill'
  | 'recall_trainer'
  | 'manual'
  | 'imported'

export type FocusMode =
  | 'balanced'
  | 'recovery'
  | 'aggressive'
  | 'mock_week'
  | 'final_revision'

export type RevisionItemType =
  | 'topic'
  | 'formula'
  | 'question'
  | 'concept'
  | 'mistake_pattern'
  | 'shortcut'

export type PlanTaskType =
  | 'deep_study'
  | 'practice'
  | 'revision'
  | 'mock_test'
  | 'test_analysis'
  | 'formula_drill'
  | 'recall_drill'
  | 'rest'

export type FormulaSourceType =
  | 'custom'
  | 'ai_generated'
  | 'saved_from_teach'
  | 'imported'

// ── Row types (SELECT result) ─────────────────────────────────────────────────

export interface DbUserProfile {
  id: string
  user_id: string
  full_name: string | null
  target_exam: string
  target_year: number
  daily_hours: number
  focus_mode: FocusMode
  migrated_at: string | null
  onboarded_at: string | null
  created_at: string
  updated_at: string
}

export interface DbAppSettings {
  id: string
  user_id: string
  daily_plan_mode: FocusMode
  api_key_enc: string | null     // ← never returned to the client
  api_key_hint: string | null    // safe to return (last-4 chars only)
  has_custom_api_key: boolean
  theme: 'dark' | 'light'
  created_at: string
  updated_at: string
}

/** Omit api_key_enc before sending to client */
export type DbAppSettingsPublic = Omit<DbAppSettings, 'api_key_enc'>

export interface DbStudyLog {
  id: string
  user_id: string
  date: string          // 'YYYY-MM-DD'
  hours_logged: number
  questions_solved: number
  revisions_completed: number
  mocks_taken: number
  notes: string | null
  created_at: string
}

export interface DbPracticeRecord {
  id: string
  user_id: string
  subject: string
  topic: string | null
  concept: string | null
  question_text: string | null
  question_type: 'mcq' | 'nat' | 'msq' | 'pyq'
  difficulty: 'easy' | 'medium' | 'hard' | 'trap'
  confidence_level: number | null   // 0.0–1.0
  selected_answer: number | null    // 0–3
  correct_answer: number            // 0–3
  is_correct: boolean
  source_type: SourceType
  time_taken_seconds: number | null
  created_at: string
}

export interface DbWeakTopic {
  id: string
  user_id: string
  subject: string
  topic: string
  weakness_score: number     // 0–100; higher = weaker
  weakness_reason: string | null
  status: 'active' | 'resolved' | 'monitoring'
  resolved_at: string | null
  created_at: string
  updated_at: string
}

export interface DbRevisionItem {
  id: string
  user_id: string
  item_type: RevisionItemType
  subject: string
  topic: string
  title: string
  content_ref: string | null
  notes: string | null
  confidence_level: number   // 1–5
  revision_stage: RevisionStage
  last_reviewed_at: string | null
  next_due_at: string
  review_count: number
  created_at: string
  updated_at: string
}

export interface DbFormulaEntry {
  id: string
  user_id: string
  subject: string
  topic: string
  title: string
  formula_content: string
  source_type: FormulaSourceType
  created_at: string
  updated_at: string
}

export interface DbMistakeEntry {
  id: string
  user_id: string
  subject: string
  topic: string | null
  question_summary: string | null
  mistake_type: MistakeType
  lesson_learned: string | null
  fix_action: string | null
  ai_diagnosis: string | null
  severity: 1 | 2 | 3
  resolved: boolean
  resolved_at: string | null
  created_at: string
  updated_at: string
}

export interface DbTestRecord {
  id: string
  user_id: string
  test_type: TestType
  title: string | null
  subject_scope: string | null
  score: number | null
  max_score: number
  attempted: number | null
  total_questions: number | null
  correct_count: number | null
  wrong_count: number | null
  accuracy: number | null         // 0.0–100.0
  time_spent_seconds: number | null
  subject_breakdown: SubjectBreakdown | null
  recommendations: string | null
  created_at: string
}

export interface SubjectBreakdown {
  [subject: string]: {
    correct: number
    wrong: number
    total: number
  }
}

export interface DbTopicMastery {
  id: string
  user_id: string
  subject: string
  topic: string
  mastery_score: number          // 0–100
  mastery_label: MasteryLabel
  recent_accuracy: number        // 0.0–100.0
  attempts: number
  correct: number
  recall_scores: number[]        // last 20 recall ratings (0.0–1.0)
  revision_count: number
  last_studied_at: string | null
  updated_at: string
}

export interface DbDailyPlan {
  id: string
  user_id: string
  plan_date: string              // 'YYYY-MM-DD'
  focus_mode: FocusMode
  available_hours: number
  energy_level: 'low' | 'medium' | 'high'
  generated_summary: string | null
  status: 'planned' | 'in_progress' | 'completed' | 'skipped'
  completion_pct: number
  carried_over_from: string | null
  mock_date_target: string | null
  created_at: string
  updated_at: string
}

export interface DbDailyPlanTask {
  id: string
  plan_id: string
  user_id: string
  title: string
  task_type: PlanTaskType
  subject: string | null
  topic: string | null
  priority: 1 | 2 | 3 | 4 | 5
  estimated_minutes: number
  actual_minutes: number | null
  completed: boolean
  completed_at: string | null
  source_reason: string | null
  created_at: string
  updated_at: string
}

export interface DbAnalyticsSnapshot {
  id: string
  user_id: string
  snapshot_date: string
  total_attempted: number
  total_correct: number
  total_wrong: number
  overall_accuracy: number
  subject_accuracy: Record<string, { attempted: number; correct: number; accuracy: number }>
  streak_days: number
  total_hours: number
  days_studied: number
  total_tests: number
  active_weak_count: number
  unresolved_mistakes: number
  readiness_score: number
  created_at: string
}

// ── Insert payloads (subset of columns; id, user_id, created_at auto-set) ────

export type InsertStudyLog = Omit<DbStudyLog, 'id' | 'created_at'>
export type InsertPracticeRecord = Omit<DbPracticeRecord, 'id' | 'created_at'>
export type InsertWeakTopic = Omit<DbWeakTopic, 'id' | 'created_at' | 'updated_at' | 'resolved_at'>
export type InsertRevisionItem = Omit<DbRevisionItem, 'id' | 'created_at' | 'updated_at' | 'review_count' | 'last_reviewed_at'>
export type InsertFormulaEntry = Omit<DbFormulaEntry, 'id' | 'created_at' | 'updated_at'>
export type InsertMistakeEntry = Omit<DbMistakeEntry, 'id' | 'created_at' | 'updated_at' | 'resolved_at'>
export type InsertTestRecord = Omit<DbTestRecord, 'id' | 'created_at'>
export type InsertDailyPlan = Omit<DbDailyPlan, 'id' | 'created_at' | 'updated_at'>
export type InsertDailyPlanTask = Omit<DbDailyPlanTask, 'id' | 'created_at' | 'updated_at' | 'completed_at'>

// ── Update payloads ────────────────────────────────────────────────────────────

export type UpdateUserProfile = Partial<Pick<DbUserProfile,
  'full_name' | 'daily_hours' | 'focus_mode' | 'target_year' | 'migrated_at' | 'onboarded_at'
>>

export type UpdateWeakTopic = Partial<Pick<DbWeakTopic,
  'weakness_score' | 'weakness_reason' | 'status'
>>

export type UpdateRevisionItem = Partial<Pick<DbRevisionItem,
  'title' | 'notes' | 'confidence_level' | 'revision_stage' | 'last_reviewed_at' | 'next_due_at'
>>

export type UpdateMistakeEntry = Partial<Pick<DbMistakeEntry,
  'resolved' | 'ai_diagnosis' | 'lesson_learned' | 'fix_action' | 'severity'
>>

export type UpdateDailyPlan = Partial<Pick<DbDailyPlan,
  'status' | 'completion_pct' | 'generated_summary'
>>

export type UpdateDailyPlanTask = Partial<Pick<DbDailyPlanTask,
  'completed' | 'completed_at' | 'actual_minutes'
>>
