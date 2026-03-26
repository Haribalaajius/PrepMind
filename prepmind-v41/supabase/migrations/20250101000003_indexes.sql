-- =============================================================
-- PrepMind AIR-1 · Migration 003 · Indexes
-- Must run AFTER migration 001
-- =============================================================

-- ── user_profiles ───────────────────────────────────────────────
-- user_id already has unique index from the unique constraint
create index if not exists idx_user_profiles_user_id
  on public.user_profiles (user_id);

-- ── app_settings ────────────────────────────────────────────────
create index if not exists idx_app_settings_user_id
  on public.app_settings (user_id);

-- ── study_logs ──────────────────────────────────────────────────
create index if not exists idx_study_logs_user_id
  on public.study_logs (user_id);

create index if not exists idx_study_logs_user_date
  on public.study_logs (user_id, date desc);

-- ── practice_history ────────────────────────────────────────────
create index if not exists idx_ph_user_id
  on public.practice_history (user_id);

create index if not exists idx_ph_user_created
  on public.practice_history (user_id, created_at desc);

create index if not exists idx_ph_user_subject
  on public.practice_history (user_id, subject);

create index if not exists idx_ph_user_topic
  on public.practice_history (user_id, topic)
  where topic is not null;

create index if not exists idx_ph_user_correct
  on public.practice_history (user_id, is_correct);

-- ── weak_topics ─────────────────────────────────────────────────
create index if not exists idx_wt_user_id
  on public.weak_topics (user_id);

create index if not exists idx_wt_user_status
  on public.weak_topics (user_id, status);

create index if not exists idx_wt_user_subject
  on public.weak_topics (user_id, subject);

-- trigram index for fuzzy topic lookup
create index if not exists idx_wt_topic_trgm
  on public.weak_topics using gin (topic gin_trgm_ops);

-- ── revision_queue ──────────────────────────────────────────────
create index if not exists idx_rq_user_id
  on public.revision_queue (user_id);

create index if not exists idx_rq_user_next_due
  on public.revision_queue (user_id, next_due_at asc);

create index if not exists idx_rq_user_stage
  on public.revision_queue (user_id, revision_stage);

create index if not exists idx_rq_user_subject
  on public.revision_queue (user_id, subject);

-- most common query: items due NOW for a user (not yet mastered)
create index if not exists idx_rq_user_due_not_mastered
  on public.revision_queue (user_id, next_due_at)
  where revision_stage != 'mastered' and revision_stage != 'suspended';

-- ── formula_book ────────────────────────────────────────────────
create index if not exists idx_fb_user_id
  on public.formula_book (user_id);

create index if not exists idx_fb_user_subject
  on public.formula_book (user_id, subject);

-- ── mistake_journal ─────────────────────────────────────────────
create index if not exists idx_mj_user_id
  on public.mistake_journal (user_id);

create index if not exists idx_mj_user_resolved
  on public.mistake_journal (user_id, resolved);

create index if not exists idx_mj_user_subject
  on public.mistake_journal (user_id, subject);

create index if not exists idx_mj_user_type
  on public.mistake_journal (user_id, mistake_type);

create index if not exists idx_mj_user_created
  on public.mistake_journal (user_id, created_at desc);

-- ── test_history ────────────────────────────────────────────────
create index if not exists idx_th_user_id
  on public.test_history (user_id);

create index if not exists idx_th_user_created
  on public.test_history (user_id, created_at desc);

create index if not exists idx_th_user_type
  on public.test_history (user_id, test_type);

-- ── topic_mastery ────────────────────────────────────────────────
create index if not exists idx_tm_user_id
  on public.topic_mastery (user_id);

create index if not exists idx_tm_user_subject
  on public.topic_mastery (user_id, subject);

create index if not exists idx_tm_user_label
  on public.topic_mastery (user_id, mastery_label);

create index if not exists idx_tm_user_updated
  on public.topic_mastery (user_id, updated_at desc);

-- ── daily_plans ─────────────────────────────────────────────────
create index if not exists idx_dp_user_id
  on public.daily_plans (user_id);

create index if not exists idx_dp_user_date
  on public.daily_plans (user_id, plan_date desc);

create index if not exists idx_dp_user_status
  on public.daily_plans (user_id, status);

-- ── daily_plan_tasks ────────────────────────────────────────────
create index if not exists idx_dpt_plan_id
  on public.daily_plan_tasks (plan_id);

create index if not exists idx_dpt_user_id
  on public.daily_plan_tasks (user_id);

create index if not exists idx_dpt_user_completed
  on public.daily_plan_tasks (user_id, completed);

create index if not exists idx_dpt_priority
  on public.daily_plan_tasks (plan_id, priority asc);

-- ── analytics_snapshots ─────────────────────────────────────────
create index if not exists idx_as_user_date
  on public.analytics_snapshots (user_id, snapshot_date desc);
