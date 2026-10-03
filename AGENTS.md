# AGENTS.md — Installation & Operations Runbook

Operational documentation for the **TaskBoard API** deliverable. For the feature
set and API reference, read `README.md`.

- **Deliverable:** Node.js + Express 5 + TypeScript REST API with JWT auth, RBAC,
  validation, rate limiting and SQLite persistence
- **Verified on:** Windows 11, Node v24.19.0, npm 11.17.0
- **Verification status:** 98/98 automated tests passing, type-check clean,
  production build compiles, compiled server smoke-tested end to end

---

## 1. Requirements

| Requirement | Version | Required? | Notes |
|---|---|---|---|
| Node.js | >= 22.5.0 | **Yes** | `node:sqlite` was added in 22.5. 24.x LTS recommended |
| npm | >= 10 | **Yes** | Bundled with Node |
| Git | any | No | Only for cloning the repository |
| Docker | any | No | Not used, not required |
| Database server | — | **No** | SQLite file, created automatically |
| API keys / cloud accounts | — | **No** | The service is fully self-contained |

There are **no compiler requirements**. `npm install` performs no compilation, so
it cannot fail on a customer's machine because of a missing build toolchain. The
only binary in the dependency tree is `esbuild`, pulled in transitively by Vitest
as a prebuilt download.

### Confirm your Node version

```bash
node --version
```

If it prints anything below `v22.5.0`, install a current LTS from
<https://nodejs.org> (or `winget install OpenJS.NodeJS.LTS`).

---

## 2. Installation

```bash
# from the project root
npm install
```

This installs 6 runtime dependencies and 9 development dependencies. None of the
runtime dependencies has an `install`, `postinstall` or `node-gyp` script, so
nothing is compiled during install.

### Windows / PowerShell note

If PowerShell reports *"running scripts is disabled on this system"* when you
call `npm`, use the `.cmd` shim instead — this is a PowerShell execution-policy
restriction, not a project defect:

```powershell
npm.cmd install
npm.cmd test
```

Alternatively run the commands in Command Prompt or Git Bash, or relax the policy
for your user:

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

---

## 3. Configuration

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
copy .env.example .env
```

Generate a signing secret and paste it into `JWT_SECRET`:

```bash
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

| Variable | Default | Required | Notes |
|---|---|---|---|
| `NODE_ENV` | `development` | No | `production` enforces a real `JWT_SECRET` |
| `PORT` | `3000` | No | |
| `HOST` | `0.0.0.0` | No | |
| `DB_PATH` | `./data/taskboard.sqlite` | No | Directory is created automatically |
| `CORS_ORIGIN` | `*` | No | Restrict in production |
| `JWT_SECRET` | random per boot | **In production** | >= 32 characters |
| `ACCESS_TOKEN_TTL` | `15m` | No | |
| `REFRESH_TOKEN_TTL_DAYS` | `7` | No | |
| `LOGIN_RATE_LIMIT_MAX` | `5` | No | Per IP, per window |
| `LOGIN_RATE_LIMIT_WINDOW_MS` | `900000` | No | 15 minutes |
| `SEED_ADMIN_EMAIL` | — | No | Bootstrap admin, only when the users table is empty |
| `SEED_ADMIN_PASSWORD` | — | No | |
| `SEED_ADMIN_NAME` | `Platform Admin` | No | |

### Optional bootstrap admin

```dotenv
SEED_ADMIN_EMAIL=admin@yourdomain.com
SEED_ADMIN_PASSWORD=<a long unique passphrase>
```

Created once, on the first boot when the `users` table is empty. After that the
variable is ignored, so rotating it will not silently reset an existing admin's
password.

---

## 4. Running

| Purpose | Command | Notes |
|---|---|---|
| Development | `npm run dev` | Watch mode, restarts on save |
| Compile | `npm run build` | Emits `dist/`, copies `schema.sql` |
| Production | `npm start` | Runs `dist/server.js` — run `build` first |
| Test suite | `npm test` | Single run |
| Test watch | `npm run test:watch` | |
| Type-check | `npm run typecheck` | No emit |

### Smoke test after starting

```bash
curl http://localhost:3000/health
```

Expected:

```json
{
  "status": "ok",
  "uptimeSeconds": 0,
  "environment": "development",
  "version": "1.0.0",
  "timestamp": "2026-10-03T12:00:00.000Z"
}
```

A `200` response also proves the database file was created and is writable.

---

## 5. Verification — how this deliverable was checked

Every claim below was produced by running the command, not by inspection.

| Check | Command | Result |
|---|---|---|
| Types | `npm run typecheck` | Clean, 0 errors |
| Automated tests | `npm test` | **98 passed / 98** across 5 files |
| Production build | `npm run build` | Compiles, `dist/db/schema.sql` emitted |
| Compiled server | `node dist/server.js` | Starts, `/health` returns 200 |
| End-to-end journey | register → project → task → list | All succeeded in `NODE_ENV=production` |
| Auth enforcement | `GET /api/projects` without a token | Correctly rejected with 401 |

### Reproducing the verification

```bash
npm run typecheck && npm test && npm run build
```

---

## 6. Deployment

### Minimal (single process, behind TLS)

1. `npm ci --omit=dev`
2. `npm run build`
3. Set the environment variables from section 3 — `NODE_ENV=production` and a real
   `JWT_SECRET` are mandatory
4. `npm start`
5. Put nginx / Caddy / a cloud load balancer in front for TLS

### systemd

```ini
[Unit]
Description=TaskBoard API
After=network.target

[Service]
Type=simple
User=taskboard
WorkingDirectory=/opt/taskboard-api
EnvironmentFile=/opt/taskboard-api/.env
ExecStart=/usr/bin/node dist/server.js
Restart=always

[Install]
WantedBy=multi-user.target
```

`SIGTERM` and `SIGINT` trigger a graceful shutdown: the HTTP listener drains, the
database is closed, then the process exits. A 10-second failsafe prevents a hung
shutdown.

### Operational notes

- **Persistence** is a single SQLite file. Back up `DB_PATH`. For more than
  roughly one concurrent writer, or for multi-instance deployments, move to
  Postgres.
- **Rate limiting is in-process.** With multiple instances each enforces its own
  budget; swap the `Map` in `src/middleware/rate-limit.ts` for Redis.
- **Every request performs one indexed user lookup** so role changes and
  deletions apply immediately. If that becomes a bottleneck, add a short-lived
  cache — the trade-off is delayed revocation.

---

## 7. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `Cannot find module 'node:sqlite'` | Node is older than 22.5 | Upgrade Node |
| `npm` blocked by script policy | PowerShell execution policy | Use `npm.cmd` (section 2) |
| `JWT_SECRET is required when NODE_ENV=production` | Secret missing in production | Generate and set one |
| `EADDRINUSE` | Port already taken | Change `PORT` |
| `SQLITE_CANTOPEN` | Unwritable `DB_PATH` | Fix permissions; parent dir is auto-created |
| 401 on every request after a restart | Ephemeral `JWT_SECRET` | Set a persistent secret |
| 429 during login tests | Rate limit reached | Restart, or raise `LOGIN_RATE_LIMIT_MAX` |
| Build succeeds but `npm start` cannot find `schema.sql` | Build step skipped | Run `npm run build` (not bare `tsc`) |

---

## 8. Maintenance

### Adding a field to an entity

1. Add the column to `src/db/schema.sql` (the DDL is idempotent, so re-running it
   on an existing database adds the column)
2. Add it to the row/interface types in `src/types.ts`
3. Add it to the Zod schema in the relevant `*.schema.ts`
4. Add it to the mapping functions (`toProject`, `toTask`, `toPublicUser`)
5. Extend the `INSERT`/`UPDATE` builders — note they are composed from an
   explicit field allow-list
6. Add tests

### Changing the password cost parameters

Edit `SCRYPT_N` / `SCRYPT_R` / `SCRYPT_P` in `src/lib/password.ts`. Existing
hashes keep verifying because each hash stores the parameters it was created
with; new hashes use the new values. Raise the scrypt cost only after measuring
the impact on login latency.

---

## 9. File map

| Path | Purpose |
|---|---|
| `src/app.ts` | Express app factory, middleware order, route mounting |
| `src/server.ts` | Listener, graceful shutdown |
| `src/config.ts` | Environment parsing and production invariants |
| `src/db/index.ts` | Connection, pragmas, migration runner |
| `src/db/schema.sql` | Idempotent DDL |
| `src/lib/` | Framework-free helpers (password, jwt, errors, pagination) |
| `src/middleware/` | Auth, validation, rate limiting, error envelope |
| `src/modules/auth/` | Account and token endpoints |
| `src/modules/projects/` | Project and task endpoints |
| `tests/` | 98 automated tests |
| `scripts/copy-assets.mjs` | Copies `schema.sql` into `dist/` |