/**
 * Order workspace generator.
 *
 * Creates a dated folder per order containing everything needed to run the job:
 * the intake form, the scope contract, the delivery checklist, the message
 * templates and a delivery countdown file.
 *
 * Usage:
 *   node tools/order.mjs new   --client "ACME" --tier standard --days 5
 *   node tools/order.mjs list
 *   node tools/order.mjs show  <order-id>
 *
 * Deliberately does NOT send money or contact buyers. Communication and payment
 * stay inside the marketplace.
 */

import { mkdirSync, writeFileSync, readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..');
const ORDERS_DIR = join(ROOT, 'orders');

/** What each package tier actually delivers. Used to detect scope drift. */
export const TIERS = {
  basic: {
    label: 'Basic',
    price: 149,
    defaultDays: 3,
    revisions: 1,
    included: [
      'JWT auth: register, login, refresh, logout',
      '1 resource with full CRUD',
      'SQLite persistence',
      'Input validation on every endpoint',
      '15+ automated tests',
      'README documentation',
    ],
    excluded: [
      'Additional resources',
      'Role based access control',
      'Pagination and filtering',
      'Rate limiting',
      'PostgreSQL or MySQL',
      'Deployment',
    ],
  },
  standard: {
    label: 'Standard',
    price: 399,
    defaultDays: 5,
    revisions: 2,
    included: [
      'Everything in Basic',
      'Up to 3 resources',
      'Roles: admin and member',
      'Pagination, filtering, search, sorting',
      'Rate limiting with Retry-After',
      '40+ automated tests',
      'README plus AGENTS.md runbook',
    ],
    excluded: [
      'More than 3 resources',
      'Audit logging',
      'CI workflow or Dockerfile',
      'Deployment',
      'Ongoing maintenance',
    ],
  },
  premium: {
    label: 'Premium',
    price: 899,
    defaultDays: 9,
    revisions: 3,
    included: [
      'Everything in Standard',
      'Unlimited resources',
      'Audit log table',
      'GitHub Actions CI workflow',
      'Dockerfile',
      '80+ automated tests',
      'Recorded handover walkthrough',
    ],
    excluded: ['Deployment', 'Ongoing maintenance', 'Frontend or mobile app'],
  },
};

/** Extras offered on both gigs, with the price to charge. */
export const EXTRAS = {
  'file upload': { price: 85, days: 1 },
  'password reset': { price: 60, days: 1 },
  'social login': { price: 120, days: 2 },
  'push messages': { price: 90, days: 2 },
  'offline sync': { price: 150, days: 3 },
  'device sessions': { price: 55, days: 1 },
  'add a resource': { price: 50, days: 1 },
  'postgresql setup': { price: 40, days: 1 },
  'api documentation': { price: 45, days: 1 },
  'email verification': { price: 60, days: 1 },
  'deployment setup': { price: 75, days: 2 },
  'simple admin panel': { price: 150, days: 3 },
  'extra fast delivery': { price: 25, days: 0 },
  'additional revision': { price: 20, days: 1 },
};

export function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

export function orderId(date, client) {
  return `${date}-${slugify(client)}`;
}

function addDays(iso, days) {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + Number(days));
  return d.toISOString();
}

export function buildOrder({ client, tier, days, extras = [], date, notes = '' }) {
  const spec = TIERS[tier];
  if (!spec) throw new Error(`Unknown tier "${tier}". Use one of: ${Object.keys(TIERS).join(', ')}`);

  const start = date ?? new Date().toISOString();
  const deliveryDays = Number(days ?? spec.defaultDays);
  const due = addDays(start, deliveryDays);

  const extraTotal = extras.reduce((sum, name) => sum + (EXTRAS[name]?.price ?? 0), 0);
  const extraDays = extras.reduce((sum, name) => sum + (EXTRAS[name]?.days ?? 0), 0);
  const dueWithExtras = addDays(start, deliveryDays + extraDays);

  return {
    id: orderId(start.slice(0, 10), client),
    client,
    tier,
    tierLabel: spec.label,
    basePrice: spec.price,
    extras: [...extras],
    extraTotal,
    total: spec.price + extraTotal,
    startedAt: start,
    deliveryDays,
    dueAt: due,
    dueAtWithExtras: dueWithExtras,
    revisionsAllowed: spec.revisions,
    revisionsUsed: 0,
    notes,
  };
}

function orderMeta(order) {
  return [
    '# Order',
    '',
    `- **Order id:** ${order.id}`,
    `- **Client:** ${order.client}`,
    `- **Package:** ${order.tierLabel} ($${order.basePrice})`,
    ...(order.extras.length
      ? [`- **Extras:** ${order.extras.join(', ')} (+$${order.extraTotal})`]
      : []),
    `- **Total agreed:** $${order.total}`,
    `- **Started:** ${order.startedAt}`,
    `- **Due:** ${order.dueAt}`,
    ...(order.extraDays ? [`- **Due with extras:** ${order.dueAtWithExtras}`] : []),
    `- **Revisions:** ${order.revisionsUsed} of ${order.revisionsAllowed} used`,
    ...(order.notes ? ['', '## Notes', order.notes] : []),
    '',
  ].join('\n');
}

function intakeMd(order) {
  return `# Requirements form — ${order.client}

Send this to the buyer at order start. Every question exists because its absence
caused a dispute. If an answer is unknown, write "you decide" and we propose.

## 1. Resources
List the things the API will manage (e.g. "customers", "invoices").
For each one, list every field it should have.

## 2. Relationships
Which resources reference which? (e.g. "a customer has many invoices")

## 3. Endpoints
What actions are needed? Usual ones: create, list, view, update, delete.
Plus anything special (search, export, status change).

## 4. Users and roles
Who signs in? Are roles needed beyond "signed in user"?

## 5. Existing data
Do you already have a database schema? If yes, paste it.

## 6. Hosting
Do you have a server or hosting target in mind?

## 7. Explicitly out of scope
Anything we must NOT build? (UI, mobile app, payments, email, file storage)

## 8. Deadline
Any date we must hit?

---

## Answers

> Fill in below from the buyer's reply.

-

## Anything the buyer changed after ordering

> Deviations must be written here and confirmed before any extra work starts.

-
`;
}

function scopeMd(order) {
  const spec = TIERS[order.tier];
  return `# Scope contract — ${order.client}

Confirmed with the buyer before work starts. Any change to this list is new
work, quoted separately. Do not agree to changes in chat without writing them
here first.

## Included (${spec.label} tier)

Base $${spec.price} plus ${order.extras.length} agreed extra(s), total $${order.total}.

${spec.included.map((i) => `- [ ] ${i}`).join('\n')}

## Excluded

${spec.excluded.map((e) => `- ${e}`).join('\n')}

## Agreed extras

${order.extras.length
  ? order.extras.map((e) => `- [ ] ${e} — $${EXTRAS[e]?.price ?? '?'}`).join('\n')
  : '_None._'}

## Deviation log

> Anything the buyer asks for that is not listed above. Record it here, quote
> it, and wait for a yes before starting.

| Date | Request | Quote | Buyer approved |
|---|---|---|---|
| | | | |
`;
}

function checklistMd(order) {
  return `# Pre-delivery checklist — ${order.client}

Every line has been a real failure mode. Do not send until all are true.

## Verification (run these, paste the output)

- [ ] \`npm run typecheck\` → 0 errors
- [ ] \`npm test\` → 100% passing
- [ ] \`npm run build\` → compiles
- [ ] Compiled build started, real requests exercised
- [ ] Output pasted into RESULT.md

## Code

- [ ] No TODO, FIXME, empty function bodies or commented-out code
- [ ] No hardcoded secrets; config from environment variables
- [ ] No mock or placeholder data left behind

## Security

- [ ] Passwords hashed, never logged or returned
- [ ] Auth endpoints rate limited
- [ ] Every input validated
- [ ] All SQL parameterised
- [ ] Errors leak no stack traces
- [ ] Unauthenticated access confirmed rejected

## Documentation

- [ ] README.md — install, run, endpoint reference, error format
- [ ] AGENTS.md — requirements, operations, troubleshooting
- [ ] .env.example complete, no real values
- [ ] .gitignore excludes node_modules, .env, dist, database files

## Hygiene

- [ ] Archive contains no .env, node_modules, dist or database file
- [ ] Demo data removed or clearly marked
- [ ] Commit history clean and readable
- [ ] Every scope item above is actually delivered

## Delivery

- [ ] Buyer confirmed which tier they bought
- [ ] Requirements answered and saved in intake.md
- [ ] Deviations documented and approved in scope.md
- [ ] Delivery message includes verification steps
- [ ] Revisions remaining stated
`;
}

function messagesMd(order) {
  return `# Message templates — ${order.client}

## First reply

Thanks for reaching out.

To give you an accurate quote and timeline:

1. What does the API need to manage, and what fields does each resource have?
2. Roughly how many endpoints do you need?
3. Do you already have a database schema?

If you are not sure, that is normal. Describe the product you are building and
I will propose a design for you to approve.

## Confirming scope

Here is what I understood from your requirements, and what I will build.

RESOURCES      {{LIST}}
ENDPOINTS      {{LIST}}
DATABASE       {{SQLITE_OR_POSTGRES}}
AUTH           {{ROLES}}
EXPLICITLY OUT {{LIST}}

Deliverable: source code with tests and documentation, in a Git repository.
Timeline: ${order.deliveryDays} days from when I start.

Anything I have misread? Tell me now. I would rather fix the scope before I
start than after.

## Daily update

Quick update on ${order.client}:

DONE        {{COMPLETED}}
IN PROGRESS {{CURRENT}}
NEXT        {{NEXT}}

Tests: {{PASSING}}/{{TOTAL}} passing. Nothing is reported as working unless the
tests confirm it.

## Revision request

Thanks for the feedback — good catch.

That is {{within / outside}} the agreed scope.

{{If within}} I will make the change and re-run the tests. Done within 1 day.

{{If outside}} That is new work rather than a change to what was agreed, so I
would like to quote it first: about {{PRICE}} and {{TIME}}. Want me to go ahead?

Either way, tell me and I will proceed.

## Delivery

${order.client} is delivered.

INCLUDED
- Git repository (full history, you own it)
- Source archive attached
- README.md — setup and API reference
- AGENTS.md — operations runbook

VERIFY IT YOURSELF
1. npm install
2. npm test — every test should pass
3. npm run dev — health check at http://localhost:3000/health

GETTING STARTED
- Copy .env.example to .env
- Set JWT_SECRET: node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"

Revisions remaining: ${order.revisionsAllowed}.
`;
}

function resultMd(order) {
  return `# Verification output — ${order.client}

Paste real command output here. Do not summarise; copy it.

## npm run typecheck

\`\`\`
\`\`\`

## npm test

\`\`\`
\`\`\`

## npm run build

\`\`\`
\`\`\`

## Manual request check

\`\`\`
\`\`\`

## Bugs found and fixed during QA

> Record anything the tests caught. This is the proof the work was checked.

-
`;
}

export function createOrder(input) {
  const order = buildOrder(input);
  const dir = join(ORDERS_DIR, order.id);
  mkdirSync(dir, { recursive: true });

  writeFileSync(join(dir, 'ORDER.md'), orderMeta(order));
  writeFileSync(join(dir, 'intake.md'), intakeMd(order));
  writeFileSync(join(dir, 'scope.md'), scopeMd(order));
  writeFileSync(join(dir, 'checklist.md'), checklistMd(order));
  writeFileSync(join(dir, 'messages.md'), messagesMd(order));
  writeFileSync(join(dir, 'RESULT.md'), resultMd(order));

  return { order, dir };
}

export function listOrders() {
  if (!existsSync(ORDERS_DIR)) return [];
  return readdirSync(ORDERS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
}

/**
 * Flags requests that fall outside the agreed tier. Matching is keyword based
 * and deliberately conservative: it suggests, it never decides.
 */
export function detectScopeDrift(requestText, order) {
  const spec = TIERS[order.tier];
  const text = requestText.toLowerCase();
  const flags = [];

  if (!text) return flags;

  const extra = EXTRAS['add a resource'];
  const resourceMentions = (text.match(/\b(new|another|extra|additional|one more)\s+(resource|entity|model|table)\b/g) || []);
  if (resourceMentions.length > 0) {
    flags.push({
      kind: 'out-of-scope',
      item: `New resource — ${spec.included.some((i) => /1 resource/.test(i)) ? 'Basic tier allows 1 resource' : 'Confirm the resource count is still within the package'}`,
      quote: `$${extra.price}`,
    });
  }

  for (const [needle, ex] of Object.entries(EXTRAS)) {
    if (needle === 'add a resource' || needle === 'extra fast delivery' || needle === 'additional revision') continue;
    if (text.includes(needle)) {
      flags.push({ kind: 'available-extra', item: `${needle} — matches an existing extra`, quote: `$${ex.price}` });
    }
  }

  const alwaysOut = [
    { needle: /\b(frontend|ui|react|vue|angular|admin panel|dashboard ui)\b/, item: 'Frontend or UI', quote: 'quote separately' },
    { needle: /\b(payment|stripe|checkout|billing card|subscription charge)\b/, item: 'Payment integration', quote: 'quote separately' },
    { needle: /\b(email|smtp|sendgrid|mailgun|notification email)\b/, item: 'Email sending', quote: 'quote separately' },
    { needle: /\b(deploy|deployment|hosting|aws|digitalocean|vercel|production server)\b/, item: 'Deployment', quote: '$75 extra, or quote separately' },
    { needle: /\b(maintain|maintenance|ongoing support|monthly|retainer)\b/, item: 'Ongoing maintenance', quote: 'monthly retainer' },
  ];
  for (const rule of alwaysOut) {
    if (rule.needle.test(text)) {
      flags.push({ kind: 'out-of-scope', item: rule.item, quote: rule.quote });
    }
  }

  if (/\b(discount|cheaper|lower price|reduce the price)\b/.test(text)) {
    flags.push({ kind: 'pricing', item: 'Asked for a discount', quote: 'reduce scope instead of price' });
  }

  return flags;
}

export function deliveryStatus(order, now = new Date()) {
  const due = new Date(order.dueAt);
  const msLeft = due.getTime() - now.getTime();
  const daysLeft = Math.ceil(msLeft / 86_400_000);
  return {
    daysLeft,
    hoursLeft: Math.ceil(msLeft / 3_600_000),
    overdue: msLeft < 0,
    progressUsed: order.revisionsUsed,
    progressAllowed: order.revisionsAllowed,
    revisionsLeft: order.revisionsAllowed - order.revisionsUsed,
  };
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) { args[key] = next; i += 1; } else { args[key] = true; }
    } else {
      args._.push(a);
    }
  }
  return args;
}

function main() {
  const [command, ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);

  if (command === 'new') {
    const client = args.client;
    if (!client || client === true) {
      console.error('Usage: node tools/order.mjs new --client "ACME" [--tier basic|standard|premium] [--days N] [--extras "a, b"]');
      process.exit(1);
    }
    const extras = typeof args.extras === 'string'
      ? args.extras.split(',').map((s) => s.trim()).filter(Boolean)
      : [];
    const { order, dir } = createOrder({
      client,
      tier: typeof args.tier === 'string' ? args.tier : 'basic',
      days: typeof args.days === 'string' ? args.days : undefined,
      extras,
      notes: typeof args.notes === 'string' ? args.notes : '',
    });
    console.log(`Created ${order.id}`);
    console.log(`  ${dir}`);
    console.log(`  $${order.total}  due ${order.dueAt.slice(0, 10)}  revisions ${order.revisionsAllowed}`);
    return;
  }

  if (command === 'list') {
    const orders = listOrders();
    if (orders.length === 0) {
      console.log('No orders yet. Create one with: node tools/order.mjs new --client "NAME"');
      return;
    }
    for (const id of orders) {
      const meta = readFileSync(join(ORDERS_DIR, id, 'ORDER.md'), 'utf8');
      const due = (meta.match(/- \*\*Due:\*\* (.+)/) || [])[1] || '?';
      const client = (meta.match(/- \*\*Client:\*\* (.+)/) || [])[1] || '?';
      const dueExtras = (meta.match(/- \*\*Due with extras:\*\* (.+)/) || [])[1] || due;
      const status = deliveryStatus({ dueAt: dueExtras });
      console.log(`${id}  ${client}  due ${due.slice(0, 10)}  ${status.overdue ? `OVERDUE ${Math.abs(status.daysLeft)}d` : `${status.daysLeft}d left`}`);
    }
    return;
  }

  if (command === 'check') {
    const request = typeof args.request === 'string' ? args.request : '';
    const id = args._[0];
    if (!id) {
      console.error('Usage: node tools/order.mjs check <order-id> --request "buyer asked for ..."');
      process.exit(1);
    }
    const meta = readFileSync(join(ORDERS_DIR, id, 'ORDER.md'), 'utf8');
    const order = {
      tier: ((meta.match(/- \*\*Package:\*\* \w+/) || [])[0] || '').includes('Standard') ? 'standard'
        : (meta.match(/- \*\*Package:\*\* Premium/) ? 'premium' : 'basic'),
      revisionsAllowed: Number((meta.match(/- \*\*Revisions:\*\* \d+ of (\d+)/) || [])[1] || 1),
      revisionsUsed: Number((meta.match(/- \*\*Revisions:\*\* (\d+)/) || [])[1] || 0),
      dueAt: (meta.match(/- \*\*Due:\*\* (.+)/) || [])[1] || new Date().toISOString(),
    };
    const flags = detectScopeDrift(request, order);
    if (flags.length === 0) {
      console.log('No scope issues detected.');
    } else {
      console.log(`${flags.length} item(s) to clarify before starting:\n`);
      for (const f of flags) {
        console.log(`  [${f.kind}] ${f.item}  ->  ${f.quote}`);
      }
      console.log('\nWrite any agreed change into scope.md before starting work.');
    }
    return;
  }

  console.log('Usage: node tools/order.mjs <new|list|check> ...');
}

if (process.argv[1] && process.argv[1].endsWith('order.mjs')) {
  main();
}