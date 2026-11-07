<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Lead

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/6bb89074-e72b-4ed7-822e-4102a9f30ee4

## Run Locally

**Prerequisites:** Node.js 22.13+ (Node.js 24 recommended) and Bun.
The Express backend and React frontend run together. SQLite uses Node's built-in
`node:sqlite` driver; no separate database service or database package is required.


1. Install dependencies: `bun install`
2. Copy [.env.example](.env.example) to `.env` or `.env.local`. Optionally set
   `GEMINI_API_KEY` for the AI copilot. Both files are loaded by the backend;
   environment variables take precedence, followed by `.env.local`, then `.env`.
3. Initialize the database: `bun run db:init` (also done automatically on startup).
4. Run the app: `bun run dev`
5. Open <http://localhost:3000>. API requests use the same server.

## SQLite persistence

The default database is `data\communitylead.db`. Set `DATABASE_PATH` to use another
file; relative paths resolve from the project directory. The first initialization
creates the SQL schema in [server/schema.sql](server/schema.sql) and seeds the
existing demonstration data. Subsequent starts preserve all data.

Users, communities, teams, reporting periods, KPI definitions, scorecards, action
plans, audit logs, and notifications each have their own SQL table. Nested KPI
inputs/results and action-plan updates use JSON columns. Foreign keys, unique
constraints, and transactions enforce data integrity. Scorecard/workflow changes
and their audit logs/notifications commit together or roll back together.

If `data\database.json` exists on first initialization, it is imported atomically
instead of seeding demo data. The original file is left unchanged. Malformed
legacy data or an unrecognized SQLite schema stops initialization explicitly.
Back up the database before changing its schema; schema version 1 is recorded
using SQLite's `user_version`.

SQLite runs in WAL mode. For backups, stop the server before copying the database,
or use SQLite's online backup tools; copying only a live `.db` file may omit
uncheckpointed changes. Keep the database directory on persistent writable
storage when deploying. Database files are excluded from version control.

`GET /api/health` checks the database connection and returns its engine and schema
version. API failures return JSON errors; initial connection failures display a
retry screen rather than an empty dashboard.

The existing user switcher is a **demo identity selector, not secure login**.
Do not expose this app publicly without adding real authentication/authorization.
Creating an action plan from an unsaved scorecard preview first saves that
scorecard as a draft so the plan references a persistent scorecard.

## Validation and production

The interface uses short labels and keeps longer plan descriptions, AI analysis,
audit details, and KPI notes in expandable sections. Full report notes remain
visible when printing, and failed scoring tests show their results automatically.
Overview filters and rankings are collapsed by default; expand them to filter
data or inspect the full community leaderboard.
The screen UI uses shared glass surfaces over a static gradient in light and dark
themes, with opaque fallbacks when backdrop blur is unavailable. Typography is
lighter and test names are shortened; expanding a result shows its full name,
identifier, category, and values. Print styles retain opaque report backgrounds.

- `bun run test`: SQLite persistence, constraints, rollback, migration, and API workflow tests.
- `bun run lint`: TypeScript check.
- `bun run build`: Build the frontend.
- Production: build, set `NODE_ENV=production`, then run `bun run start`.
  Use the Express server, not `bun run preview`, for database-backed features.
