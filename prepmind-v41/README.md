# PrepMind AIR-1 — GATE EC 2027 Preparation OS

Elite GATE EC preparation system with persistent cloud database, cross-device sync, AI-powered study intelligence, spaced revision scheduling, and rank analytics.

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Database + Auth | Supabase (PostgreSQL + Row Level Security) |
| AI | Anthropic Claude (server-side only) |
| Deployment | Vercel |
| Language | TypeScript |

---

## Project Structure

```
prepmind-air1/
├── middleware.ts                   # Auth guard + route protection
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql  # 13 tables with enums, constraints, FK
│       ├── 002_rls_policies.sql    # Per-operation RLS on every table
│       ├── 003_indexes.sql         # Compound indexes for common queries
│       └── 004_triggers_functions_views.sql
├── src/
│   ├── app/
│   │   ├── (auth)/                 # Login, signup — unauthenticated routes
│   │   ├── (dashboard)/            # Protected routes — server components
│   │   ├── api/                    # API route handlers
│   │   └── auth/callback/          # Supabase magic link callback
│   ├── components/
│   │   ├── dashboard/              # Shell, command panel
│   │   ├── practice/               # Smart practice, PYQ, mock composer
│   │   ├── revision/               # Revision queue, daily plans
│   │   └── analytics/              # Analyze, progress panels
│   ├── lib/
│   │   ├── supabase/               # client.ts, server.ts
│   │   ├── db/                     # queries.ts, mutations.ts
│   │   ├── ai/                     # claude.ts, prompts.ts
│   │   └── utils/                  # constants.ts, scoring.ts, validation.ts
│   └── types/
│       ├── database.ts             # DB row types + enums
│       └── domain.ts               # App-layer models
```

---

## 1. Supabase Setup

### Create a project

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Note your **Project URL** and **API keys** from: `Settings → API`.

### Run migrations

Open `SQL Editor → New query` in the Supabase Dashboard and run **each migration file in order**:

```
supabase/migrations/20250101000001_initial_schema.sql
supabase/migrations/20250101000002_rls_policies.sql
supabase/migrations/20250101000003_indexes.sql
supabase/migrations/20250101000004_triggers_functions_views.sql
```

Paste each file's contents into the SQL editor and click **Run**.

### Configure Auth redirect URLs

In `Authentication → URL Configuration`:

| Setting | Value |
|---------|-------|
| Site URL | `https://your-app.vercel.app` (prod) / `http://localhost:3000` (local) |
| Redirect URLs | `https://your-app.vercel.app/auth/callback` |

For local development, also add `http://localhost:3000/auth/callback`.

---

## 2. Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
# Supabase (public — safe for browser)
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhb...

# Supabase service role (server-only — never expose to browser)
SUPABASE_SERVICE_ROLE_KEY=eyJhb...

# Anthropic (server-only)
ANTHROPIC_API_KEY=sk-ant-api03-...

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> **Security note**: `SUPABASE_SERVICE_ROLE_KEY` and `ANTHROPIC_API_KEY` must **never** appear in client-side code. They are only used inside `/api` route handlers and server components.

---

## 3. Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

To check TypeScript:
```bash
npm run typecheck
```

---

## 4. Vercel Deployment

### Via GitHub (recommended)

1. Push to GitHub.
2. Go to [vercel.com/new](https://vercel.com/new) → Import repository.
3. Framework: **Next.js** (auto-detected).
4. Add all 5 environment variables in `Settings → Environment Variables`.
5. Click **Deploy**.

### Environment variables in Vercel

Add these in `Project → Settings → Environment Variables`:

| Variable | Environment |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | All |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | All |
| `SUPABASE_SERVICE_ROLE_KEY` | Production + Preview |
| `ANTHROPIC_API_KEY` | Production + Preview |
| `NEXT_PUBLIC_APP_URL` | Production: your Vercel URL |

### Update Supabase redirect URLs for production

After deploy, add your Vercel URL to Supabase Auth:
`Authentication → URL Configuration → Redirect URLs → + Add`
```
https://your-app.vercel.app/auth/callback
```

---

## 5. Authentication

- **Email + password**: standard Supabase flow.
- **Magic link**: sends login email, no password required.
- **Session persistence**: handled by Supabase SSR cookies, refreshed by middleware on every request.
- **Profile creation**: triggered automatically by `fn_handle_new_user` database trigger on signup.
- **Route protection**: `middleware.ts` checks session on every request and redirects unauthenticated users to `/login`.

---

## 6. Data Model Summary

| Table | Purpose |
|-------|---------|
| `user_profiles` | Name, target exam, daily hours, focus mode |
| `app_settings` | API key (encrypted), theme preferences |
| `study_logs` | Daily hours/questions/mocks — one row per user per day |
| `practice_history` | Every answered question with confidence + correctness |
| `weak_topics` | User-marked weak topics with score and status |
| `revision_queue` | Spaced repetition items with stage and due date |
| `formula_book` | Saved and AI-generated formula sheets |
| `mistake_journal` | Logged mistakes with type, lesson, AI diagnosis |
| `test_history` | Mock test records with subject breakdown |
| `topic_mastery` | Computed mastery per topic (updated atomically by SQL function) |
| `daily_plans` | AI-generated study plans per day |
| `daily_plan_tasks` | Individual tasks within a plan with completion tracking |
| `analytics_snapshots` | Periodic denormalized analytics cache |

### RLS

All tables have Row Level Security enabled. Every policy uses `auth.uid() = user_id` — no user can read or write another user's data. The `api_key_enc` column in `app_settings` is never selected by any client-visible query.

---

## 7. AI Integration Safety

- The Anthropic API key **never leaves the server**. All AI calls go through `/api/ai`.
- Users can optionally supply their own key via Settings — it is XOR-encrypted before storage and decrypted server-side at request time.
- Prompt templates live in `src/lib/ai/prompts.ts` — centralized, testable, not scattered across components.
- All AI output is parsed and validated before use. Malformed JSON falls back to demo data — the UI never breaks.

---

## 8. localStorage Migration (Phase 1–3 users)

On first login after upgrading from Phase 1–3:

1. The System page detects `pm3_state` in localStorage.
2. User sees a one-click "Import to Database" option.
3. `POST /api/migrate` runs server-side, importing weak topics, revision items, mistakes, formulas, test history, and practice records.
4. `user_profiles.migrated_at` is set — migration never runs twice.
5. Original localStorage data is preserved (not deleted).

---

## 9. Offline Support

- `src/lib/offline-queue.ts` queues writes to localStorage when network is unavailable.
- On reconnect (or next page load), `flushQueue()` sends queued items to `POST /api/sync`.
- `/api/sync` validates auth and enforces `user_id` ownership before writing — queue cannot be spoofed.
- The sync status dot in the performance bar shows live state: synced (green) / syncing (amber) / error (red) / offline (grey).

---

## 10. Troubleshooting

| Problem | Solution |
|---------|----------|
| Login redirects loop | Check `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are correct |
| Magic link fails | Ensure your Vercel URL is in Supabase Redirect URLs |
| AI returns demo data | Either no `ANTHROPIC_API_KEY` set, or user's custom key is invalid |
| RLS permission denied | Re-run `002_rls_policies.sql` |
| `fn_upsert_topic_mastery` not found | Re-run `004_triggers_functions_views.sql` |
| Offline queue stuck | Clear it in System → Data Manager, or `localStorage.removeItem('pm41_offline_queue')` |
| Migration failed | Check browser console — partial import is safe, migration marks done only on full success |

---

## 11. Security Notes

1. `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS — used only in `/api/migrate` (one-time import) and analytics snapshots. Never use it client-side.
2. API key encryption uses XOR with a key derived from `SUPABASE_SERVICE_ROLE_KEY`. For production critical deployments, replace with Supabase Vault or AWS KMS.
3. `X-Content-Type-Options: nosniff` and `X-Frame-Options: DENY` headers are set on all `/api` routes.
4. The app sets `robots: noindex,nofollow` — preparation tools should not be publicly indexed.
5. Passwords handled entirely by Supabase Auth — no plaintext passwords are ever stored or seen by the app.
