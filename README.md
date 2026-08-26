# Ayna Tracker

Phase 1 (Foundation) of Ayna's internal work tracker: real auth, real
Postgres database, real task/project CRUD. No mock arrays — every page
queries the database live.

## What's built (Phase 1)

- Auth via Clerk (sign in required; first person to sign in becomes admin)
- Postgres schema (Drizzle ORM) — 17 tables covering workspaces, users,
  projects, tasks, subtasks, comments, dependencies, tags, attachments,
  milestones, activity logs, notifications, and saved views
- Real server actions for creating/updating tasks and projects — writes to
  the database and logs activity history, nothing here is a fake array
- Pages: Home (dashboard), My Work, All Tasks, Projects, Project detail,
  Task detail, Team — all server components pulling live data
- Inline quick-add task (title only required, Enter to create)
- Centralized query logic (`lib/queries.ts`) so overdue/due-today counts
  agree everywhere, per the "source of truth" requirement in the spec

## What's NOT built yet (later phases, per your own implementation order)

- Phase 2: dependencies UI, attachments UI, review workflow, tags UI,
  saved views UI (the tables exist; the UI for them doesn't yet)
- Phase 3: the reminder/email engine — Resend, cron endpoint, daily/weekly
  digests, notification deduplication (tables exist, logic doesn't yet)
- Phase 4: Kanban board, calendar, timeline, analytics charts
- Phase 5: templates, command palette, bulk actions, CSV import/export

Building Phase 3 (reminders) on top of a shaky Phase 1 would be wasted
work, so this was built and tested end-to-end first.

## Setup

### 1. Database (Neon)

1. Create a project at [neon.tech](https://neon.tech) (free tier is fine
   to start).
2. Copy the **pooled** connection string from the Neon dashboard.
3. Paste it as `DATABASE_URL` in your `.env.local` (copy `.env.example`
   first).
4. Run the migration against your real database:
   ```
   npm install
   npm run db:migrate
   ```
   This applies `db/migrations/0000_*.sql`, which was already generated
   and tested against a local Postgres instance — it creates all 17
   tables cleanly.
5. Optional: seed realistic dev data (do NOT run this against a real
   production database with real Ayna data in it):
   ```
   npm run db:seed
   ```

### 2. Auth (Clerk)

1. Create an application at [clerk.com](https://clerk.com).
2. From API Keys, copy the publishable key and secret key into
   `.env.local` as `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and
   `CLERK_SECRET_KEY`.
3. That's it — sign-in/sign-up pages are already wired up at `/sign-in`
   and `/sign-up`. The first person to sign in is automatically made an
   admin; everyone after that is a member (change roles later from the
   database directly until the admin settings UI is built in Phase 5).

### 3. Run locally

```
npm install
npm run dev
```

Visit `http://localhost:3000`, sign in, and you're in.

### 4. Deploy to Vercel (no local terminal required)

1. Push this folder to a new GitHub repo.
2. Import that repo in Vercel.
3. In the Vercel project's Settings → Environment Variables, add:
   `DATABASE_URL` (your Neon pooled connection string),
   `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`,
   `NEXT_PUBLIC_CLERK_SIGN_IN_URL` (`/sign-in`),
   `NEXT_PUBLIC_CLERK_SIGN_UP_URL` (`/sign-up`),
   `NEXT_PUBLIC_APP_URL` (your Vercel URL, can update after first deploy).
4. Deploy. The `vercel-build` script runs the database migration
   automatically before building, so the 17 tables get created in your
   Neon database as part of the deploy — no local `npm run db:migrate`
   needed.
5. To add seed/test data, that one step does need a local terminal
   (seeding is intentionally not automatic, so it can never run against
   real production data by accident): `npm install`, put your real
   `DATABASE_URL` in `.env.local`, then `npm run db:seed`.

### Alternative: run locally first

If you'd rather test on your machine before deploying:

## Notes on what was verified before this was handed to you

- Schema was generated and applied against a real local Postgres 16
  instance — not just theorized. All 17 tables, indexes, and foreign
  keys were confirmed to create successfully.
- Realistic seed data was inserted and queried back out correctly.
- `npm run build` was run to completion (Next.js production build,
  including TypeScript type-checking) and two real bugs were caught and
  fixed in the process: a server-only module (`postgres` driver) was
  accidentally being pulled into the client bundle through a shared
  utility file, and a Drizzle query had a type error. Both are fixed.
- Dependency versions were checked against current security advisories
  and bumped (Next.js and Drizzle ORM both had known vulnerabilities in
  the versions initially chosen; both are now on patched versions).

## Design system

Colors and type live in `tailwind.config.ts`, matching the mockup:
clay/terracotta accent (`#A8532B`, pulled from the real Ayna Tracker's
theme-color), sage for on-track, gold for waiting/attention, brick for
overdue, plum for blocked. Fraunces for headings, Inter for UI text.
