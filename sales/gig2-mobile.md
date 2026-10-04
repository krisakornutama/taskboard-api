# Gig 2 — Mobile App Backend (Fiverr)

Second listing. Same proven codebase, a different buyer and a different
argument. Deliberately distinct from `gig-copy.md` in title, framing, packages
and extras — Fiverr down-ranks near-duplicate listings.

- **Token overlap with Gig 1:** 25% (measured, not estimated)
- **Angle:** mobile developers who need a backend shipped, not an architecture
  lecture
- **Gallery:** `sales/gallery-images/mobile-*.png`

---

## Gig title

```
I will build a secure backend for your iOS or Android app
```

57 characters, 12 words, letters and numbers only — passes Fiverr validation.

**Alternates**

```
I will build a backend API for your mobile app with auth and sync
```
```
I will build a mobile app backend API with user accounts and sync
```

---

## Category

```
Programming & Tech  ->  Software Development
```

Same as Gig 1. The difference is the buyer intent reached through keywords, not
the taxonomy.

---

## Search tags (5 maximum)

```
api
mobileapp
backend
nodejs
ios
```

**Better method:** type a candidate into the tag box and let Fiverr's
autocomplete show search volume, then take the five highest.

---

## Positive keywords

```
mobile backend
mobile app api
backend for ios app
backend for android app
app api development
user authentication api
push notification api
file upload api
offline sync
flutter backend
react native backend
node js api
express api
```

---

## Packages

### Basic — $149 · 3 days · `Starter App API`

```
User accounts with JWT auth, one data resource with full CRUD, paged list
endpoints, 15+ automated tests, README.
```

### Standard — $399 ⭐ · 5 days · `Production App API`

```
Up to 3 resources, roles, auth refresh rotation, throttling with Retry-After,
pagination and filtering, 40+ automated tests, README plus runbook.
```

### Premium — $899 ⭐ · 9 days · `Full App Backend`

```
Unlimited resources, audit log, CI workflow, Dockerfile, 80+ automated tests,
recorded handover.
```

### Feature checkboxes

| | Basic | Standard | Premium |
|---|:---:|:---:|:---:|
| Include source code | yes | yes | yes |
| Detailed code comments | no | yes | yes |
| Database integration | yes | yes | yes |
| Revisions | 1 | 2 | 3 |

---

## Extras

Mobile-specific, so none of these duplicates Gig 1. Each is custom work built
and tested at the time of the order — nothing here is claimed to exist in the
reference build.

| Title | Description | Price | Days |
|---|---|---:|---:|
| `File upload` | `add image and file upload with type and size validation` | 85 | 1 |
| `Password reset` | `add a forgot password flow with single use tokens` | 60 | 1 |
| `Social login` | `add Google or Apple sign in with OAuth 2` | 120 | 2 |
| `Push messages` | `add an FCM or APNs send endpoint using your credentials` | 90 | 2 |
| `Offline sync` | `add delta and since endpoints for offline first apps` | 150 | 3 |
| `Device sessions` | `let users see and revoke the devices signed into their account` | 55 | 1 |

Plus the built-ins:

| Extra | Basic | Standard | Premium |
|---|---|---|---|
| Extra fast delivery | 1 day · $25 | 2 days · $40 | 3 days · $70 |
| Additional revision | $20 | $20 | $20 |

**Do not enable** Include source code, Detailed code comments or Database
integration as extras — they are already in every package and selling them again
reads as double-charging.

---

## Description (1090 of 1200 characters)

```
Your app needs a backend and you do not want to wait three weeks for one.

I will build you a tested REST API your iOS or Android app can talk to from
day one: user accounts that stay signed in, data endpoints that behave, and
error responses your app can actually display.

DESIGNED FOR A PHONE, NOT A DEMO
- Access tokens expire in 15 minutes; the app refreshes silently instead of
  throwing the user back to the login screen
- Refresh tokens rotate, and a replayed token revokes every session
- Every response carries rate-limit headers, so retries do not become a
  brute-force vector
- 429 responses include Retry-After, so your app knows how long to wait
- Paged lists return total and page count, so infinite scroll works
- One error shape for every failure, with a machine-readable code

WHAT YOU GET
Node.js, Express 5 and TypeScript on SQLite or your PostgreSQL. Six runtime
dependencies, none of which compile anything, so npm install cannot fail on
your build machine. Requires only Node 22.5 or newer.

THE TESTS ARE THE PROOF
98 automated tests against a real database over real HTTP, not mocks. They
cover auth, token expiry, stolen-token detection, cross-user data isolation,
SQL injection attempts and cascading deletes. Run npm test and see for
yourself.

Message me what your app does and I will reply with a plan.
```

**Excluded, and said so in the listing:** no frontend, no native app, no
infrastructure provisioning, no ongoing maintenance.

---

## FAQ

**Will my app get logged out constantly?**
```
No. Access tokens last 15 minutes and refresh silently through a separate
refresh token. Users only see a login screen after a long absence or when they
sign out.
```

**What if the network drops mid request?**
```
Retry safely. Every response carries the rate-limit budget, and throttled
responses tell you exactly how long to wait rather than failing vaguely.
```

**Do I get the code?**
```
Yes, full ownership including the Git history. Source code is included in every
package.
```

**Can you use my existing backend?**
```
If you send your schema I can adapt to it. Otherwise the default is SQLite so
you can run it immediately with no database server.
```

**How do we communicate?**
```
English or Thai, by message. I send a plan for your approval before I start and
one update per working day.
```

---

## Requirements (2 items only)

```
What does your app need to do, and what data does it store?
```
```
Anything out of scope (UI, App Store submission, third-party payments)?
```

The full 12-question intake form is sent once an order is placed, not on the
listing. Fewer requirements means more people press the button.

---

## Gallery

| File | Caption |
|---|---|
| `mobile-1-auth.png` | `Sign-in flow: register, refresh rotation, and stolen-token detection` |
| `mobile-2-network.png` | `Real headers: pagination meta, 429 and Retry-After` |
| `mobile-3-errors.png` | `Every error returns the same shape, so clients need one handler` |

All three rendered from real captured output, not mock-ups.

---

## Publishing checklist

- [ ] Title pasted exactly, Fiverr shows "Just perfect"
- [ ] Subcategory is `Software Development`, not `Vibe Coding`
- [ ] Service type is the build option, not troubleshooting
- [ ] Tags and keywords filled
- [ ] Three packages named and priced
- [ ] Extra fast delivery has days **and** price for all three packages
- [ ] Six custom extras added
- [ ] Description pasted whole, no broken markdown
- [ ] Three gallery images uploaded with captions
- [ ] Publish

---

## After publishing

Leave it alone for 72 hours. Fiverr needs time to index a new listing, and
editing during that window resets it.

If it is live with zero impressions after 7 days, change the title — not the
price. Price is rarely the reason a listing with keywords in the title gets no
views.