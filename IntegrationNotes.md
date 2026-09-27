# Integration Notes for devops

## Overview

**devops** (branded "DevOps Academy") is a training and development platform for engineers. Learners sign up, browse curated DevOps tracks (CI/CD, Containers & Kubernetes, Infrastructure as Code, Observability & SRE), work through lessons with real markdown content and shell lab commands, take end-of-module quizzes, and monitor their skill progress on a personal dashboard.

The repository is a **single-package monorepo-free layout**:

- **Frontend** — a Next.js App Router application living at the repository root (`app/`, `components/`, `lib/`). All styling comes from one global design-token stylesheet, `app/globals.css`, imported exactly once from `app/layout.jsx`. There are no CSS modules, no Tailwind, no CSS-in-JS and no inline styles.
- **Backend** — an Express API under `server/`, which **terminates TLS itself** on port `4115` (it is not expected to sit behind a reverse proxy for SSL, though `trust proxy` is enabled). Persistence is MySQL via `mysql2/promise`, and authentication is **session-based** (`express-session` + `express-mysql-session`, cookie name `devops.sid`).
- **No proxying** — `next.config.js` contains no rewrites. The browser talks to the API origin directly using `NEXT_PUBLIC_API_BASE_URL`, so CORS and cross-site cookies (`SameSite=None; Secure`) must be configured correctly.

Public URLs used throughout the codebase and documentation:

| Surface | URL |
| --- | --- |
| Frontend | `https://devops.arx-app.com` |
| API | `https://devops-api.arx-app.com:4115` |

## Prerequisites

Before installing, make sure the following are available on the target machine:

- **Node.js 18.17 or newer** (Next.js App Router requirement; Node 20 LTS recommended). Check with `node -v`.
- **npm 9+** — bundled with Node. Check with `npm -v`.
- **MySQL 8.0+** (MySQL 5.7 works, but `utf8mb4` and `JSON`-style columns are cleanest on 8.0) reachable from the API host, with a database and a user that can `CREATE TABLE`, `INSERT`, `UPDATE`, `DELETE` and `SELECT`.
- **TLS certificate material** if `SSL_ENABLED=true` — a certificate, a private key and optionally a CA bundle. The deploy convention expects them under `/home/arx-app/backends/certs/`.
- **PM2** (optional, for production process supervision): `npm install -g pm2`.
- **A MySQL client** (`mysql` CLI or equivalent) to apply `schema.sql`.
- Outbound/inbound firewall rules allowing TCP **4115** for the API.

## Installation

```bash
# 1. Clone and enter the repository
git clone <your-repo-url> devops
cd devops

# 2. Install dependencies (single root package.json — no workspaces)
npm install

# 3. Create your environment file from the documented example
cp .env.example .env
$EDITOR .env    # fill in DB credentials, SESSION_SECRET, SSL paths, origins

# 4. Create the database (adjust user/host as needed)
mysql -h "$DB_HOST" -u root -p -e \
  "CREATE DATABASE IF NOT EXISTS devops_training CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 5. Apply the schema
mysql -h "$DB_HOST" -u "$DB_USER" -p devops_training < schema.sql

# 6. (Optional but recommended) Seed tracks, courses, lessons, quizzes and a demo user
node server/db/seed.js

# 7. Build the Next.js frontend
npm run build
```

Notes on the steps above:

- `schema.sql` uses `CREATE TABLE IF NOT EXISTS` throughout (InnoDB, `utf8mb4`) and includes the `sessions` table required by `express-mysql-session`. Because the schema owns that table, `server/config/session.js` sets `createDatabaseTable: false` — **you must apply `schema.sql` before the API can store sessions**.
- `server/db/seed.js` loads `dotenv`, executes the statements in `schema.sql`, then inserts four tracks, eight published courses, 4–6 lessons per course, one quiz per course and a demo learner (`demo@devops.training` / `DevOpsDemo123!`). It is idempotent (`INSERT IGNORE` / slug checks) and closes the pool when finished, so it is safe to re-run.
- Production installs can skip dev dependencies with `npm install --omit=dev` — this is exactly what `START.sh` does when `node_modules/` is missing.

## Environment Variables

All variables are read from `.env` at the repository root (loaded by `dotenv` in `server/index.js` and `server/db/seed.js`). A fully documented, secret-free template lives at `.env.example`. `.env` and `.env.local` are git-ignored.

| Variable | Description | Example |
| --- | --- | --- |
| `PORT` | Port the Express API binds to (assigned by the deploy script). `server/index.js` calls `server.listen(process.env.PORT, '0.0.0.0')`. | `4115` |
| `NODE_ENV` | Node environment. In `production`, `server/middleware/errorHandler.js` returns a generic message for 500s instead of leaking internals. | `production` |
| `DB_HOST` | MySQL host used by the `mysql2/promise` pool in `server/config/db.js`. | `db.example.com` |
| `DB_USER` | MySQL user. | `devops_app` |
| `DB_PASSWORD` | MySQL password. | `your-secret-here` |
| `DB_NAME` | MySQL database name. | `devops_training` |
| `SESSION_SECRET` | Secret used to sign the `express-session` cookie (`devops.sid`). Use a long random string; rotating it invalidates all sessions. | `change-me-to-a-long-random-string` |
| `SSL_ENABLED` | When `'true'`, `server/index.js` starts an **HTTPS** server using the certificate paths below and sets `cookie.secure = true`; otherwise it starts plain HTTP. | `true` |
| `SSL_CERT_PATH` | Absolute path to the TLS certificate read via `fs` at boot. | `/home/arx-app/backends/certs/certificate.crt` |
| `SSL_KEY_PATH` | Absolute path to the TLS private key. | `/home/arx-app/backends/certs/private.key` |
| `SSL_CA_PATH` | Optional absolute path to a CA chain file; included in the HTTPS options when present. | `/home/arx-app/backends/certs/ca_bundle.crt` |
| `CLIENT_ORIGIN` | Primary allowed browser origin for CORS and cookie settings. CORS additionally allows any origin matching `/\.arx-app\.com$/`, plus `localhost` in development, with `credentials: true`. | `https://devops.arx-app.com` |
| `NEXT_PUBLIC_API_BASE_URL` | Base URL the browser uses to reach the API. Consumed by `lib/api.js` (`BASE`) and passed through `next.config.js`. **Must be set at build time** — it is inlined into the client bundle. | `https://devops-api.arx-app.com:4115` |

> **Important:** `NEXT_PUBLIC_*` variables are baked in during `npm run build`. Changing `NEXT_PUBLIC_API_BASE_URL` requires a rebuild, not just a restart.

## Running the Application

### Scripts

`package.json` intentionally exposes exactly three scripts and nothing else:

```json
{
  "build": "next build",
  "start": "node server/index.js",
  "server": "node server/index.js"
}
```

### Local development

```bash
# Terminal 1 — API (HTTP is fine locally: set SSL_ENABLED=false)
npm run server

# Terminal 2 — frontend production build + Next.js server
npm run build
npx next start -p 3000
```

For iterative UI work you may run `npx next dev -p 3000` directly (no `dev` script is defined by design). With `NODE_ENV=development`, CORS accepts `localhost` origins. Note that session cookies are configured `sameSite: 'none'`, which browsers only accept together with `Secure` — for local cross-origin work either run both sides over HTTPS or point the browser at the same origin.

Health checks:

```bash
curl -k https://localhost:4115/health       # { "status": "ok" }
curl -k https://localhost:4115/api/health   # includes DB connectivity via checkDatabaseConnection()
```

### Production — the START script

```bash
./START.sh
```

`START.sh` (`#!/usr/bin/env bash`, `set -e`) `cd`s to its own directory, exports `SSL_ENABLED`, `SSL_CERT_PATH=/home/arx-app/backends/certs/certificate.crt`, `SSL_KEY_PATH=/home/arx-app/backends/certs/private.key` and `PORT=4115` if they are unset, runs `npm install --omit=dev` when `node_modules` is missing, then launches:

```
nohup node server/index.js > server.log 2>&1 &
```

and writes the resulting PID to `devops-api.pid`. Tail `server.log` for boot output (it logs the bound port). Stop it with `kill "$(cat devops-api.pid)"`.

### Production — PM2

```bash
npm run build
pm2 start ecosystem.config.js
pm2 save
pm2 logs devops
pm2 restart devops
```

`ecosystem.config.js` defines a single app:

```js
module.exports = {
  apps: [{
    name: 'devops',
    script: 'server/index.js',
    cwd: '/home/arx-app/backends/devops',
    env: { NODE_ENV: 'production', PORT: 4115 }
  }]
};
```

Adjust `cwd` if you deploy elsewhere. The frontend is served separately — either by `next start` behind your web server, or by exporting the built `.next` output to your hosting layer at `https://devops.arx-app.com`.

### API surface

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/health` | — | Liveness |
| GET | `/api/health` | — | Liveness + DB ping |
| POST | `/api/auth/signup` | — | Create account, start session |
| POST | `/api/auth/login` | — | Authenticate, regenerate session |
| POST | `/api/auth/logout` | session | Destroy session, clear cookie |
| GET | `/api/auth/me` | session | Current user (no `password_hash`) |
| PATCH | `/api/auth/me` | session | Update `name`, `job_title` |
| GET | `/api/courses/tracks` | — | Tracks with course counts |
| GET | `/api/courses` | optional | Catalogue with `?track`, `?level`, `?q` |
| GET | `/api/courses/:slug` | optional | Course detail + ordered lessons |
| POST/DELETE | `/api/courses/:slug/enroll` | session | Enroll / unenroll |
| GET | `/api/lessons/:id` | optional | Lesson body + prev/next |
| GET | `/api/progress/dashboard` | session | Aggregated learner stats |
| GET | `/api/progress/course/:slug` | session | Completed vs total lessons |
| POST | `/api/progress/lesson/:lessonId` | session | `{ status }` upsert |
| GET | `/api/quizzes/course/:slug` | — | Quiz without `is_correct` |
| POST | `/api/quizzes/:quizId/submit` | session | Grade and store an attempt |
| GET | `/api/quizzes/:quizId/attempts` | session | Attempt history, newest first |

Unmatched routes fall through to a JSON 404 handler, then `server/middleware/errorHandler.js`.

## Project Structure

```
devops/
├── package.json              Single root manifest (next, react, express, mysql2, bcryptjs,
│                             express-session, express-mysql-session, cors, dotenv, cookie-parser)
├── next.config.js            reactStrictMode + NEXT_PUBLIC_API_BASE_URL passthrough (no rewrites)
├── ecosystem.config.js       PM2 app definition (name 'devops', port 4115)
├── START.sh                  Background launcher: env defaults, install, nohup, PID file
├── .env.example              Documented template for every variable
├── .gitignore                node_modules, .next, .env*, *.log, *.pid, .DS_Store
├── README.md                 Full project documentation and API reference
├── schema.sql                MySQL DDL: users, sessions, tracks, courses, lessons,
│                             enrollments, lesson_progress, quizzes, quiz_questions,
│                             quiz_options, quiz_attempts (+ FK indexes)
│
├── server/
│   ├── index.js              Express entry: CORS, session, /health, routers, 404, errors,
│   │                         http/https server construction, listen on 0.0.0.0
│   ├── config/db.js          mysql2/promise pool + checkDatabaseConnection()
│   ├── config/session.js     express-session + express-mysql-session store ('devops.sid')
│   ├── middleware/
│   │   ├── requireAuth.js    requireAuth (401 JSON) and optionalAuth
│   │   └── errorHandler.js   Error middleware + HttpError(status, message)
│   ├── controllers/          authController, coursesController, lessonsController,
│   │                         progressController, quizController
│   ├── routes/               auth.js, courses.js, lessons.js, progress.js, quizzes.js
│   └── db/seed.js            Idempotent sample-data seeder (run standalone)
│
├── app/                      Next.js App Router
│   ├── globals.css           THE single stylesheet: reset, :root design tokens, typography
│   │                         layer, layout utilities, component classes, breakpoints
│   ├── layout.jsx            Metadata, globals.css import, AuthProvider, header/main/footer shell
│   ├── page.jsx              Marketing landing page (server component)
│   ├── courses/page.jsx      Client catalogue with filters + loading/empty/error states
│   ├── courses/[slug]/page.jsx  Course detail, enroll, progress, lesson list, quiz CTA
│   ├── lessons/[lessonId]/page.jsx  Lesson reader, lab command copy, mark complete, prev/next
│   ├── quizzes/[slug]/page.jsx      Quiz runner + scored result
│   ├── dashboard/page.jsx    Auth-gated stats, continue-learning, enrolled courses, activity
│   ├── login/ signup/ profile/      Auth pages and profile editor
│   └── not-found.jsx         Shared 404 using EmptyState
│
├── components/
│   ├── layout/               SiteHeader, SiteFooter, PageHeader
│   ├── ui/                   Button, Input (+Select/Textarea), Card, Modal, Table,
│   │                         Badge, Spinner, EmptyState, ProgressBar
│   ├── CourseCard.jsx        Catalogue/dashboard course tile
│   ├── LessonSidebar.jsx     Ordered lesson list + quiz row
│   ├── QuizPanel.jsx         Quiz runner with per-question feedback
│   ├── StatCard.jsx          Dashboard metric tile
│   └── AuthForm.jsx          Shared login/signup form
│
└── lib/
    ├── api.js                fetch client (credentials:'include', AbortController timeout, ApiError)
    ├── AuthContext.jsx       AuthProvider + useAuth(); swallows 401/network on mount
    └── formatters.js         formatDuration, formatDate, percent, levelLabel, truncate
```

Two structural rules are worth preserving during maintenance:

1. `app/globals.css` is imported **only** from `app/layout.jsx`. Adding a second styling mechanism breaks the design-token contract (spacing scale, z-index tokens, focus rings, reduced-motion handling).
2. `lib/api.js` is never called at module load — only from `useEffect` or event handlers — so every page can render loading/empty/error states even when the API is down.

## Next Steps / Production Considerations

**Secrets and configuration**
- Generate a real `SESSION_SECRET`: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`. Never commit `.env`.
- Create a least-privilege MySQL user scoped to `DB_NAME` (`SELECT, INSERT, UPDATE, DELETE` — plus `CREATE` only while seeding).
- Keep `multipleStatements: false` in `server/config/db.js` as shipped; it is a SQL-injection hardening measure.

**TLS and cookies**
- Certificates must be readable by the process user running `server/index.js`. Verify the chain: include `SSL_CA_PATH` when your issuer requires an intermediate bundle.
- Because the frontend and API are on different origins, the session cookie is `SameSite=None; Secure`. This only works over HTTPS — keep `SSL_ENABLED=true` in production.
- Automate certificate renewal and restart the API (`pm2 restart devops`) afterwards; the cert is read once at boot.

**CORS**
- The allow-list is the `/\.arx-app\.com$/` pattern plus `CLIENT_ORIGIN`. If you move to a different domain, update both the regex in `server/index.js` and `CLIENT_ORIGIN`.

**Hardening to add before heavy traffic**
- Rate-limit `/api/auth/login` and `/api/auth/signup` (e.g. `express-rate-limit`) to blunt credential stuffing.
- Add `helmet` for standard security headers on the API.
- Consider CSRF protection for state-changing routes; session cookies plus a strict CORS allow-list are the current defence.
- Add server-side payload validation (`zod`/`joi`) alongside the existing inline checks in `authController.js`.

**Database operations**
- Prune expired rows from `sessions` on a schedule, or let `express-mysql-session`'s reaper run — confirm it is enabled for your traffic profile.
- Review the indexes in `schema.sql`; add composite indexes on `lesson_progress (user_id, course_id)` and `quiz_attempts (user_id, quiz_id, created_at)` if dashboard aggregation slows down.
- Back up `DB_NAME` regularly and test restores. Treat `schema.sql` as the migration baseline; introduce a migration tool (e.g. `node-migrate`, Flyway) before the first schema change in production.

**Frontend deployment**
- Rebuild (`npm run build`) whenever `NEXT_PUBLIC_API_BASE_URL` changes.
- Serve the built app behind a CDN/reverse proxy at `https://devops.arx-app.com` with long-lived caching for `/_next/static` and no caching for HTML.

**Observability**
- `START.sh` writes to `server.log`; rotate it (`logrotate`) or rely on `pm2-logrotate`. Ship structured logs and monitor `GET /api/health`, which exercises the MySQL pool, rather than `/health` alone.
- Add an uptime check on `https://devops-api.arx-app.com:4115/api/health` and alert on non-200 or elevated latency.

**Content and data**
- The seeded demo account (`demo@devops.training` / `DevOpsDemo123!`) is for evaluation only — delete or disable it before opening the platform to real users.
- The `instructor` role exists in the `users` enum but no authoring UI ships with this build; adding course/lesson CRUD endpoints guarded by that role is the natural next feature.

## Database Provisioning

A mysql database has been automatically provisioned for this app.

- **Database:** app_devops
- **Host:** testdb.gridiron-app.com
- **Port:** 3306
- **User:** devops
- **Credentials stored in Vault at:** `secret/data/mysql/devops`

Retrieve the password securely from Vault and set it as an environment variable (e.g. `DB_PASSWORD`) in your deployment settings — do not commit it to source control.
