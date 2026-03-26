// src/types/domain.ts
// ─── App-layer domain models (may combine / transform DB rows) ────────────────

import type { FocusMode, MasteryLabel, MistakeType, RevisionStage, TestType } from './database'

// ── GATE question (AI generated or from local bank) ───────────────────────────
export interface GATEQuestion {
  question: string
  options: [string, string, string, string]
  correct: 0 | 1 | 2 | 3
  explanation: string
  shortcut: string
  concept: string
  subject: string
  topic: string
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Trap'
  wrong_analysis: string
  estimated_seconds: number
  trap_type: string
}

// ── Recall drill card ──────────────────────────────────────────────────────────
export interface RecallCard {
  question: string
  answer: string
  subject: string
  topic: string
  type: 'formula' | 'concept' | 'trap' | 'shortcut'
  difficulty: 'easy' | 'medium' | 'hard'
}

export type RecallRating = 'forgot' | 'partial' | 'correct' | 'instant'

// ── Dashboard summary (assembled from multiple DB queries) ────────────────────
export interface DashboardSummary {
  profile: {
    full_name: string | null
    focus_mode: FocusMode
    daily_hours: number
    target_year: number
  }
  analytics: {
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
  }
  revision: {
    overdue_count: number
    due_today_count: number
    mastered_count: number
    active_count: number
  }
  today_plan: TodayPlan | null
}

export interface SubjectAccuracy {
  attempted: number
  correct: number
  wrong: number
  accuracy: number    // 0–100
}

// ── Today's plan summary (flat view for the Command panel) ────────────────────
export interface TodayPlan {
  plan_id: string
  plan_date: string
  status: string
  completion_pct: number
  summary: string | null
  tasks: PlanTaskSummary[]
}

export interface PlanTaskSummary {
  id: string
  title: string
  task_type: string
  subject: string | null
  topic: string | null
  estimated_minutes: number
  completed: boolean
  priority: number
}

// ── Mastery map (all topics for a user) ──────────────────────────────────────
export interface TopicMasteryMap {
  [subjectAndTopic: string]: {   // key: `${subject}::${topic}`
    subject: string
    topic: string
    mastery_score: number
    mastery_label: MasteryLabel
    recent_accuracy: number
    attempts: number
    correct: number
    last_studied_at: string | null
  }
}

// ── ROI entry (computed from mastery + syllabus metadata) ─────────────────────
export interface TopicROI {
  subject: string
  topic: string
  roi_score: number     // 0–100
  mastery_score: number
  mastery_label: MasteryLabel
  gate_weight: number   // subject weight in GATE marks
  frequency: number     // 1–10 how often it appears
}

// ── Decision engine recommendation ───────────────────────────────────────────
export interface StudyRecommendation {
  subject: string
  topic: string
  reason: string
  urgency: number         // 0.0–1.0
  action: 'practice' | 'revise' | 'teach' | 'analyze_mistakes' | 'take_mock'
  action_label: string
  action_panel: string    // nav panel id
  subject_accuracy: number
  overdue_count: number
  weak_count: number
  avoid_subject: string | null
  avoid_reason: string | null
}

// ── Mistake pattern (aggregated) ──────────────────────────────────────────────
export interface MistakePattern {
  subject: string
  mistake_type: MistakeType
  occurrence_count: number
  unresolved_count: number
  avg_severity: number
  latest_at: string
}

// ── Readiness heuristic ───────────────────────────────────────────────────────
export interface ReadinessResult {
  score: number        // 0–100
  label: 'Low' | 'Developing' | 'Competitive' | 'Strong' | 'Elite'
  color: string
  realistic_band: string
  components: ReadinessComponent[]
  bottlenecks: string[]
  fastest_lever: string
}

export interface ReadinessComponent {
  label: string
  value: number        // 0–100
  bar_pct: number
  color: string
}

// ── Offline queue item ────────────────────────────────────────────────────────
export interface OfflineQueueItem {
  id: string
  action: 'insert' | 'upsert'
  table: string
  data: Record<string, unknown>
  created_at: number   // Date.now()
  retries: number
}

// ── User preferences (subset sent to client) ──────────────────────────────────
export interface ClientUserContext {
  userId: string
  email: string
  fullName: string | null
  focusMode: FocusMode
  dailyHours: number
  targetYear: number
  hasCustomApiKey: boolean
  alreadyMigrated: boolean
}
