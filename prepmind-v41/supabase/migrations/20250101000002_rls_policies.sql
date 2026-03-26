-- =============================================================
-- PrepMind AIR-1 · Migration 002 · Row Level Security Policies
-- Must run AFTER migration 001
-- =============================================================

-- ── Helper: enable RLS ─────────────────────────────────────────
-- (idempotent — safe to run multiple times)

alter table public.user_profiles       enable row level security;
alter table public.app_settings        enable row level security;
alter table public.study_logs          enable row level security;
alter table public.practice_history    enable row level security;
alter table public.weak_topics         enable row level security;
alter table public.revision_queue      enable row level security;
alter table public.formula_book        enable row level security;
alter table public.mistake_journal     enable row level security;
alter table public.test_history        enable row level security;
alter table public.topic_mastery       enable row level security;
alter table public.daily_plans         enable row level security;
alter table public.daily_plan_tasks    enable row level security;
alter table public.analytics_snapshots enable row level security;

-- ── user_profiles ───────────────────────────────────────────────
drop policy if exists "user_profiles_select_own"  on public.user_profiles;
drop policy if exists "user_profiles_insert_own"  on public.user_profiles;
drop policy if exists "user_profiles_update_own"  on public.user_profiles;
drop policy if exists "user_profiles_delete_own"  on public.user_profiles;

create policy "user_profiles_select_own"
  on public.user_profiles for select
  using (auth.uid() = user_id);

create policy "user_profiles_insert_own"
  on public.user_profiles for insert
  with check (auth.uid() = user_id);

create policy "user_profiles_update_own"
  on public.user_profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "user_profiles_delete_own"
  on public.user_profiles for delete
  using (auth.uid() = user_id);

-- ── app_settings ────────────────────────────────────────────────
drop policy if exists "app_settings_select_own"  on public.app_settings;
drop policy if exists "app_settings_insert_own"  on public.app_settings;
drop policy if exists "app_settings_update_own"  on public.app_settings;
drop policy if exists "app_settings_delete_own"  on public.app_settings;

create policy "app_settings_select_own"
  on public.app_settings for select
  using (auth.uid() = user_id);

create policy "app_settings_insert_own"
  on public.app_settings for insert
  with check (auth.uid() = user_id);

create policy "app_settings_update_own"
  on public.app_settings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "app_settings_delete_own"
  on public.app_settings for delete
  using (auth.uid() = user_id);

-- ── study_logs ──────────────────────────────────────────────────
drop policy if exists "study_logs_select_own"  on public.study_logs;
drop policy if exists "study_logs_insert_own"  on public.study_logs;
drop policy if exists "study_logs_update_own"  on public.study_logs;
drop policy if exists "study_logs_delete_own"  on public.study_logs;

create policy "study_logs_select_own"
  on public.study_logs for select
  using (auth.uid() = user_id);

create policy "study_logs_insert_own"
  on public.study_logs for insert
  with check (auth.uid() = user_id);

create policy "study_logs_update_own"
  on public.study_logs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "study_logs_delete_own"
  on public.study_logs for delete
  using (auth.uid() = user_id);

-- ── practice_history ────────────────────────────────────────────
drop policy if exists "practice_history_select_own"  on public.practice_history;
drop policy if exists "practice_history_insert_own"  on public.practice_history;
drop policy if exists "practice_history_delete_own"  on public.practice_history;

create policy "practice_history_select_own"
  on public.practice_history for select
  using (auth.uid() = user_id);

create policy "practice_history_insert_own"
  on public.practice_history for insert
  with check (auth.uid() = user_id);

-- practice history is append-only (no updates); only allow delete own
create policy "practice_history_delete_own"
  on public.practice_history for delete
  using (auth.uid() = user_id);

-- ── weak_topics ─────────────────────────────────────────────────
drop policy if exists "weak_topics_select_own"  on public.weak_topics;
drop policy if exists "weak_topics_insert_own"  on public.weak_topics;
drop policy if exists "weak_topics_update_own"  on public.weak_topics;
drop policy if exists "weak_topics_delete_own"  on public.weak_topics;

create policy "weak_topics_select_own"
  on public.weak_topics for select
  using (auth.uid() = user_id);

create policy "weak_topics_insert_own"
  on public.weak_topics for insert
  with check (auth.uid() = user_id);

create policy "weak_topics_update_own"
  on public.weak_topics for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "weak_topics_delete_own"
  on public.weak_topics for delete
  using (auth.uid() = user_id);

-- ── revision_queue ──────────────────────────────────────────────
drop policy if exists "revision_queue_select_own"  on public.revision_queue;
drop policy if exists "revision_queue_insert_own"  on public.revision_queue;
drop policy if exists "revision_queue_update_own"  on public.revision_queue;
drop policy if exists "revision_queue_delete_own"  on public.revision_queue;

create policy "revision_queue_select_own"
  on public.revision_queue for select
  using (auth.uid() = user_id);

create policy "revision_queue_insert_own"
  on public.revision_queue for insert
  with check (auth.uid() = user_id);

create policy "revision_queue_update_own"
  on public.revision_queue for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "revision_queue_delete_own"
  on public.revision_queue for delete
  using (auth.uid() = user_id);

-- ── formula_book ────────────────────────────────────────────────
drop policy if exists "formula_book_select_own"  on public.formula_book;
drop policy if exists "formula_book_insert_own"  on public.formula_book;
drop policy if exists "formula_book_update_own"  on public.formula_book;
drop policy if exists "formula_book_delete_own"  on public.formula_book;

create policy "formula_book_select_own"
  on public.formula_book for select
  using (auth.uid() = user_id);

create policy "formula_book_insert_own"
  on public.formula_book for insert
  with check (auth.uid() = user_id);

create policy "formula_book_update_own"
  on public.formula_book for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "formula_book_delete_own"
  on public.formula_book for delete
  using (auth.uid() = user_id);

-- ── mistake_journal ─────────────────────────────────────────────
drop policy if exists "mistake_journal_select_own"  on public.mistake_journal;
drop policy if exists "mistake_journal_insert_own"  on public.mistake_journal;
drop policy if exists "mistake_journal_update_own"  on public.mistake_journal;
drop policy if exists "mistake_journal_delete_own"  on public.mistake_journal;

create policy "mistake_journal_select_own"
  on public.mistake_journal for select
  using (auth.uid() = user_id);

create policy "mistake_journal_insert_own"
  on public.mistake_journal for insert
  with check (auth.uid() = user_id);

create policy "mistake_journal_update_own"
  on public.mistake_journal for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "mistake_journal_delete_own"
  on public.mistake_journal for delete
  using (auth.uid() = user_id);

-- ── test_history ────────────────────────────────────────────────
drop policy if exists "test_history_select_own"  on public.test_history;
drop policy if exists "test_history_insert_own"  on public.test_history;
drop policy if exists "test_history_delete_own"  on public.test_history;

create policy "test_history_select_own"
  on public.test_history for select
  using (auth.uid() = user_id);

create policy "test_history_insert_own"
  on public.test_history for insert
  with check (auth.uid() = user_id);

-- test_history is generally append-only; allow delete but not update
create policy "test_history_delete_own"
  on public.test_history for delete
  using (auth.uid() = user_id);

-- ── topic_mastery ────────────────────────────────────────────────
drop policy if exists "topic_mastery_select_own"  on public.topic_mastery;
drop policy if exists "topic_mastery_insert_own"  on public.topic_mastery;
drop policy if exists "topic_mastery_update_own"  on public.topic_mastery;
drop policy if exists "topic_mastery_delete_own"  on public.topic_mastery;

create policy "topic_mastery_select_own"
  on public.topic_mastery for select
  using (auth.uid() = user_id);

create policy "topic_mastery_insert_own"
  on public.topic_mastery for insert
  with check (auth.uid() = user_id);

create policy "topic_mastery_update_own"
  on public.topic_mastery for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "topic_mastery_delete_own"
  on public.topic_mastery for delete
  using (auth.uid() = user_id);

-- ── daily_plans ─────────────────────────────────────────────────
drop policy if exists "daily_plans_select_own"  on public.daily_plans;
drop policy if exists "daily_plans_insert_own"  on public.daily_plans;
drop policy if exists "daily_plans_update_own"  on public.daily_plans;
drop policy if exists "daily_plans_delete_own"  on public.daily_plans;

create policy "daily_plans_select_own"
  on public.daily_plans for select
  using (auth.uid() = user_id);

create policy "daily_plans_insert_own"
  on public.daily_plans for insert
  with check (auth.uid() = user_id);

create policy "daily_plans_update_own"
  on public.daily_plans for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "daily_plans_delete_own"
  on public.daily_plans for delete
  using (auth.uid() = user_id);

-- ── daily_plan_tasks ────────────────────────────────────────────
-- User must own the parent plan to manipulate tasks.
drop policy if exists "daily_plan_tasks_select_own"  on public.daily_plan_tasks;
drop policy if exists "daily_plan_tasks_insert_own"  on public.daily_plan_tasks;
drop policy if exists "daily_plan_tasks_update_own"  on public.daily_plan_tasks;
drop policy if exists "daily_plan_tasks_delete_own"  on public.daily_plan_tasks;

create policy "daily_plan_tasks_select_own"
  on public.daily_plan_tasks for select
  using (auth.uid() = user_id);

create policy "daily_plan_tasks_insert_own"
  on public.daily_plan_tasks for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.daily_plans dp
      where dp.id = plan_id and dp.user_id = auth.uid()
    )
  );

create policy "daily_plan_tasks_update_own"
  on public.daily_plan_tasks for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "daily_plan_tasks_delete_own"
  on public.daily_plan_tasks for delete
  using (auth.uid() = user_id);

-- ── analytics_snapshots ─────────────────────────────────────────
drop policy if exists "analytics_snapshots_select_own"  on public.analytics_snapshots;
drop policy if exists "analytics_snapshots_insert_own"  on public.analytics_snapshots;
drop policy if exists "analytics_snapshots_update_own"  on public.analytics_snapshots;

create policy "analytics_snapshots_select_own"
  on public.analytics_snapshots for select
  using (auth.uid() = user_id);

-- Only server-side (service role) should write snapshots; no client insert policy.
-- If you need the anon key to write, add:
-- create policy "analytics_snapshots_insert_own" on public.analytics_snapshots for insert with check (auth.uid() = user_id);
-- For now, snapshots are written by server-side API routes using service role.
