# Sales Pack — TaskBoard API (Productized Service)

Everything needed to publish this as a fixed-scope, fixed-price service and
deliver it repeatedly.

| File | Use |
|---|---|
| `gig-copy.md` | Text blocks to paste into marketplace fields |
| `ORDER-INTAKE.md` | Questionnaire for the buyer + delivery checklist |

---

## 1. What is being sold

**One sentence:** A production-ready REST API with authentication, a real
database, an automated test suite and documentation — delivered in days, not
weeks, at a fixed price.

**Who it is for:** A founder or small team who needs an API for their product
(supabase replacement, mobile app backend, internal tooling, SaaS starter) and
does not want a $8,000 agency engagement or a freelancer who disappears.

**What makes this sellable** (the actual differentiator):

| Differentiator | Proof |
|---|---|
| Comes with a **test suite the client can run** | 98 automated tests, `npm test` proves it in ~8 seconds |
| `npm install` **cannot break** | Zero native dependencies — uses `node:sqlite` and `node:crypto`, both built into Node |
| Security is not an afterthought | scrypt hashing, refresh-token rotation with reuse detection, injection-safe SQL, rate limiting |
| **Documented for handover** | `README.md` for the client, `AGENTS.md` runbook with troubleshooting |
| Delivered in **days** | Scope is fixed and repeatable — not a custom build |

**Why "fixed scope" is the whole strategy:** The service is only profitable if
delivery is repeatable. Every request beyond the defined scope is either a paid
add-on or a refusal. Both are in `ORDER-INTAKE.md`.

---

## 2. Pricing

Three tiers, with the middle one highlighted (marketplace convention that
steers buyers toward it).

| Tier | Price | Delivery | Scope |
|---|---|---|---|
| **Starter** | **$149** | 3 days | 1 resource, auth (register/login/refresh), SQLite, 15+ tests, README |
| **Professional** ⭐ | **$399** | 5 days | 3 resources, roles (admin/member), pagination + filters, rate limiting, 40+ tests, README + runbook |
| **Scale** | **$899** | 9 days | Unlimited resources, audit log, CI workflow, Docker, 80+ tests, handover call |

### Why these numbers

- **$149 floor** — below this the maths stops working. Delivery is 1–2 hours of
  work plus message overhead. If a buyer wants cheaper, they should use a no-code
  tool; better to lose the lead than win it at $40.
- **$399 as the anchor** — sits well below agency rates ($2,000+) and above
  low-cost bidders who deliver untested code that collapses under real use.
- **$899** — exists to make $399 look reasonable, and catches buyers who would
  otherwise negotiate upward. Roughly 20% of orders should land here.

### Rules for adjusting

- **Raising prices:** raise Starter first. Keep the gap between tiers wide
  ($149 → $399 → $899) so the middle reads as the obvious choice.
- **Discounting:** never below $99. If a buyer asks for less, recommend Starter
  with a reduced scope instead of discounting the full build.
- **First 3 orders:** run them at full price. Cheap early orders attract buyers
  who consume disproportionate support time and leave bad reviews.
- **After 5 delivered orders with no issues:** raise all tiers by ~30% and update
  the listing. Past reviews are the only real leverage you have.

---

## 3. Scope boundaries — the profit protector

State these in the listing. They are not obstacles; they are what makes the
price credible.

**Included**

- One Node.js/TypeScript service, SQLite or your existing PostgreSQL schema
- JWT authentication with refresh-token rotation
- Role-based access control
- Input validation on every endpoint
- Automated tests (Vitest + supertest)
- API documentation and a runbook

**Not included** — say this plainly:

| Out of scope | Why / what to offer instead |
|---|---|
| Frontend or UI | Separate service |
| Native mobile apps | Separate service |
| Serverless / cloud infrastructure setup | Deployment guidance included, hands-on setup is an add-on |
| Third-party payment, email, SMS integrations | Available as paid add-on |
| Ongoing maintenance, bug fixes after handover | Monthly retainer |
| Guaranteeing your business logic | I build the API to your spec; the spec is yours |

---

## 4. What you must do as the seller

Honest list — this is the part that cannot be automated.

1. **Create the marketplace account** and complete identity verification (KYC).
   Required before you can receive money. ~1 hour, once.
2. **Connect a payment method** (PayPal, bank transfer, or a payment provider).
   Without this you cannot be paid. ~20 minutes, once.
3. **Publish the listing** by pasting from `gig-copy.md`. ~30 minutes, once.
4. **Answer the first buyer message.** Buyers judge you on reply speed in the
   first hour. After that, most orders need almost no conversation.
5. **Send delivery** using `ORDER-INTAKE.md`.

After step 3, roughly 80% of the work is already built and automated.

---

## 5. Honest expectations

- **Income is not guaranteed and starts at zero.** A listing takes days to index.
  Expect 0–3 enquiries in the first two weeks.
- **Conversion, not traffic, is the bottleneck.** Marketplace listings get
  impressions; what matters is whether the title and first paragraph match a
  buyer's search.
- **Expect the first orders to be messy.** Scope discipline is a skill, not a
  setting. Assume you will under-price the first two.
- **This is a service, not passive income.** It stops the moment you stop
  replying. The productisation reduces the work per order; it does not remove the
  work.

---

## 6. Proof you can show a buyer today

Do not claim experience you do not have. Show these instead — they are verifiable
in under a minute:

| Claim | How the buyer verifies it |
|---|---|
| "98 automated tests, and you can run them" | They clone and run `npm test` |
| "No compiler or build tools required" | They read `package.json` — **6 runtime dependencies**, and not one of them has an `install`, `postinstall` or `node-gyp` script |
| "Security done properly" | They read `src/lib/password.js`, `src/middleware/rate-limit.js` |
| "Documented for handover" | They read `README.md` and `AGENTS.md` |

**On "no native dependencies" — the accurate version.** Six runtime
dependencies, none of which compile anything; the crypto and the database come
from Node itself (`node:crypto`, `node:sqlite`). The only binary anywhere in the
tree is `esbuild`, pulled in transitively by the test runner, and it ships as a
prebuilt download rather than compiled source. So: **no compiler, no build
tools, no `node-gyp`**. Say that, rather than "zero native dependencies", which
is technically untrue and a buyer could disprove.

**Make the repository visible.** A private repo proves nothing to a buyer. Either
make it public, or publish a scrubbed copy with the demo data and `.env` removed.