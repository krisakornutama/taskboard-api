# Seller Profile — ready to paste

Fiverr seller profile rebuild, aligned with the two published gigs (REST API and
mobile backend). Everything below is defensible from the actual project and the
actual background. Nothing is invented.

Field limits are not shown here because Fiverr hides them; if a field rejects the
text, shorten from the end rather than removing a claim.

---

## 1. Name

**Current:** `Sovereign OS`

A brand name works for established sellers. For a first listing with zero orders,
a personal name converts better: buyers check who is behind the work.

| Option | Trade-off |
|---|---|
| Keep `Sovereign OS` | Consistent brand, but zero reviews means zero trust to offset the abstraction |
| Use your name | Buyers see a person; Fiverr's own guidance favours this early |

Changing it is easy on Fiverr but breaks existing profile links and any sharing
you have done. Either is defensible — this is a judgement call, not a defect.
If unsure, keep `Sovereign OS` for now and revisit after five reviews.

---

## 2. About — paste this

```
Developer and published technical writer. Associate degree in computer
technology, class of 2024.

I build tested REST API foundations in Node.js and TypeScript that teams can
extend: user accounts, data resources, roles, pagination and rate limiting.
Every delivery includes a passing test suite and operations documentation.

Writing has taught me that documentation is part of the product, not an
afterthought. I have published eight books, which is the same skill applied
to systems instead of stories.

I work at fixed scope and fixed price. You receive the source code, the tests
and the instructions to run it. If you are not sure what you need, describe
the product and I will propose a design for you to approve.
```

**Why this shape**

| Paragraph | Job it does |
|---|---|
| Line 1–3 | Answers "what do you actually sell" in one breath |
| Line 5–8 | Names the concrete deliverables, matching what the gig promises |
| Line 10–12 | Uses the writing background as a *reason to trust the documentation* rather than as an unrelated career |
| Line 14–16 | Removes price risk: fixed scope, fixed price, code and docs included |

**Cut if the field is too short:** the writing paragraph first, then line 14.

---

## 3. Skills — what to remove

| Remove | Why |
|---|---|
| `Arduino` | Irrelevant to both gigs, and beginner level adds nothing |
| `Adobe Photoshop` | Same |

These do not hurt by themselves, but every skill slot is a slot a relevant skill
could occupy, and beginner-level noise dilutes a profile.

## 4. Skills — what to add

| Skill | Level | Honest basis |
|---|---|---|
| `REST API` | Intermediate | Built and shipped a full CRUD API with auth |
| `Node.js` | Intermediate | Can run, modify and extend the delivered codebase |
| `JavaScript` | Intermediate | Same |
| `TypeScript` | Intermediate | Project runs in strict mode |
| `JSON` | Advanced | Request and response design |
| `API Documentation` | Advanced | Writing background plus `README` and `AGENTS.md` |
| `Technical Writing` | Advanced | Eight published books |
| `Git` | Intermediate | Repo with clean history |
| `SQL` | Intermediate | Schema design, queries, indexing |
| `Authentication` | Intermediate | JWT, refresh rotation, RBAC |
| `Postman` | Beginner | Reasonable — will need it, does not know it yet |
| `Python` | Beginner | Keep as-is. Honest, and useful for smaller gigs later |

**On levels.** Fiverr's own definitions: *Beginner* = has read about it;
*Intermediate* = can build and debug it; *Expert* = can architect and optimise
it. Judged against those, `Intermediate` on the stack above is defensible — the
project is real, tested and extensible.

Do not list anything as Expert. If a buyer asks an Expert-level question you
cannot answer, the listing loses far more than the level badge was worth.

---

## 5. Portfolio — add this entry

```
TaskBoard API — production-ready REST service

A complete, documented REST API built with Node.js, Express and TypeScript on
SQLite, covering the full brief of a real backend rather than a tutorial
snippet.

What it demonstrates
- JWT authentication with refresh-token rotation and replay detection
- Role-based access control with enforced per-user data isolation
- Pagination, filtering, search and whitelisted sorting
- Per-IP rate limiting with Retry-After and X-RateLimit headers
- Input validation on every endpoint via a schema library
- Consistent JSON error envelope that leaks no internals
- 98 automated tests hitting a real database over real HTTP

Engineering choices
- Zero native dependencies, so npm install cannot fail on a build toolchain
- SQL and cryptography come from Node's own standard library
- Strict TypeScript with additional safety checks enabled
- 98 tests run in about eight seconds

Source: github.com/soverignos1-spec/taskboard-api
The test suite is included, so this can be verified rather than taken on trust.
```

**Upload these three images to the portfolio entry** — they are already in
`sales/gallery-images/`:

| File | Shows |
|---|---|
| `01-tests.png` | The test suite passing |
| `02-security.png` | Live security responses |
| `03-setup.png` | Zero-setup installation |

**This single entry is the highest-value change on the page.** It turns an empty
Portfolio section into proof, and it is the section buyers scroll to.

---

## 6. Work experience — add these two

Entry 1:

```
Title:      Freelance Software Developer and Technical Writer
Company:    Self-employed
Duration:   2020 — present
Description:
Technical writing and software development for clients and for my own
published work. Recent engineering work includes designing, building, testing
and documenting a production-ready REST API in Node.js and TypeScript —
authentication, role-based access, pagination, rate limiting and a 98-test
suite. Eight books published on strategy and human behaviour.
```

Entry 2 — this one is real, free, and currently missing:

```
Title:      Apprentice
Company:    OBP Nong Khai
Duration:   6 months
Description:
Six-month apprenticeship. [Add one line about what you actually did or learned —
the part you are least likely to forget.]
```

> Fill in the bracketed line. An empty description is worse than a thin entry.

---

## 7. Education — keep, minor tidy

```
Nong Khai Technical College
Associate Degree — Computer Technology
Thailand, graduated 2024
```

The wording already reads fine. Leave it.

---

## 8. Certifications — do not fabricate

Leaving this empty is honest and costs little.

If you want something in the slot later, take a genuinely free course with a
verifiable certificate in the stack you sell — a Node.js, Express or API-security
course from a recognised provider. It is real work, and it is worth something
because it is real. Do not list a certificate you have not earned.

---

## 9. Settings that matter more than the text

| Setting | Set to | Why |
|---|---|---|
| **Response time** | The fastest you can genuinely sustain | A stated 1 hour with a 1-day actual reply is worse than stating 3 hours and hitting it |
| **Availability** | Keep active, but set an honest delivery time | Too fast invites work you cannot finish on schedule |
| **Seller level / metrics** | Leave alone | Rises with orders |

---

## 10. What must not go on the profile

| Do not write | Because |
|---|---|
| "10 years of experience" | You have been working since 2020 — say 5 years, or omit |
| "Expert Node.js developer" | Not defensible against probing questions |
| "I lead a team of developers" | Nothing supports it |
| Any client name or testimonial you cannot produce | Get removed, and it is not worth the risk |
| "Guaranteed results" | Guarantees are the fastest way to lose a dispute |

The discipline: every claim must survive one follow-up question from an
experienced buyer. Write only what you could answer.

---

## Profile checklist

- [ ] About pasted (or shortened to fit)
- [ ] Arduino and Photoshop removed
- [ ] Ten relevant skills added at honest levels
- [ ] Portfolio entry created with the GitHub link and three images
- [ ] Both work experience entries added
- [ ] Response time set to something you can keep
- [ ] Open the profile **logged out** and read it as a buyer would

That last one matters. Buyers see the public version. Check that it does not
contradict your gig.