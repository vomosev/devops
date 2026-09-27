# DevOps Academy — Training & Development Platform

A full-stack training and development platform built for DevOps engineers. Learners sign up, browse curated tracks (CI/CD, Containers & Kubernetes, Infrastructure as Code, Observability & SRE), work through markdown lessons with hands-on lab commands, take end-of-module quizzes, and track their skill progress on a personal dashboard.

- **Frontend:** https://devops.arx-app.com
- **API:** https://devops-api.arx-app.com:4115

---

## Table of contents

1. [What it does](#what-it-does)
2. [Features](#features)
3. [Tech stack](#tech-stack)
4. [Project structure](#project-structure)
5. [Prerequisites](#prerequisites)
6. [Setup](#setup)
7. [Database: create + apply schema](#database-create--apply-schema)
8. [Seeding sample data](#seeding-sample-data)
9. [Environment variables](#environment-variables)
10. [Running the app](#running-the-app)
11. [PM2 deployment](#pm2-deployment)
12. [TLS certificates](#tls-certificates)
13. [API reference](#api-reference)
14. [Demo account](#demo-account)
15. [Troubleshooting](#troubleshooting)

---

## What it does

DevOps Academy is a self-serve learning platform. Engineers create an account, pick a track, enrol in a course, and step through ordered lessons. Each lesson renders markdown content (headings, prose, lists, fenced code blocks) plus an optional copyable lab command so the learner can run the exercise in their own terminal. Marking a lesson complete updates per-course completion percentages, and each course ends with a multiple-choice quiz that is graded server-side with explanations for every answer.

A personal dashboard aggregates the learner's progress: courses enrolled, lessons completed, minutes learned, average quiz score, a "continue learning" card pointing at the next incomplete lesson, and a recent-activity table.

---

## Features

- **Session-based authentication** — signup, login, logout, `GET /api/auth/me`, profile editing. Passwords hashed with `bcryptjs` (10 salt rounds); sessions persisted in MySQL via `express-mysql-session`.
- **Course catalogue** — filter by track, level and free-text search; each card shows track, level, lesson count, total duration and (when signed in) progress.
- **Course detail** — description, tool badges, ordered lesson list with per-lesson completion status, enrol/continue action and a quiz call-to-action.
- **Lesson reader** — markdown-to-elements rendering constrained to a 68ch measure, lab command block with copy button, "Mark complete", prev/next navigation.
- **Quizzes** — server-side grading, pass score per quiz, stored attempts, per-question correctness with explanations, retake support.
- **Dashboard** — stat tiles, continue-learning card with progress bar, enrolled course grid, recent activity table.
- **Resilient UI** — every data-driven page renders explicit loading (skeletons with reserved height), empty and error states, so the app never blanks out when the API is unavailable.
- **Accessible design system** — one global stylesheet with design tokens, visible focus rings, ≥44px hit areas, responsive breakpoints at 640/768/1024px and a `prefers-reduced-motion` block.
- **TLS-terminating API** — the Express server itself serves HTTPS on port 4115 when `SSL_ENABLED=true`.

---

## Tech stack

| Layer     | Technology |
|-----------|------------|
| Frontend  | Next.js (App Router, JSX), React |
| Styling   | A single global CSS file (`app/globals.css`) with CSS custom-property design tokens |
| Backend   | Node.js + Express |
| Database  | MySQL 8 via `mysql2/promise` connection pool |
| Sessions  | `express-session` + `express-mysql-session` |
| Auth      | `bcryptjs` password hashing, HTTP-only session cookie |
| Process   | PM2 (`ecosystem.config.js`) or `START.sh` |

---

## Project structure

```
.
├── app/                              # Next.js App Router pages
│   ├── globals.css                   # THE single global stylesheet (imported once)
│   ├── layout.jsx                    # Root layout: AuthProvider + header/main/footer shell
│   ├── page.jsx                      # Landing page
│   ├── not-found.jsx                 # 404 page
│   ├── courses/
│   │   ├── page.jsx                  # Catalogue with filters
│   │   └── [slug]/page.jsx           # Course detail + lesson list
│   ├── lessons/
│   │   └── [lessonId]/page.jsx       # Lesson reader
│   ├── quizzes/
│   │   └── [slug]/page.jsx           # Quiz runner + results
│   ├── dashboard/page.jsx            # Learner dashboard
│   ├── login/page.jsx
│   ├── signup/page.jsx
│   └── profile/page.jsx
│
├── components/
│   ├── layout/
│   │   ├── SiteHeader.jsx            # Sticky header, nav, auth area, mobile menu
│   │   ├── SiteFooter.jsx
│   │   └── PageHeader.jsx
│   ├── ui/
│   │   ├── Button.jsx
│   │   ├── Input.jsx                 # default Input, named Select + Textarea
│   │   ├── Card.jsx                  # default Card, named CardHeader/Body/Footer
│   │   ├── Modal.jsx                 # portal-based, focus-trapped
│   │   ├── Table.jsx
│   │   ├── Badge.jsx
│   │   ├── Spinner.jsx
│   │   ├── EmptyState.jsx
│   │   └── ProgressBar.jsx
│   ├── CourseCard.jsx
│   ├── LessonSidebar.jsx
│   ├── QuizPanel.jsx
│   ├── StatCard.jsx
│   └── AuthForm.jsx
│
├── lib/
│   ├── api.js                        # fetch client (credentials: 'include', ApiError)
│   ├── AuthContext.jsx               # AuthProvider + useAuth()
│   └── formatters.js                 # formatDuration, formatDate, percent, levelLabel, truncate
│
├── server/                           # Express API
│   ├── index.js                      # Entry point, CORS, sessions, routes, HTTP/HTTPS listener
│   ├── config/
│   │   ├── db.js                     # mysql2 pool + checkDatabaseConnection
│   │   └── session.js                # express-session + MySQL store
│   ├── middleware/
│   │   ├── requireAuth.js            # requireAuth + optionalAuth
│   │   └── errorHandler.js           # error handler + HttpError class
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── coursesController.js
│   │   ├── lessonsController.js
│   │   ├── progressController.js
│   │   └── quizController.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── courses.js
│   │   ├── lessons.js
│   │   ├── progress.js
│   │   └── quizzes.js
│   └── db/
│       └── seed.js                   # Applies schema.sql + inserts sample data
│
├── schema.sql                        # MySQL DDL (utf8mb4, InnoDB)
├── package.json                      # Single root manifest (frontend + backend)
├── next.config.js
├── ecosystem.config.js               # PM2 app definition
├── START.sh                          # Bash launcher for the API
├── .env.example
├── .gitignore
└── README.md
```

---

## Prerequisites

- **Node.js 18+** (Node 20 LTS recommended — the API uses the global `fetch`-free stack but Next.js requires 18.17+)
- **npm 9+**
- **MySQL 8.0** (or MariaDB 10.6+) reachable from the app host
- Optional: **PM2** installed globally (`npm install -g pm2`) for production process management
- Optional: TLS certificate and key if you want the API to terminate HTTPS itself

---

## Setup

```bash
git clone <your-repo-url> devops
cd devops
npm install
cp .env.example .env
# edit .env with your real database credentials and session secret
```

> There is exactly **one** `package.json`, at the repository root. It declares both the Next.js frontend and the Express backend dependencies. Do **not** create a `frontend/` or `client/` subfolder — `app/`, `components/`, `lib/` and `public/` live alongside `server/`.

---

## Database: create + apply schema

### 1. Create the database and user

```sql
CREATE DATABASE devops CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'devops_user'@'%' IDENTIFIED BY 'change-me';
GRANT ALL PRIVILEGES ON devops.* TO 'devops_user'@'%';
FLUSH PRIVILEGES;
```

### 2. Apply the schema

```bash
mysql -h 127.0.0.1 -u devops_user -p devops < schema.sql
```

`schema.sql` is written with `CREATE TABLE IF NOT EXISTS`, so it is safe to re-run.

### Tables created

| Table | Purpose |
|-------|---------|
| `users` | id, name, email (UNIQUE), password_hash, role (`learner`/`instructor`), job_title, created_at |
| `sessions` | `session_id` VARCHAR(128) PK, `expires` INT UNSIGNED, `data` MEDIUMTEXT — used by `express-mysql-session` |
| `tracks` | id, slug (UNIQUE), title, description, color_token |
| `courses` | id, slug (UNIQUE), track_id FK, title, summary, description, level, duration_minutes, tools, is_published, created_at |
| `lessons` | id, course_id FK, position, title, slug, content_markdown, estimated_minutes, lab_command |
| `enrollments` | id, user_id FK, course_id FK, UNIQUE(user_id, course_id), enrolled_at |
| `lesson_progress` | id, user_id, lesson_id, course_id, status, completed_at, UNIQUE(user_id, lesson_id) |
| `quizzes` | id, course_id FK, title, pass_score |
| `quiz_questions` | id, quiz_id FK, position, prompt, explanation |
| `quiz_options` | id, question_id FK, label, is_correct |
| `quiz_attempts` | id, user_id, quiz_id, score, passed, answers, created_at |

All foreign keys are indexed; engine is InnoDB and charset `utf8mb4`.

---

## Seeding sample data

The seed script executes `schema.sql` first, then inserts realistic content. It is **idempotent** (`INSERT IGNORE` / slug existence checks) and closes the connection pool when finished.

```bash
node server/db/seed.js
```

Seeded content:

- **4 tracks** — CI/CD, Containers & Kubernetes, Infrastructure as Code, Observability & SRE
- **8 published courses** with slugs, summaries, levels and durations
- **4–6 lessons per course** with real markdown content and shell lab commands
- **1 quiz per course** with 4–5 multiple-choice questions and answer explanations
- **A demo learner** with a couple of enrolments and completed lessons

---

## Environment variables

Copy `.env.example` to `.env` and fill in real values. Never commit `.env`.

| Variable | Required | Example / default | Description |
|----------|----------|-------------------|-------------|
| `PORT` | yes | `4115` | Port the Express API binds to (assigned by the deploy script) |
| `NODE_ENV` | no | `production` | Node environment; `production` hides 500 error details |
| `DB_HOST` | yes | `127.0.0.1` | MySQL host |
| `DB_USER` | yes | `devops_user` | MySQL user |
| `DB_PASSWORD` | yes | `your-db-password` | MySQL password |
| `DB_NAME` | yes | `devops` | MySQL database name |
| `SESSION_SECRET` | yes | `a-long-random-string` | Secret used to sign the express-session cookie |
| `SSL_ENABLED` | no | `true` | When `true` the API starts an HTTPS server using the paths below |
| `SSL_CERT_PATH` | if SSL | `/home/arx-app/backends/certs/certificate.crt` | Absolute path to the TLS certificate |
| `SSL_KEY_PATH` | if SSL | `/home/arx-app/backends/certs/private.key` | Absolute path to the TLS private key |
| `SSL_CA_PATH` | no | `/home/arx-app/backends/certs/ca_bundle.crt` | Optional CA chain file |
| `CLIENT_ORIGIN` | no | `https://devops.arx-app.com` | Primary allowed browser origin for CORS |
| `NEXT_PUBLIC_API_BASE_URL` | yes (build time) | `https://devops-api.arx-app.com:4115` | Base URL the browser uses to reach the API |

> `NEXT_PUBLIC_API_BASE_URL` is inlined at build time by Next.js. If you change it you must re-run `npm run build`.

**CORS & cookies:** the API allows any origin matching `/\.arx-app\.com$/` (plus `localhost` in development) with `credentials: true`. The session cookie is named `devops.sid`, is `httpOnly`, `sameSite: 'none'` and `secure` when `SSL_ENABLED === 'true'` — cross-site cookies therefore require HTTPS on both the site and the API.

---

## Running the app

### Scripts

The root `package.json` exposes exactly three scripts:

```json
{
  "build": "next build",
  "start": "node server/index.js",
  "server": "node server/index.js"
}
```

### Build the frontend

```bash
npm run build
```

### Run the API

```bash
npm run server
# or
npm start
```

The server logs the bound port and whether it is serving HTTP or HTTPS, e.g.:

```
[devops-api] HTTPS server listening on 0.0.0.0:4115
```

### Run via START.sh

```bash
chmod +x START.sh
./START.sh
```

`START.sh`:

1. `cd`s to the script directory and runs with `set -e`
2. Exports `SSL_ENABLED`, `SSL_CERT_PATH=/home/arx-app/backends/certs/certificate.crt`, `SSL_KEY_PATH=/home/arx-app/backends/certs/private.key` and `PORT=4115` when they are not already set
3. Runs `npm install --omit=dev` if `node_modules` is missing
4. Launches the API in the background with `nohup node server/index.js > server.log 2>&1 &` and writes the PID to `devops-api.pid`

Stop it with:

```bash
kill "$(cat devops-api.pid)"
```

Tail the log with:

```bash
tail -f server.log
```

### Health checks

```bash
curl -k https://devops-api.arx-app.com:4115/health
# {"status":"ok"}

curl -k https://devops-api.arx-app.com:4115/api/health
# {"status":"ok","database":"connected"}
```

---

## PM2 deployment

`ecosystem.config.js`:

```js
module.exports = {
  apps: [
    {
      name: 'devops',
      script: 'server/index.js',
      cwd: '/home/arx-app/backends/devops',
      env: { NODE_ENV: 'production', PORT: 4115 }
    }
  ]
};
```

Usage:

```bash
pm2 start ecosystem.config.js
pm2 logs devops
pm2 restart devops
pm2 stop devops
pm2 delete devops
pm2 save            # persist the process list across reboots
pm2 startup         # generate the boot script
```

---

## TLS certificates

The Express API terminates TLS itself — there is no reverse proxy in front of port 4115.

- Set `SSL_ENABLED=true` and point `SSL_CERT_PATH` / `SSL_KEY_PATH` at readable PEM files.
- If your issuer supplies an intermediate bundle, also set `SSL_CA_PATH`; it is passed as the `ca` option to `https.createServer`.
- The process user must have read permission on the key file (`chmod 640`, group-owned by the app user is typical).
- When `SSL_ENABLED` is not `'true'` the server falls back to plain HTTP — useful for local development on `http://localhost:4115`.
- Because the session cookie uses `sameSite: 'none'`, browsers will **reject** it over plain HTTP on a cross-site origin. For local development either run both the site and API on `localhost`, or enable TLS locally.

Certificate path used in production:

```
/home/arx-app/backends/certs/certificate.crt
/home/arx-app/backends/certs/private.key
```

---

## API reference

Base URL: `https://devops-api.arx-app.com:4115`

All `/api` responses are JSON. Authenticated routes rely on the `devops.sid` session cookie, so browser calls must use `credentials: 'include'` (the `lib/api.js` client does this for you). Unauthenticated access to a protected route returns `401 { "error": "Authentication required" }`.

### Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | — | Liveness probe → `{ "status": "ok" }` |
| GET | `/api/health` | — | Liveness + MySQL connectivity check |

### Auth — `/api/auth`

| Method | Path | Auth | Body | Description |
|--------|------|------|------|-------------|
| POST | `/api/auth/signup` | — | `{ name, email, password, job_title? }` | Creates a learner, starts a session. `409` on duplicate email. |
| POST | `/api/auth/login` | — | `{ email, password }` | Regenerates the session and returns the user. `401` on bad credentials. |
| POST | `/api/auth/logout` | yes | — | Destroys the session and clears the cookie → `{ ok: true }` |
| GET | `/api/auth/me` | yes | — | Current user without `password_hash` |
| PATCH | `/api/auth/me` | yes | `{ name?, job_title? }` | Updates the profile and returns the user |

### Courses — `/api/courses`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/courses/tracks` | — | All tracks with course counts |
| GET | `/api/courses` | optional | Published courses. Query params: `track` (slug), `level` (`beginner`/`intermediate`/`advanced`), `q` (search). Includes enrolment/progress when signed in. |
| GET | `/api/courses/:slug` | optional | Course detail + ordered lessons with per-lesson status, quiz id, enrolment flag. `404` when missing. |
| POST | `/api/courses/:slug/enroll` | yes | Enrol the current user (idempotent) |
| DELETE | `/api/courses/:slug/enroll` | yes | Un-enrol the current user |

### Lessons — `/api/lessons`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/lessons/:id` | optional | Lesson detail with course slug/title, position, `prevLessonId`, `nextLessonId` and the viewer's status. `404` when not found. |

### Progress — `/api/progress` (all require auth)

| Method | Path | Body | Description |
|--------|------|------|-------------|
| GET | `/api/progress/dashboard` | — | Aggregate stats, continue-learning course + next lesson, recent activity |
| GET | `/api/progress/course/:slug` | — | `{ completed, total, percent }` for a course |
| POST | `/api/progress/lesson/:lessonId` | `{ status: "in_progress" \| "completed" }` | Upserts progress, auto-creates the enrolment if absent, returns the new completion percentage |

### Quizzes — `/api/quizzes`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/quizzes/course/:slug` | optional | The course quiz with questions and options, `is_correct` stripped |
| POST | `/api/quizzes/:quizId/submit` | yes | Body `{ answers: { "<questionId>": <optionId> } }`. Grades server-side, stores an attempt, returns `{ score, passed, results: [...] }` with explanations. |
| GET | `/api/quizzes/:quizId/attempts` | yes | The user's attempts for that quiz, newest first |

### Error shape

```json
{ "error": "Human readable message" }
```

Status codes used: `400` validation, `401` unauthenticated, `403` forbidden, `404` not found, `409` conflict, `500` server error (generic message in production).

### Example requests

```bash
# Sign up
curl -k -X POST https://devops-api.arx-app.com:4115/api/auth/signup \
  -H 'Content-Type: application/json' \
  -c cookies.txt \
  -d '{"name":"Ada Lovelace","email":"ada@example.com","password":"Sup3rSecret!","job_title":"Platform Engineer"}'

# Browse the catalogue
curl -k 'https://devops-api.arx-app.com:4115/api/courses?track=kubernetes&level=intermediate'

# Mark a lesson complete
curl -k -X POST https://devops-api.arx-app.com:4115/api/progress/lesson/12 \
  -H 'Content-Type: application/json' -b cookies.txt \
  -d '{"status":"completed"}'
```

---

## Demo account

After running the seed script you can sign in with:

```
Email:    demo@devops.training
Password: DevOpsDemo123!
```

The demo learner already has a couple of enrolments and completed lessons so the dashboard renders populated.

---

## Troubleshooting

| Symptom | Likely cause / fix |
|---------|--------------------|
| `ER_ACCESS_DENIED_ERROR` on startup | Wrong `DB_USER`/`DB_PASSWORD`, or the user lacks privileges on `DB_NAME`. |
| `ER_NO_SUCH_TABLE: ...sessions` | `schema.sql` was not applied. Run `mysql ... < schema.sql` or `node server/db/seed.js`. The session store uses `createDatabaseTable: false` on purpose. |
| Login succeeds but `GET /api/auth/me` returns 401 | The cookie is being dropped. Ensure both site and API are HTTPS (`sameSite: 'none'` + `secure`), that the browser origin matches the CORS allow-list, and that the frontend uses `credentials: 'include'`. |
| `EADDRINUSE` on 4115 | An old process is still running: `kill "$(cat devops-api.pid)"` or `pm2 delete devops`. |
| `ENOENT` reading the certificate | `SSL_CERT_PATH` / `SSL_KEY_PATH` are wrong or unreadable by the process user. Set `SSL_ENABLED=false` to fall back to HTTP while you debug. |
| Frontend shows an error state on every page | The API is unreachable from the browser. Check `NEXT_PUBLIC_API_BASE_URL`, then `curl` `/health` and rebuild with `npm run build` if you changed the value. |
| Changed `NEXT_PUBLIC_API_BASE_URL` but nothing happened | It is inlined at build time — re-run `npm run build`. |

---

© DevOps Academy. Built with Next.js, Express and MySQL.