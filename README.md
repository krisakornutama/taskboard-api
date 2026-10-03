# TaskBoard API

A production-ready REST API for project and task management, built with Node.js,
Express 5 and TypeScript. Ships with JWT authentication, role-based access
control, request validation, rate limiting, SQLite persistence and an automated
test suite.

Built to be handed over: no native modules to compile, no database server to
install, no external API keys required. `npm install && npm test` works offline.

---

## Table of contents

- [Requirements](#requirements)
- [Quick start](#quick-start)
- [Configuration](#configuration)
- [Running the service](#running-the-service)
- [Testing](#testing)
- [API reference](#api-reference)
- [Architecture](#architecture)
- [Security notes](#security-notes)
- [Project layout](#project-layout)

---

## Requirements

| Requirement | Version | Notes |
|---|---|---|
| Node.js | **>= 22.5.0** (24.x LTS recommended) | `node:sqlite` requires 22.5+. Verified on v24.19.0 |
| npm | >= 10 | Ships with Node |
| Git | optional | Only needed to clone the repo |

Nothing else. There is **no** native dependency, no external database server and
no Docker requirement — the persistence layer uses the `node:sqlite` module built
into Node itself.

Check your Node version:

```bash
node --version   # must print v22.5.0 or higher
```

---

## Quick start

```bash
# 1. install dependencies
npm install

# 2. create your environment file
cp .env.example .env        # Windows PowerShell:  copy .env.example .env

# 3. generate a secret for JWT signing
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"

# 4. paste that value into JWT_SECRET in .env

# 5. verify everything works
npm test

# 6. start in development mode (auto-reloads on save)
npm run dev
```

The API is now listening on <http://localhost:3000>. Verify:

```bash
curl http://localhost:3000/health
# {"status":"ok","uptimeSeconds":0,"environment":"development","version":"1.0.0",...}
```

---

## Configuration

Every setting is read from the environment. See `.env.example` for the full list.

| Variable | Default | Description |
|---|---|---|
| `NODE_ENV` | `development` | `development` \| `test` \| `production` |
| `PORT` | `3000` | TCP port to bind |
| `HOST` | `0.0.0.0` | Interface to bind |
| `DB_PATH` | `./data/taskboard.sqlite` | SQLite file path, or `:memory:` |
| `CORS_ORIGIN` | `*` | Comma-separated allowed origins |
| `JWT_SECRET` | *(generated)* | **Required in production.** Min 32 chars |
| `ACCESS_TOKEN_TTL` | `15m` | Access-token lifetime |
| `REFRESH_TOKEN_TTL_DAYS` | `7` | Refresh-token lifetime in days |
| `LOGIN_RATE_LIMIT_MAX` | `5` | Login attempts allowed per window, per IP |
| `LOGIN_RATE_LIMIT_WINDOW_MS` | `900000` | Window length in ms (15 min) |
| `SEED_ADMIN_EMAIL` | — | Optional bootstrap admin, created only when the users table is empty |
| `SEED_ADMIN_PASSWORD` | — | Bootstrap admin password |
| `SEED_ADMIN_NAME` | `Platform Admin` | Bootstrap admin display name |

### Production checklist

- [ ] Set a strong, unique `JWT_SECRET` (the app **refuses to boot** without one
      when `NODE_ENV=production`)
- [ ] Set `CORS_ORIGIN` to your real front-end origins instead of `*`
- [ ] Set `NODE_ENV=production`
- [ ] Terminate TLS in front of the app (nginx, Caddy, a cloud load balancer)
- [ ] Back up the SQLite file, or migrate to Postgres if you need concurrent writes

---

## Running the service

| Command | What it does |
|---|---|
| `npm run dev` | Watch mode via `tsx`, restarts on file changes |
| `npm run build` | Compiles TypeScript to `dist/` and copies runtime assets |
| `npm start` | Runs the compiled build (`dist/server.js`) |
| `npm test` | Runs the full test suite once |
| `npm run test:watch` | Test runner in watch mode |
| `npm run typecheck` | Type-checks source and tests without emitting |

> **Windows note:** if PowerShell blocks `npm` with a script-execution error, call
> `npm.cmd` instead (`npm.cmd install`), or run commands in Command Prompt / Git Bash.

---

## Testing

```bash
npm test
```

Expected output:

```
 Test Files  5 passed (5)
      Tests  98 passed (98)
```

The suite runs against a real in-memory SQLite database and exercises the full
HTTP stack through supertest — no mocks of the persistence layer.

Coverage by area:

| File | Focus |
|---|---|
| `tests/health.test.ts` | Health endpoint, 404 envelope, security headers, malformed JSON, body-size limit |
| `tests/auth.test.ts` | Register, login, refresh rotation, replay detection, logout, token forgery/expiry |
| `tests/projects.test.ts` | CRUD, pagination, filtering, sorting, ownership isolation, admin access |
| `tests/tasks.test.ts` | CRUD, combined filters, due-date ordering, FK cascade behaviour |
| `tests/security.test.ts` | Rate limiting, SQL-injection resistance, password primitives, error hygiene |

Each test file runs in its own process, so state cannot leak between files.

---

## API reference

Base URL: `http://localhost:3000`

All protected routes require `Authorization: Bearer <accessToken>`.

### Auth — `/api/auth`

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | — | Create an account, returns a token pair |
| `POST` | `/api/auth/login` | — | Exchange credentials for a token pair |
| `POST` | `/api/auth/refresh` | — | Rotate a refresh token |
| `POST` | `/api/auth/logout` | ✔ | Revoke one refresh token |
| `POST` | `/api/auth/logout-all` | ✔ | Revoke every session for the user |
| `GET` | `/api/auth/me` | ✔ | Current user profile |

### Projects — `/api/projects`

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/projects` | List (paginated, filterable, sortable) |
| `POST` | `/api/projects` | Create |
| `GET` | `/api/projects/:id` | Fetch one |
| `PATCH` | `/api/projects/:id` | Partial update |
| `DELETE` | `/api/projects/:id` | Delete (cascades to tasks) |

Query parameters for `GET /api/projects`:

| Parameter | Example | Notes |
|---|---|---|
| `page` | `2` | 1-based, default `1` |
| `pageSize` | `25` | 1–100, default `20` |
| `status` | `active` | `active` \| `archived` |
| `ownerId` | `4` | Admins only; members are always scoped to their own rows |
| `search` | `redesign` | Matches name or description |
| `sort` | `name:asc` | `name` \| `createdAt` \| `updatedAt` \| `id`, optional `:asc`/`:desc` |

### Tasks

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/projects/:id/tasks` | List tasks of a project |
| `POST` | `/api/projects/:id/tasks` | Create a task |
| `GET` | `/api/tasks/:id` | Fetch one |
| `PATCH` | `/api/tasks/:id` | Partial update |
| `DELETE` | `/api/tasks/:id` | Delete |

Task query parameters: `page`, `pageSize`, `status` (`todo` \| `in_progress` \|
`done`), `priority` (`low` \| `medium` \| `high`), `assigneeId`, `search`, `sort`
(`title` \| `dueDate` \| `createdAt` \| `updatedAt` \| `id`).

### Worked example

```bash
BASE=http://localhost:3000

# register
TOKEN=$(curl -s -X POST $BASE/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"demo@example.com","password":"a very long passphrase","name":"Demo"}' \
  | node -pe 'JSON.parse(require("fs").readFileSync(0)).tokens.accessToken')

# create a project
curl -s -X POST $BASE/api/projects \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"Website Redesign","description":"Q4 scope"}'

# add a task
curl -s -X POST $BASE/api/projects/1/tasks \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"title":"Draft homepage copy","priority":"high","dueDate":"2026-12-01"}'

# list with filtering
curl -s "$BASE/api/projects/1/tasks?status=todo&priority=high&sort=dueDate:asc" \
  -H "Authorization: Bearer $TOKEN"
```

### Response shapes

Single resource:

```json
{ "data": { "id": 1, "name": "Website Redesign", "status": "active" } }
```

Collection:

```json
{
  "data": [ /* ... */ ],
  "meta": { "page": 1, "pageSize": 20, "total": 42, "totalPages": 3 }
}
```

Error:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request did not pass validation.",
    "details": {
      "issues": [
        { "source": "body", "path": "email", "message": "A valid email address is required.", "code": "invalid_format" }
      ]
    }
  }
}
```

### Status codes

| Code | Meaning |
|---|---|
| `200` | OK |
| `201` | Created |
| `204` | No content (deletes, logout) |
| `400` | Malformed JSON |
| `401` | Missing, invalid or expired token; bad credentials |
| `403` | Authenticated but insufficient role |
| `404` | Not found — or exists but is not visible to the caller |
| `409` | Conflict (email already registered) |
| `413` | Request body over the 100 kB limit |
| `422` | Validation failed |
| `429` | Rate limit exceeded (`Retry-After` header included) |
| `500` | Unexpected server fault (details are logged, never returned) |

---

## Architecture

```
src/
  app.ts               Express app factory + route mounting
  server.ts            HTTP listener, graceful shutdown
  config.ts            Environment parsing and validation
  types.ts             Shared domain and context types
  db/
    index.ts           Connection, pragmas, migration runner
    schema.sql         Idempotent DDL
  lib/
    password.ts        scrypt hashing, opaque tokens
    jwt.ts             Access-token signing and verification
    http-error.ts      Typed application errors
    pagination.ts      Pagination maths and ORDER BY whitelist
  middleware/
    auth.ts            requireAuth, requireRole
    validate.ts        Zod request validation
    rate-limit.ts      Fixed-window limiter
    error-handler.ts   Terminal error envelope
  modules/
    auth/              Register, login, refresh rotation, logout
    projects/          Project + task routes, schemas, services
```

Layering rule: routes validate and authorise, services own business logic and
SQL, `lib/` holds framework-free helpers. Services receive their database handle
as an argument, which is what makes the test suite possible without mocking.

---

## Security notes

Implemented:

- **Passwords** hashed with scrypt (N=16384, r=8, p=1) from `node:crypto`, with a
  per-password random salt. Comparison is constant-time via `timingSafeEqual`.
  The hash embeds its parameters, so they can be upgraded without invalidating
  stored credentials.
- **Refresh tokens** are 256-bit random opaque strings; only a SHA-256 digest is
  stored, so a database leak cannot be replayed against the API.
- **Refresh-token rotation with reuse detection.** Presenting an already-rotated
  token revokes every session for that user.
- **No user enumeration.** Unknown accounts and wrong passwords return an
  identical status, code and message, and both paths perform a hash comparison so
  the response time does not reveal whether an email is registered.
- **Roles resolved from the database on every request**, not trusted from the
  token, so a role change or deletion takes effect immediately.
- **SQL injection** is structurally prevented: all values are bound parameters,
  and every `ORDER BY` column passes through a whitelist.
- **LIKE wildcards** in search terms are escaped, so searching `%` cannot match
  every row.
- **Validation** with Zod; unknown request fields are stripped rather than
  trusted, which blocks attempts to set `role` or `id` during registration.
- **Rate limiting** on the login endpoint, keyed per IP, with `Retry-After` and
  `X-RateLimit-*` headers.
- **Cross-tenant isolation.** A member cannot read, modify or delete another
  user's project or task; the API answers `404` rather than `403` so it does not
  confirm that the resource exists.
- **Helmet** security headers, `x-powered-by` disabled, 100 kB body limit, and
  error responses that never include stack traces or driver messages.

Deliberately out of scope — flag these before production:

- Email verification and password-reset flows (no mail transport is wired up)
- Multi-factor authentication
- Distributed rate limiting (the limiter is in-process; use Redis when running
  more than one instance)
- CSRF tokens (only relevant if you authenticate with cookies rather than the
  `Authorization` header)
- Database migrations beyond the initial schema (there is no migration runner —
  the schema is applied idempotently at boot)

---

## Project layout

```
.
├── src/                     Application source
├── tests/                   Automated test suite (98 tests)
├── scripts/copy-assets.mjs  Build step for non-TS runtime assets
├── dist/                    Compiled output (generated)
├── .env.example             Configuration template
├── tsconfig.json            Type-check config (src + tests)
├── tsconfig.build.json      Emit config (src only)
└── vitest.config.ts         Test runner config
```

---

## Licence

MIT — reuse freely in commercial projects.