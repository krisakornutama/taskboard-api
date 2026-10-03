# Gig Copy — paste-ready blocks

Replace `{{BUYER_NAME}}`, `{{PLATFORM}}` and `{{TIER}}` before sending.

---

## A. Titles (A/B test these)

**Fiverr** (80 char limit)

```
I will build a secure REST API with JWT auth, database, and tests
```

```
I will develop a production ready REST API with authentication and docs
```

**Upwork** (70 char limit)

```
Build a production ready REST API with JWT auth and automated tests
```

```
Develop a documented REST API with auth, database and test suite
```

---

## B. Package names and pricing

| Tier | Name | Price | Delivery | Revisions |
|---|---|---|---|---|
| 1 | Starter | $149 | 3 days | 1 |
| 2 | Professional ⭐ | $399 | 5 days | 2 |
| 3 | Scale | $899 | 9 days | 3 |

---

## C. Long description

> Everything below is true of the delivered project. Nothing is inflated.

---

### Need a working API — without a 3-week, $8,000 agency project?

I will build you a **production-ready REST API**: authentication, a real
database, an automated test suite and documentation you can hand to a developer
or an AI coding tool without further explanation.

Most freelance APIs arrive with no tests and no documentation. That is not
deliverable — it is a liability that transfers its cost to you. What you get
from me ships with both.

---

### What you receive

**Every package**

- JWT authentication (register, login, refresh with token rotation, logout)
- Passwords hashed with scrypt — never stored in plain text
- A real relational database with enforced foreign keys
- Input validation on every endpoint — bad data is rejected, not stored
- Rate limiting on credential endpoints
- Consistent JSON error responses, with no internal details leaked
- **An automated test suite you can run yourself**
- **README with full API reference**
- Source code in a Git repository with a clean commit history

**Professional** (most popular)

- Up to 3 resources with full CRUD
- Role-based access control (`admin` / `member`)
- Pagination, filtering, search and sorting
- Per-user data isolation — no user can read another user's data
- `AGENTS.md` operations runbook with troubleshooting

**Scale**

- Unlimited resources
- Audit log table
- CI workflow (GitHub Actions)
- Dockerfile
- A recorded handover walkthrough

---

### Why this will not break on your machine

The single most common reason a delivered project fails is that the buyer cannot
run it. This one has **no compiler requirement at all** — no `node-gyp`, no build
tools, no C toolchain.

It depends on **6 runtime libraries** (`express`, `cors`, `helmet`, `zod`,
`jsonwebtoken`, `dotenv`) and not one of them compiles anything. Cryptography
and the database come from Node itself via `node:crypto` and `node:sqlite`.

`npm install` either works or fails loudly. It will not leave you with a cryptic
"cannot find module ./binding.node" error.

Requires only **Node.js 22.5 or newer**. Nothing else.

---

### The tests are the proof

I do not ask you to trust me. I give you a test suite and you run it:

```bash
npm test
```

The reference implementation ships **98 automated tests**. They exercise real
HTTP requests against a real database — not mocks. The tests cover:

- Registration, login, token refresh and expiry
- Refresh-token reuse detection (a stolen token revokes every session)
- Password hashing correctness
- Cross-user data isolation
- Input validation and rejection paths
- SQL injection attempts
- Rate limiting behaviour
- Cascading deletes and referential integrity

If a test fails, you will know. That transparency is the point.

---

### Stack

| Layer | Technology | Why |
|---|---|---|
| Language | TypeScript (strict) | Catches errors at compile time |
| Framework | Express 5 | Mature, enormous ecosystem |
| Database | SQLite (built into Node) | Zero setup; switchable to PostgreSQL |
| Auth | JWT + scrypt | Stateless, no extra infrastructure |
| Validation | Zod | Single source of truth for input rules |
| Tests | Vitest + supertest | Fast, real HTTP-level testing |

Prefer PostgreSQL, MongoDB, or an existing schema? Tell me in the requirements
form and I will adapt.

---

### How it works

1. **You send the requirements** — I send a short structured form.
2. **I confirm scope and start** — you approve the plan before work begins.
3. **I build and test** — you receive a daily update.
4. **I deliver** — Git repository access plus the archive and documentation.
5. **Revisions** — the number included in your package.

---

### What I need from you

- A description of the resources and fields you need
- Preferred naming for endpoints (or say "you decide")
- Any existing schema, if you have one

That is all. If you are unsure, say so — I will propose a design.

---

### Not included

To set expectations honestly: no frontend or UI, no native mobile apps, no
serverless or cloud infrastructure provisioning, and no ongoing maintenance after
handover. Each of those is available as an add-on.

---

### Frequently asked

**Do I own the code?**
Yes. Full ownership and all rights transfer to you on delivery, including the
Git repository history.

**Can you work with my existing database?**
Yes, if you provide the schema. PostgreSQL, MySQL and MongoDB are all
straightforward. The reference build uses SQLite to keep setup at zero.

**What if I need a change after delivery?**
Revisions within the agreed scope are included. New features are quoted
separately — I will tell you the cost before starting, and you decide.

**Will it work in production?**
It runs on Node's built-in HTTP server and handles graceful shutdown. For serious
traffic, I recommend deploying behind a reverse proxy; deployment guidance is
included, hands-on infrastructure setup is an add-on.

**How do you communicate?**
English or Thai, via {{PLATFORM}} messages. One progress update per working day.

**What if I am not satisfied?**
{{PLATFORM}}'s standard refund policy applies. Tell me early if something is
wrong and I will fix it.

---

**Message me with your requirements and I will reply with a plan within a few
hours.** If you are still deciding, describe the product you are building and I
will suggest the design.