-- =============================================================
-- PrepMind AIR-1 · Migration 001 · Initial Schema
-- Run in Supabase: SQL Editor → New query → Run
-- =============================================================

-- ── Extensions ─────────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";          -- fuzzy text search on topics

-- ── Enums ──────────────────────────────────────────────────────
do $$ begin
  -- mistake types
  if not exists (select 1 from pg_type where typname = 'mistake_type') then
    create type public.mistake_type as enum (
      'concept_gap', 'silly_mistake', 'formula_error',
      'calculation_error', 'guessed_wrong', 'time_pressure', 'unknown'
    );
  end if;

  -- revision stages (spaced-repetition ladder)
  if not exists (select 1 from pg_type where typname = 'revision_stage') then
    create type public.revision_stage as enum (
      'new', 'revision_1', 'revision_2', 'revision_3', 'mastered', 'suspended'
    );
  end if;

  -- mastery labels
  if not exists (select 1 from pg_type where typname = 'mastery_label') then
    create type public.mastery_label as enum (
      'unseen', 'started', 'fragile', 'improving',
      'strong', 'exam_ready', 'overconfident_risk'
    );
  end if;

  -- test types
  if not exists (select 1 from pg_type where typname = 'test_type') then
    create type public.test_type as enum (
      'quick_quiz', 'subject_test', 'full_mock',
      'weak_topic_mock', 'roi_mock', 'custom_mock', 'manual_entry'
    );
  end if;

  -- practice source types
  if not exists (select 1 from pg_type where typname = 'source_type') then
    create type public.source_type as enum (
      'smart_practice', 'pyq_mode', 'timed_test', 'weak_topic_drill',
      'recall_trainer', 'manual', 'imported'
    );
  end if;

  -- focus modes
  if not exists (select 1 from pg_type where typname = 'focus_mode') then
    create type public.focus_mode as enum (
      'balanced', 'recovery', 'aggressive', 'mock_week', 'final_revision'
    );
  end if;

  -- revision item types
  if not exists (select 1 from pg_type where typname = 'revision_item_type') then
    create type public.revision_item_type as enum (
      'topic', 'formula', 'question', 'concept', 'mistake_pattern', 'shortcut'
    );
  end if;

  -- plan task types
  if not exists (select 1 from pg_type where typname = 'plan_task_type') then
    create type public.plan_task_type as enum (
      'deep_study', 'practice', 'revision', 'mock_test',
      'test_analysis', 'formula_drill', 'recall_drill', 'rest'
    );
  end if;

  -- formula source
  if not exists (select 1 from pg_type where typname = 'formula_source_type') then
    create type public.formula_source_type as enum (
      'custom', 'ai_generated', 'saved_from_teach', 'imported'
    );
  end if;

end $$;

-- ── user_profiles ───────────────────────────────────────────────
create table if not exists public.user_profiles (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null unique references auth.users(id) on delete cascade,
  full_name       text,
  target_exam     text not null default 'GATE EC'
                    check (length(target_exam) > 0 and length(target_exam) <= 100),
  target_year     integer not null default 2027
                    check (target_year >= 2024 and target_year <= 2035),
  daily_hours     integer not null default 7
                    check (daily_hours >= 1 and daily_hours <= 20),
  focus_mode      public.focus_mode not null default 'balanced',
  migrated_at     timestamptz,
  onboarded_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ── app_settings ────────────────────────────────────────────────
create table if not exists public.app_settings (
  id                   uuid primary key default uuid_generate_v4(),
  user_id              uuid not null unique references auth.users(id) on delete cascade,
  daily_plan_mode      public.focus_mode not null default 'balanced',
  -- API key stored encrypted; key never returned to client
  api_key_enc          text,
  api_key_hint         text
                         check (api_key_hint is null or length(api_key_hint) <= 20),
  has_custom_api_key   boolean not null default false,
  theme                text not null default 'dark'
                         check (theme in ('dark', 'light')),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- ── study_logs ──────────────────────────────────────────────────
create table if not exists public.study_logs (
  id                   uuid primary key default uuid_generate_v4(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  date                 date not null,
  hours_logged         numeric(5,2) not null default 0
                         check (hours_logged >= 0 and hours_logged <= 24),
  questions_solved     integer not null default 0 check (questions_solved >= 0),
  revisions_completed  integer not null default 0 check (revisions_completed >= 0),
  mocks_taken          integer not null default 0 check (mocks_taken >= 0),
  notes                text check (notes is null or length(notes) <= 1000),
  created_at           timestamptz not null default now(),
  constraint study_logs_user_date_unique unique (user_id, date)
);

-- ── practice_history ────────────────────────────────────────────
create table if not exists public.practice_history (
  id                   uuid primary key default uuid_generate_v4(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  subject              text not null check (length(subject) > 0 and length(subject) <= 120),
  topic                text check (topic is null or length(topic) <= 120),
  concept              text check (concept is null or length(concept) <= 200),
  question_text        text check (question_text is null or length(question_text) <= 2000),
  question_type        text not null default 'mcq'
                         check (question_type in ('mcq', 'nat', 'msq', 'pyq')),
  difficulty           text not null default 'medium'
                         check (difficulty in ('easy', 'medium', 'hard', 'trap')),
  -- 0.0 = no confidence / guessing; 1.0 = fully confident
  confidence_level     numeric(3,2) check (confidence_level is null or (confidence_level >= 0 and confidence_level <= 1)),
  selected_answer      integer check (selected_answer is null or (selected_answer >= 0 and selected_answer <= 3)),
  correct_answer       integer not null check (correct_answer >= 0 and correct_answer <= 3),
  is_correct           boolean not null,
  source_type          public.source_type not null default 'smart_practice',
  time_taken_seconds   integer check (time_taken_seconds is null or time_taken_seconds > 0),
  created_at           timestamptz not null default now()
);

-- ── weak_topics ─────────────────────────────────────────────────
create table if not exists public.weak_topics (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  subject          text not null check (length(subject) > 0 and length(subject) <= 120),
  topic            text not null check (length(topic) > 0 and length(topic) <= 120),
  -- 0–100 heuristic score; higher = weaker
  weakness_score   integer not null default 60
                     check (weakness_score >= 0 and weakness_score <= 100),
  weakness_reason  text check (weakness_reason is null or length(weakness_reason) <= 500),
  -- active | resolved
  status           text not null default 'active'
                     check (status in ('active', 'resolved', 'monitoring')),
  resolved_at      timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint weak_topics_user_topic_unique unique (user_id, topic)
);

-- ── revision_queue ──────────────────────────────────────────────
create table if not exists public.revision_queue (
  id                uuid primary key default uuid_generate_v4(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  item_type         public.revision_item_type not null default 'topic',
  subject           text not null check (length(subject) > 0 and length(subject) <= 120),
  topic             text not null check (length(topic) > 0 and length(topic) <= 120),
  title             text not null check (length(title) > 0 and length(title) <= 200),
  content_ref       text check (content_ref is null or length(content_ref) <= 500),
  notes             text check (notes is null or length(notes) <= 1000),
  -- 1 = very low confidence; 5 = very high
  confidence_level  integer not null default 2
                      check (confidence_level >= 1 and confidence_level <= 5),
  revision_stage    public.revision_stage not null default 'new',
  last_reviewed_at  timestamptz,
  next_due_at       timestamptz not null default now(),
  -- how many times this has been reviewed
  review_count      integer not null default 0 check (review_count >= 0),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ── formula_book ────────────────────────────────────────────────
create table if not exists public.formula_book (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  subject          text not null check (length(subject) > 0 and length(subject) <= 120),
  topic            text not null check (length(topic) > 0 and length(topic) <= 120),
  title            text not null check (length(title) > 0 and length(title) <= 200),
  formula_content  text not null check (length(formula_content) > 0 and length(formula_content) <= 5000),
  source_type      public.formula_source_type not null default 'custom',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ── mistake_journal ─────────────────────────────────────────────
create table if not exists public.mistake_journal (
  id                uuid primary key default uuid_generate_v4(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  subject           text not null check (length(subject) > 0 and length(subject) <= 120),
  topic             text check (topic is null or length(topic) <= 120),
  question_summary  text check (question_summary is null or length(question_summary) <= 1000),
  mistake_type      public.mistake_type not null default 'unknown',
  lesson_learned    text check (lesson_learned is null or length(lesson_learned) <= 1000),
  fix_action        text check (fix_action is null or length(fix_action) <= 500),
  ai_diagnosis      text check (ai_diagnosis is null or length(ai_diagnosis) <= 2000),
  -- 1=minor, 2=moderate, 3=severe
  severity          integer not null default 2
                      check (severity >= 1 and severity <= 3),
  resolved          boolean not null default false,
  resolved_at       timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ── test_history ────────────────────────────────────────────────
create table if not exists public.test_history (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  test_type           public.test_type not null,
  title               text check (title is null or length(title) <= 200),
  subject_scope       text check (subject_scope is null or length(subject_scope) <= 120),
  score               numeric(7,2) check (score is null or score >= 0),
  max_score           numeric(7,2) not null default 200,
  attempted           integer check (attempted is null or (attempted >= 0 and attempted <= 200)),
  total_questions     integer check (total_questions is null or total_questions > 0),
  correct_count       integer check (correct_count is null or correct_count >= 0),
  wrong_count         integer check (wrong_count is null or wrong_count >= 0),
  -- 0.0–100.0
  accuracy            numeric(5,2) check (accuracy is null or (accuracy >= 0 and accuracy <= 100)),
  time_spent_seconds  integer check (time_spent_seconds is null or time_spent_seconds > 0),
  -- jsonb: { "Networks": { correct: 3, wrong: 1, total: 4 }, ... }
  subject_breakdown   jsonb,
  recommendations     text check (recommendations is null or length(recommendations) <= 3000),
  created_at          timestamptz not null default now(),
  -- guard: can't have more correct than attempted
  constraint test_history_correct_lte_attempted
    check (correct_count is null or attempted is null or correct_count <= attempted)
);

-- ── topic_mastery ────────────────────────────────────────────────
create table if not exists public.topic_mastery (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  subject          text not null check (length(subject) > 0 and length(subject) <= 120),
  topic            text not null check (length(topic) > 0 and length(topic) <= 120),
  -- 0–100 computed heuristic
  mastery_score    integer not null default 0
                     check (mastery_score >= 0 and mastery_score <= 100),
  mastery_label    public.mastery_label not null default 'unseen',
  -- derived from recent practice_history
  recent_accuracy  numeric(5,2) not null default 0
                     check (recent_accuracy >= 0 and recent_accuracy <= 100),
  attempts         integer not null default 0 check (attempts >= 0),
  correct          integer not null default 0 check (correct >= 0),
  -- json array of last 20 recall rating scores (0.0–1.0)
  recall_scores    jsonb not null default '[]'::jsonb,
  revision_count   integer not null default 0 check (revision_count >= 0),
  last_studied_at  timestamptz,
  updated_at       timestamptz not null default now(),
  constraint topic_mastery_user_subject_topic_unique unique (user_id, subject, topic),
  constraint topic_mastery_correct_lte_attempts
    check (correct <= attempts)
);

-- ── daily_plans ─────────────────────────────────────────────────
create table if not exists public.daily_plans (
  id                       uuid primary key default uuid_generate_v4(),
  user_id                  uuid not null references auth.users(id) on delete cascade,
  plan_date                date not null,
  focus_mode               public.focus_mode not null default 'balanced',
  available_hours          integer not null default 6
                             check (available_hours >= 1 and available_hours <= 20),
  energy_level             text not null default 'medium'
                             check (energy_level in ('low', 'medium', 'high')),
  generated_summary        text check (generated_summary is null or length(generated_summary) <= 5000),
  -- planned | in_progress | completed | skipped
  status                   text not null default 'planned'
                             check (status in ('planned', 'in_progress', 'completed', 'skipped')),
  completion_pct           integer not null default 0
                             check (completion_pct >= 0 and completion_pct <= 100),
  carried_over_from        date,
  mock_date_target         date,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  constraint daily_plans_user_date_unique unique (user_id, plan_date)
);

-- ── daily_plan_tasks ────────────────────────────────────────────
create table if not exists public.daily_plan_tasks (
  id                uuid primary key default uuid_generate_v4(),
  plan_id           uuid not null references public.daily_plans(id) on delete cascade,
  user_id           uuid not null references auth.users(id) on delete cascade,
  title             text not null check (length(title) > 0 and length(title) <= 300),
  task_type         public.plan_task_type not null,
  subject           text check (subject is null or length(subject) <= 120),
  topic             text check (topic is null or length(topic) <= 120),
  -- 1 = top priority; lower = lower
  priority          integer not null default 2
                      check (priority >= 1 and priority <= 5),
  estimated_minutes integer not null default 30
                      check (estimated_minutes >= 5 and estimated_minutes <= 480),
  actual_minutes    integer check (actual_minutes is null or actual_minutes >= 0),
  completed         boolean not null default false,
  completed_at      timestamptz,
  source_reason     text check (source_reason is null or length(source_reason) <= 500),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ── analytics_snapshots ─────────────────────────────────────────
-- Periodic denormalized cache so analytics pages load fast without
-- scanning large practice_history tables every request.
create table if not exists public.analytics_snapshots (
  id                uuid primary key default uuid_generate_v4(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  snapshot_date     date not null,
  -- overall
  total_attempted   integer not null default 0,
  total_correct     integer not null default 0,
  total_wrong       integer not null default 0,
  overall_accuracy  numeric(5,2) not null default 0,
  -- per-subject jsonb: { "Networks": { attempted, correct, accuracy } }
  subject_accuracy  jsonb not null default '{}'::jsonb,
  -- streak at time of snapshot
  streak_days       integer not null default 0,
  total_hours       numeric(7,2) not null default 0,
  days_studied      integer not null default 0,
  total_tests       integer not null default 0,
  active_weak_count integer not null default 0,
  unresolved_mistakes integer not null default 0,
  -- readiness heuristic 0–100
  readiness_score   integer not null default 0,
  created_at        timestamptz not null default now(),
  constraint analytics_snapshots_user_date_unique unique (user_id, snapshot_date)
);
