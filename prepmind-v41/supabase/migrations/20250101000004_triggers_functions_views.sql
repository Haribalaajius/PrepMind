-- =============================================================
-- PrepMind AIR-1 · Migration 004 · Triggers, Functions & Views
-- Must run AFTER migration 001
-- =============================================================

-- ── updated_at trigger function ─────────────────────────────────
create or replace function public.fn_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Apply updated_at triggers to every table that has the column
do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'user_profiles',
    'app_settings',
    'weak_topics',
    'revision_queue',
    'formula_book',
    'mistake_journal',
    'topic_mastery',
    'daily_plans',
    'daily_plan_tasks'
  ]
  loop
    execute format('
      drop trigger if exists trg_%s_updated_at on public.%I;
      create trigger trg_%s_updated_at
        before update on public.%I
        for each row
        execute function public.fn_set_updated_at();
    ', tbl, tbl, tbl, tbl);
  end loop;
end;
$$;

-- ── Auto-create user profile on signup ─────────────────────────
-- Fires after a new row is inserted into auth.users (Supabase signup).
create or replace function public.fn_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (
    user_id,
    full_name,
    daily_hours
  )
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      split_part(new.email, '@', 1)
    ),
    coalesce(
      (new.raw_user_meta_data->>'daily_hours')::integer,
      7
    )
  )
  on conflict (user_id) do nothing;

  -- Also create default settings row
  insert into public.app_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists trg_on_auth_user_created on auth.users;
create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.fn_handle_new_user();

-- ── resolve_weak_topic helper ───────────────────────────────────
-- Called server-side when user marks a weak topic resolved.
create or replace function public.fn_resolve_weak_topic(
  p_user_id uuid,
  p_topic   text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.weak_topics
  set
    status      = 'resolved',
    resolved_at = now(),
    updated_at  = now()
  where user_id = p_user_id
    and topic   = p_topic
    and status != 'resolved';
end;
$$;

-- ── advance_revision_stage helper ──────────────────────────────
-- Implements the spaced-repetition interval logic in SQL.
-- Called from the API route after a successful review.
create or replace function public.fn_advance_revision_stage(
  p_user_id   uuid,
  p_item_id   uuid,
  p_direction text  -- 'advance' | 'reset' | 'suspend' | 'master'
)
returns public.revision_stage
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_stage public.revision_stage;
  v_new_stage     public.revision_stage;
  v_days_ahead    int;
begin
  select revision_stage into v_current_stage
  from public.revision_queue
  where id = p_item_id and user_id = p_user_id;

  if not found then
    raise exception 'Revision item % not found for user %', p_item_id, p_user_id;
  end if;

  case p_direction
    when 'reset' then
      v_new_stage  := 'new';
      v_days_ahead := 0;  -- due immediately
    when 'suspend' then
      v_new_stage  := 'suspended';
      v_days_ahead := 999;
    when 'master' then
      v_new_stage  := 'mastered';
      v_days_ahead := 30;
    when 'advance' then
      case v_current_stage
        when 'new'        then v_new_stage := 'revision_1';  v_days_ahead := 1;
        when 'revision_1' then v_new_stage := 'revision_2';  v_days_ahead := 3;
        when 'revision_2' then v_new_stage := 'revision_3';  v_days_ahead := 7;
        when 'revision_3' then v_new_stage := 'mastered';    v_days_ahead := 21;
        else                   v_new_stage := v_current_stage; v_days_ahead := 7;
      end case;
    else
      raise exception 'Unknown direction: %', p_direction;
  end case;

  update public.revision_queue
  set
    revision_stage   = v_new_stage,
    last_reviewed_at = now(),
    next_due_at      = now() + (v_days_ahead || ' days')::interval,
    review_count     = review_count + 1,
    updated_at       = now()
  where id = p_item_id and user_id = p_user_id;

  return v_new_stage;
end;
$$;

-- ── upsert_topic_mastery helper ─────────────────────────────────
-- Atomically increments attempt/correct counters and recomputes
-- mastery_score + mastery_label from a single function call.
-- Avoids race conditions from client-side read-modify-write.
create or replace function public.fn_upsert_topic_mastery(
  p_user_id    uuid,
  p_subject    text,
  p_topic      text,
  p_is_correct boolean,
  p_confidence numeric  -- 0.0–1.0
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_attempts  integer;
  v_new_correct   integer;
  v_new_accuracy  numeric;
  v_new_score     integer;
  v_new_label     public.mastery_label;
begin
  -- Upsert base row, incrementing counts atomically
  insert into public.topic_mastery (
    user_id, subject, topic, attempts, correct,
    recall_scores, revision_count, last_studied_at
  )
  values (
    p_user_id, p_subject, p_topic,
    1, case when p_is_correct then 1 else 0 end,
    '[]'::jsonb, 0, now()
  )
  on conflict (user_id, subject, topic)
  do update set
    attempts        = topic_mastery.attempts + 1,
    correct         = topic_mastery.correct + (case when p_is_correct then 1 else 0 end),
    last_studied_at = now(),
    updated_at      = now()
  returning attempts, correct
  into v_new_attempts, v_new_correct;

  -- Recompute derived fields
  v_new_accuracy := round(v_new_correct::numeric / greatest(v_new_attempts, 1) * 100, 2);

  -- Mastery score: weighted blend of accuracy, sample size, and confidence
  v_new_score := least(100, greatest(0, round(
    v_new_accuracy * 0.5
    + least(100, v_new_attempts * 5) * 0.3          -- more attempts = more reliable
    + coalesce(p_confidence, 0.5) * 100 * 0.2        -- confidence signal
  )));

  -- Assign mastery label
  v_new_label := case
    when v_new_attempts = 0                                     then 'unseen'
    when v_new_attempts < 5 and v_new_accuracy > 80            then 'overconfident_risk'
    when v_new_score < 20                                       then 'started'
    when v_new_score < 40                                       then 'fragile'
    when v_new_score < 60                                       then 'improving'
    when v_new_score < 78                                       then 'strong'
    else                                                              'exam_ready'
  end;

  update public.topic_mastery set
    mastery_score   = v_new_score,
    mastery_label   = v_new_label,
    recent_accuracy = v_new_accuracy,
    updated_at      = now()
  where user_id = p_user_id
    and subject  = p_subject
    and topic    = p_topic;
end;
$$;

-- ── Analytics view ───────────────────────────────────────────────
-- Live read-only view — useful for quick dashboard loads.
-- No materialization cost; just joins at query time.
create or replace view public.vw_user_analytics as
select
  u.id                                                            as user_id,
  count(ph.id)                                                    as total_attempted,
  count(ph.id) filter (where ph.is_correct)                       as total_correct,
  count(ph.id) filter (where not ph.is_correct)                   as total_wrong,
  round(
    100.0
    * count(ph.id) filter (where ph.is_correct)
    / nullif(count(ph.id), 0)
  , 1)                                                            as overall_accuracy,
  coalesce(sum(sl.hours_logged), 0)                               as total_hours,
  count(distinct sl.date)                                         as days_studied,
  count(wt.id) filter (where wt.status = 'active')                as active_weak_topics,
  count(mj.id) filter (where not mj.resolved)                     as unresolved_mistakes,
  count(th.id)                                                    as total_tests
from auth.users u
left join public.practice_history  ph on ph.user_id = u.id
left join public.study_logs        sl on sl.user_id = u.id
left join public.weak_topics       wt on wt.user_id = u.id
left join public.mistake_journal   mj on mj.user_id = u.id
left join public.test_history      th on th.user_id = u.id
group by u.id;

-- Grant read access to authenticated users (RLS on view via auth.uid() check in underlying tables)
-- Views in Postgres inherit the caller's RLS context, so no extra policy needed.

-- ── Mistake pattern view ─────────────────────────────────────────
-- Surfaces dominant mistake patterns per user without client aggregation.
create or replace view public.vw_mistake_patterns as
select
  user_id,
  subject,
  mistake_type,
  count(*)                                   as occurrence_count,
  count(*) filter (where not resolved)       as unresolved_count,
  round(avg(severity), 1)                    as avg_severity,
  max(created_at)                            as latest_at
from public.mistake_journal
group by user_id, subject, mistake_type;

-- ── Due revision counts view ─────────────────────────────────────
create or replace view public.vw_revision_due_counts as
select
  user_id,
  count(*) filter (where next_due_at < now() and revision_stage not in ('mastered','suspended'))
    as overdue_count,
  count(*) filter (
    where next_due_at >= now()
      and next_due_at < now() + interval '1 day'
      and revision_stage not in ('mastered','suspended')
  )                                          as due_today_count,
  count(*) filter (where revision_stage = 'mastered')
    as mastered_count,
  count(*) filter (where revision_stage not in ('mastered','suspended'))
    as active_count
from public.revision_queue
group by user_id;
