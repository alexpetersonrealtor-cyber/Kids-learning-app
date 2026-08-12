# Family Learning & Games

A web-based (PWA-installable) app for a family with multiple kids (Pre-K–5th grade). Parents get a dashboard with login, kid profile management, on-demand screen-time timers, and progress analytics. Kids get a simple profile-select screen with age-appropriate educational games and classic arcade games.

## Stack

- **Framework:** Next.js (App Router) + TypeScript + Tailwind CSS
- **Database:** PostgreSQL, accessed only via a standard `DATABASE_URL` connection string
- **ORM:** Prisma
- **Auth:** Auth.js (NextAuth v5), credentials provider + bcrypt — no third-party auth dependency
- **Charts:** Recharts

Nothing here is vendor-locked: no Vercel-only APIs, no Supabase client SDK. The whole app also runs as a plain Dockerized Next.js + Postgres stack with zero code changes — swapping `DATABASE_URL` is the entire migration.

## Games (Wave 1 / MVP)

Classic: Tetris, Snake, Checkers, Tic-Tac-Toe, Memory Match.
Educational: Math Facts drill (addition/subtraction, tiered by grade), Reading (sight words for Pre-K–2, reading comprehension for 3rd–5th).

Every game reports a `GameSession` (score, accuracy, time) that feeds the parent dashboard's analytics.

## Local development

1. Copy the env file and fill in a database URL and auth secret:

   ```bash
   cp .env.example .env
   # generate a secret with: npx auth secret
   ```

2. Start Postgres (either via Docker Compose or a local install) and run migrations:

   ```bash
   docker compose up -d db
   npx prisma migrate dev
   ```

3. Run the dev server:

   ```bash
   npm install
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000). Sign up as a parent, add a kid profile from the dashboard, then visit `/play` to see the kid-facing profile picker.

## Deployment plan: $0 now → self-host later, no rewrite

- **Phase 0 (free):** Deploy to **Vercel** (Hobby tier) + **Supabase** (free Postgres). Set `DATABASE_URL` to the Supabase connection string, `AUTH_SECRET`/`AUTH_URL` in Vercel project settings. Good enough to fully build and test on.
- **In parallel:** Set up a home server — install Docker + Docker Compose, get it running 24/7, and set up Cloudflare Tunnel or a static DNS/port-forward so it's reachable from outside the home network.
- **Cutover (later):**
  1. `pg_dump` the Supabase database.
  2. `docker compose up -d` on the home server (spins up Postgres + the app via the included `Dockerfile`).
  3. `pg_restore` into the `db` container.
  4. Point DNS at the home server.
  5. Shut down / delete the Vercel and Supabase projects.

No code changes are required for the cutover — the app only ever talks to Postgres through `DATABASE_URL`.

## Self-hosting with Docker Compose

```bash
cp .env.example .env   # set AUTH_SECRET
docker compose up -d --build
```

This starts a `db` (Postgres 16) and `app` (Next.js, built via the multi-stage `Dockerfile`) service. Run migrations once against the running stack:

```bash
DATABASE_URL="postgresql://kidsapp:kidsapp@localhost:5432/kidsapp" npx prisma migrate deploy
```

## Backups

Supabase's free tier has no automatic backups or point-in-time recovery. `scripts/backup-db.mjs` does a logical backup — it reads every row of every model via Prisma (not `pg_dump`, so no Postgres client tools required; models are discovered from the schema at runtime, so a newly added model is never silently left out) and writes a single timestamped JSON file:

```bash
DATABASE_URL="<your production connection string>" node scripts/backup-db.mjs
```

The output lands in `./backups/` (gitignored — it contains PII and password hashes, never commit it). Copy it somewhere durable (cloud storage, an external drive). This same script is also what a scheduled backup routine runs before uploading the result off-box.

`scripts/restore-db.mjs` restores a backup produced above into a **fresh/empty** database — run `npx prisma migrate deploy` against the target first so the schema exists, then:

```bash
DATABASE_URL="<new database connection string>" node scripts/restore-db.mjs backups/kids-app-backup-....json
```

### Moving to a different Supabase project/account

Needed any time you're consolidating projects, hitting a plan's per-project pricing, or otherwise relaunching under a new Supabase project without losing data:

1. Take a fresh backup of the *current* project right before cutting over (`scripts/backup-db.mjs` above) — anything written after this point and before the switch is what you'd lose, so do this last, close to the moment of cutover.
2. Create the new Supabase project, grab its `DATABASE_URL`, and run `DATABASE_URL="<new>" npx prisma migrate deploy` to create the schema.
3. Restore into it: `DATABASE_URL="<new>" node scripts/restore-db.mjs backups/<the file from step 1>`.
4. Point Vercel's `DATABASE_URL` env var at the new project and redeploy.
5. Log in and click around (parent dashboard, each kid's profile, a game or two) against the *new* project to confirm everything's there before touching the old one.
6. Only then delete the old Supabase project.

Passwords, kid PINs, and every game's progress all live in Postgres and travel with the dump — there's no separate Supabase Auth/Storage to migrate, since the app only ever talks to Supabase as a plain `DATABASE_URL`.

## Project structure

- `src/app/dashboard/**` — parent-only pages (protected by `src/proxy.ts`), kid CRUD, timer controls, analytics.
- `src/app/play/**` — kid-facing profile picker, per-kid game grid, and game pages.
- `src/components/games/**` — the game implementations.
- `src/lib/actions/**` — server actions for kid CRUD and timer start/stop.
- `prisma/schema.prisma` — `Parent`, `Kid`, `GameSession`, `TimerSession` models.

## Non-goals for v1

- No automatic/scheduled screen-time limits — timers are started manually by a parent.
- No adaptive AI difficulty — fixed grade tiers only.
- No multiplayer over the network — local device only (Checkers/Tic-Tac-Toe support local hotseat or vs. a simple computer opponent).
