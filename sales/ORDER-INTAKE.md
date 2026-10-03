# Order Intake & Delivery

Two documents: what to collect from the buyer (prevents scope creep), and the
final check before you press send.

---

## 1. Requirements form — send to the buyer at order start

Copy as a {{PLATFORM}} message. Every question exists because its absence caused
a dispute somewhere. Fill in your own answers before sending if helpful.

```
Thanks for the order, {{BUYER_NAME}}. To start, please fill in the
following. If you are unsure about any answer, write "you decide" — I will
propose something sensible.

RESOURCES
1. List the things your API will manage (e.g. "customers", "invoices").
   For each one, list the fields it should have.
2. Which relationships exist between them? (e.g. "a customer has many invoices")

ENDPOINTS
3. What actions are needed? Common ones: create, list, view, update, delete,
   plus any special ones (search, export, status change).
4. Who will use this API? Only your own frontend, mobile apps, or also
   third parties?

AUTH & ROLES
5. Who can log in? Do you need roles beyond "logged in user" (e.g. admin)?
6. Does an admin need to see another user's data?

DATA
7. Do you already have a database schema? If yes, paste it.
8. If not: SQLite (nothing to install — recommended) or PostgreSQL?

TECHNICAL
9. Do you have hosting in mind? If yes, what?
10. Any library or language you require? (default: Node.js + TypeScript + SQLite)

SCOPE CONFIRMATION
11. Is there anything explicitly OUT of scope? (UI, mobile app, payments,
    email sending, file uploads)
12. Is there a deadline I should be aware of?

Anything you leave blank, I will decide and document the decision so you can
review it later.
```

---

## 2. Reply templates

### First contact

```
Hi {{BUYER_NAME}}, thanks for reaching out.

To give you an accurate quote and timeline, could you tell me:

- What does the API need to manage, and what fields does each thing have?
- Roughly how many endpoints do you think you need?
- Do you already have a database schema?
- Is there a deadline?

If you are not sure, that is completely normal — just describe the product you
are building and I will propose a design for you to approve.
```

### Confirming scope before starting

```
Here is what I understood from your requirements, and what I will build.

RESOURCES      {{LIST}}
ENDPOINTS      {{LIST}}
DATABASE       {{SQLITE_OR_POSTGRES}}
AUTH           {{ROLES}}
EXPLICITLY OUT {{LIST}}

Deliverable: source code with tests and documentation, in a Git repository.
Timeline: {{N}} days from the moment I start.
Price: agreed package, no extra cost for anything listed above.

Anything I have misread? Tell me now and I will adjust — I would rather fix the
scope before I start than after.
```

### Progress update (daily)

```
Quick update on {{PROJECT_NAME}}:

DONE
- {{COMPLETED_ITEMS}}

IN PROGRESS
- {{CURRENT_ITEM}}

NEXT
- {{NEXT_ITEM}}

Tests: {{PASSING}}/{{TOTAL}} passing. Nothing is being reported as working
unless the tests confirm it.
```

### Delivery

```
{{PROJECT_NAME}} is delivered.

INCLUDED
- Git repository: {{REPO_URL}} (full history, you own it)
- Source archive: attached
- README.md — setup and full API reference
- AGENTS.md — operations runbook and troubleshooting

VERIFY IT YOURSELF (please do this first)
1. npm install
2. npm test
   You should see every test passing.
3. npm run dev
   Health check: http://localhost:3000/health

GETTING STARTED
- Copy .env.example to .env
- Set JWT_SECRET — generate one with:
  node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
- Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD to create the first admin account

Questions — message me. Revisions within the agreed scope are included.
```

### Handling a revision request

```
Thanks for the feedback — good catch.

That is [within / outside] the agreed scope.

[If within] I will make the change and re-run the tests. Done within {{N}} hours.

[If outside] That is new work rather than a change to what was agreed, so I
would like to quote it before starting. It is roughly {{PRICE}} and takes about
{{TIME}}. Want me to go ahead?

Either way, tell me and I will proceed.
```

### Upselling, politely — once only

```
One thing I noticed while building this: {{OBSERVATION}}.

It is not in your current scope, but it would {{BENEFIT}}. If you want it, I
can add it for {{PRICE}}. No obligation — the current build is complete and
delivered either way.
```

---

## 3. Pre-delivery checklist

Do not send until every line is true. Each one has been a real failure mode.

**Code**

- [ ] `npm run typecheck` → zero errors
- [ ] `npm test` → 100% passing, and I have the output
- [ ] `npm run build` → compiles cleanly
- [ ] Compiled build actually started, and I exercised the real endpoints
- [ ] No `TODO`, `FIXME`, empty function bodies, or commented-out code left behind
- [ ] No hardcoded secrets; config comes from environment variables

**Security** (say yes or no honestly — do not assume)

- [ ] Passwords hashed, never logged or returned in any response
- [ ] Auth endpoints rate-limited
- [ ] Every input validated
- [ ] All SQL parameterised; no string-built queries
- [ ] Errors do not leak stack traces or driver messages
- [ ] Test confirms unauthenticated access is rejected

**Documentation**

- [ ] `README.md` — install, run, full endpoint reference, error format
- [ ] `AGENTS.md` — requirements, operations, troubleshooting
- [ ] `.env.example` — every variable documented, no real values
- [ ] `.gitignore` — excludes `node_modules`, `.env`, build output, database files

**Hygiene**

- [ ] No `.env`, `node_modules`, `dist`, or database file in the archive
- [ ] Demo/test data removed or clearly marked
- [ ] Git history has readable commit messages; no secrets in it
- [ ] Buyer has confirmed what tier they bought; scope matches it exactly

**Delivery**

- [ ] Requirements answered in the intake form, saved with the order
- [ ] Deviations from the original scope are documented and agreed in writing
- [ ] Repository or archive sent
- [ ] Delivery message includes the verification steps
- [ ] Revisions remaining stated

---

## 4. After delivery

| When | Do |
|---|---|
| Day 2 | If there is no reply, send one short check-in |
| On any request | Re-read the intake form before quoting extra work |
| After 5 clean orders | Raise prices ~30% |
| After every delivery | Ask for a review — buyers rarely volunteer one |
| If something breaks | Fix it free. A bug in delivered work is your cost, not theirs. |

---

## 5. Pricing discipline

The most common way this stops being profitable is agreeing to something extra
in a chat message without writing it down.

- **Any change to scope gets a written confirmation** before work starts.
- **"It's a small change" is the signal to quote, not to absorb.** Small changes
  compound across an order.
- **Track actual time on the first five orders.** If a $149 Starter takes more
  than two hours, the scope is wrong — not the price.