# Testing Guide — KefaloniaBNB

This document covers the full testing strategy, architecture, and runbook for the platform.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Test Architecture](#test-architecture)
3. [Unit Tests (Vitest)](#unit-tests-vitest)
4. [API / Integration Tests (Vitest)](#api--integration-tests-vitest)
5. [E2E Tests (Playwright)](#e2e-tests-playwright)
6. [Performance Tests (JMeter)](#performance-tests-jmeter)
7. [Environment Setup](#environment-setup)
8. [CI Strategy](#ci-strategy)
9. [Risk-Based Test Matrix](#risk-based-test-matrix)
10. [ISTQB Test Strategy Summary](#istqb-test-strategy-summary)
11. [Known Assumptions and Gaps](#known-assumptions-and-gaps)

---

## Quick Start

```bash
# Install all test dependencies
npm install

# Run unit + API tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode (TDD)
npm run test:watch

# E2E tests (starts dev server automatically)
npm run test:e2e

# E2E with browser UI (great for debugging)
npm run test:e2e:ui

# Performance smoke (requires JMeter installed)
cd tests/performance/jmeter && ./run.sh smoke local
```

---

## Test Architecture

```
tests/
├── unit/                   # Pure function tests (Vitest)
│   ├── pricing.test.ts
│   ├── availability.test.ts
│   ├── validators.test.ts
│   ├── ical.test.ts
│   └── translations.test.ts
├── api/                    # API route handler tests (Vitest + mocks)
│   ├── bookings-create.test.ts
│   └── stripe-webhook.test.ts
├── e2e/                    # Browser automation (Playwright)
│   ├── homepage.spec.ts
│   ├── listings.spec.ts
│   ├── listing-detail.spec.ts
│   ├── booking-flow.spec.ts
│   ├── booking-deposit.spec.ts
│   ├── contact.spec.ts
│   ├── faqs.spec.ts
│   ├── i18n.spec.ts
│   ├── admin-auth.spec.ts
│   ├── admin-bookings.spec.ts
│   ├── accessibility.spec.ts
│   └── mobile.spec.ts
├── fixtures/
│   ├── factories.ts         # Typed object factories for test data
│   └── test.fixtures.ts     # Playwright extended fixtures (axe-core)
├── mocks/
│   ├── supabase.mock.ts     # Supabase client mock
│   ├── stripe.mock.ts       # Stripe SDK mock
│   └── email.mock.ts        # Resend + Telegram mock
├── pages/                   # Playwright Page Object Models
│   ├── HomePage.ts
│   ├── ListingDetailPage.ts
│   ├── BookingFormPage.ts
│   ├── AdminLoginPage.ts
│   └── AdminBookingsPage.ts
└── performance/
    ├── README.md
    └── jmeter/
        ├── plans/           # .jmx test plan files
        ├── data/            # CSV parameterization files
        ├── env/             # .properties per environment
        ├── results/         # Generated .jtl + HTML reports (git-ignored)
        └── run.sh           # Helper script

docs/
└── testing/
    └── data-testid.md       # Recommended data-testid attributes
```

---

## Unit Tests (Vitest)

Unit tests cover all pure logic in `src/lib/` and `src/i18n/`. External
dependencies (Supabase, Stripe, email) are mocked at the module level.

### Running

```bash
npm test                     # single run
npm run test:watch           # watch mode
npm run test:coverage        # with lcov + html coverage report
```

### Coverage thresholds

| Metric | Threshold |
|--------|-----------|
| Lines | 80% |
| Functions | 80% |
| Branches | 75% |

Reported to `coverage/` as HTML and lcov.

### What is tested

| Module | Tests |
|--------|-------|
| `src/lib/pricing.ts` | Base calc, season modifier, extra guests, coupon clamping, currency |
| `src/lib/availability.ts` | Overlap detection, adjacent dates, dedup, addDays |
| `src/lib/validators.ts` | All 6 Zod schemas: valid, invalid, defaults, cross-field |
| `src/lib/ical.ts` | RFC 5545 structure, booking/block VEVENTs, round-trip parse |
| `src/i18n/translations.ts` | All 5 languages, fallback, unknown key, LANG_LABELS, isValidLang |

### Mocking approach

- `vi.mock('../../src/lib/supabase.ts', ...)` — replaces with in-memory spy
- `vi.mock('../../src/lib/stripe.ts', ...)` — returns pre-built session objects
- `vi.mock('../../src/lib/email.ts', ...)` — swallows email calls
- `vi.mock('../../src/lib/telegram.ts', ...)` — swallows Telegram calls

---

## API / Integration Tests (Vitest)

Tests for Astro API route handler functions, mocking all I/O at the module
boundary. The handlers are imported directly and called with a fake `Request`.

### What is tested

| Route | Scenarios |
|-------|-----------|
| `POST /api/bookings/create` | Validation 400, listing not found 404, dates unavailable 409, Stripe happy path, bank transfer, min_nights enforcement, Stripe failure rollback 502 |
| `POST /api/stripe/webhook` | Bad signature 400, session.completed full/deposit, session.expired, payment_intent.failed, unknown event type, missing booking_id |

### Pattern

```typescript
// 1. Mock all I/O modules before importing the handler
vi.mock('../../src/lib/supabase.ts', () => ({ getServiceClient: () => fakeClient }))
vi.mock('../../src/lib/stripe.ts', () => ({ createCheckoutSession: mockFn }))

// 2. Import handler dynamically (after mocks are hoisted)
const { POST } = await import('../../src/pages/api/bookings/create.ts')

// 3. Call with a fake Request
const res = await POST({ request: new Request('...', { method: 'POST', body: JSON.stringify(payload) }), locals: {} })
expect(res.status).toBe(200)
```

---

## E2E Tests (Playwright)

Browser-based end-to-end tests covering the full user journey.

### Running

```bash
# All E2E tests (chromium + mobile-chrome + mobile-safari)
npm run test:e2e

# With interactive browser UI
npm run test:e2e:ui

# Headed mode (watch browser)
npm run test:e2e:headed

# Single file
npx playwright test tests/e2e/booking-flow.spec.ts

# Specific browser only
npx playwright test --project=chromium

# With trace on failure
npx playwright test --trace on
```

### Environment variables for E2E

Copy `.env.test` and fill in values:

```bash
cp .env.test .env.test.local
```

| Variable | Purpose |
|----------|---------|
| `TEST_BASE_URL` | Dev server URL (default: http://localhost:4321) |
| `TEST_ADMIN_EMAIL` | Admin login for admin panel tests |
| `TEST_ADMIN_PASSWORD` | Admin password |
| `TEST_ADMIN_ROLE` | Set to `super_admin` for payout section tests |
| `TEST_LISTING_SLUG` | Real listing slug in dev DB |
| `TEST_LISTING_ID` | Real listing UUID |
| `TEST_DEPOSIT_LISTING_ID` | Listing with deposit_percent > 0 |
| `TEST_BOOKING_ID` | Real booking ID for admin tests |

Tests that require env vars **auto-skip** when they are not set. This is
intentional — CI runs a smaller surface and full E2E runs on staging.

### Page Object Models

POMs live in `tests/pages/`. Each file wraps a single page's locators and
actions behind a typed interface.

```typescript
const bookingForm = new BookingFormPage(page)
await bookingForm.goto(LISTING_ID, '2025-10-01', '2025-10-08', 2)
await bookingForm.fillGuestDetails({ name: 'Alice', email: 'alice@test.com' })
await bookingForm.selectPaymentMethod('stripe')
await bookingForm.submit()
```

### Accessibility smoke checks

The `accessibility.spec.ts` file runs `@axe-core/playwright` against all
public pages and fails on **critical** and **serious** WCAG 2.1 AA violations.

```bash
# Run only accessibility suite
npx playwright test tests/e2e/accessibility.spec.ts
```

---

## Performance Tests (JMeter)

See [`tests/performance/README.md`](tests/performance/README.md) for full details.

### Prerequisites

```bash
brew install jmeter   # macOS
jmeter --version      # verify ≥ 5.6.0
```

### Test plans

| Plan | Command | When to run |
|------|---------|------------|
| Baseline smoke | `./run.sh smoke local` | Before every deployment |
| Availability load | `./run.sh availability staging` | Weekly + after DB schema changes |
| Booking stress | `./run.sh stress staging` | Before major releases only |

### SLO Targets

| Endpoint | p50 | p95 | Error rate |
|----------|-----|-----|------------|
| `GET /api/availability` | 100ms | 500ms | < 0.5% |
| `POST /api/bookings/create` | 400ms | 2000ms | < 2% |
| `GET /villas/[slug]` | 400ms | 1200ms | < 0.1% |

### Safe data rules

- Always use `payment_method: bank_transfer` in load tests — no Stripe charges
- Use `@test.invalid` email domains — not deliverable
- Clean up after stress runs:
  ```sql
  DELETE FROM bookings WHERE guest_email LIKE '%@test.invalid';
  ```

---

## Environment Setup

### Local

```bash
npm run dev                  # start Astro dev server on :4321
npm test                     # unit + API tests
npm run test:e2e             # E2E (auto-starts dev server)
```

### CI (GitHub Actions)

```yaml
# .github/workflows/test.yml
jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22' }
      - run: npm ci
      - run: npm test
      - run: npm run test:coverage

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22' }
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
        env:
          TEST_BASE_URL: http://localhost:4321
          # Admin tests auto-skip if TEST_ADMIN_EMAIL is not set
```

---

## Risk-Based Test Matrix

Priority 1 = highest risk / business impact.

| ID | Area | Level | Type | Priority | Risk | Description |
|----|------|-------|------|----------|------|-------------|
| T01 | Booking creation | API | Integration | P1 | Critical | Correct price, availability check, Stripe session |
| T02 | Stripe webhook | API | Integration | P1 | Critical | Payment status, payout split, deposit logic |
| T03 | Availability overlap | Unit | Functional | P1 | Critical | Boundary: adjacent dates, multi-range overlap |
| T04 | Price calculation | Unit | Functional | P1 | High | Season modifier, extra guests, coupon clamping |
| T05 | Coupon validation | Unit | Functional | P1 | High | Percent vs fixed, expired, min_nights, max_uses |
| T06 | Booking E2E flow | E2E | Regression | P1 | Critical | Full flow: select dates → fill form → submit |
| T07 | Admin auth guard | E2E | Security | P1 | High | Unauthenticated /admin/* → redirect to login |
| T08 | Deposit payment plan | E2E | Functional | P2 | High | Deposit card UI, correct amount, API payload |
| T09 | Zod validators | Unit | Functional | P2 | High | All schema fields, cross-field refines |
| T10 | iCal feed | Unit | Functional | P2 | Medium | RFC 5545 structure, round-trip parse |
| T11 | i18n translations | Unit | Functional | P2 | Medium | Fallback, unknown key, all 5 languages |
| T12 | Listing detail page | E2E | Smoke | P2 | Medium | SEO meta, schema, gallery, booking widget |
| T13 | Homepage render | E2E | Smoke | P2 | Medium | Hero, nav, footer, correct email |
| T14 | Contact page email | E2E | Regression | P2 | Medium | Shows info@kefaloniabnb.com, not gmail |
| T15 | FAQ content | E2E | Smoke | P3 | Low | Generic platform content renders |
| T16 | i18n language switch | E2E | Functional | P2 | Medium | ?lang=el changes html[lang], text updates |
| T17 | hreflang tags | E2E | SEO | P3 | Medium | x-default + 5 lang alternates on each page |
| T18 | Availability API load | Performance | Load | P1 | High | 50 VUs, p95 < 500ms |
| T19 | Booking create stress | Performance | Stress | P1 | Critical | Find breaking point, error rate < 2% |
| T20 | Admin mobile nav | E2E | Functional | P3 | Low | Hamburger opens sidebar on 390px viewport |
| T21 | Accessibility | E2E | NFR | P2 | Medium | No critical/serious WCAG 2.1 AA violations |
| T22 | Mobile layout | E2E | Responsive | P3 | Low | No horizontal scroll on 375px |
| T23 | Super admin payout | E2E | Functional | P2 | High | Payout Split section visible only to super_admin |

---

## ISTQB Test Strategy Summary

### Scope

**In scope**: All public-facing pages, booking creation flow, pricing logic,
availability, coupon validation, admin auth, admin bookings, multilingual
support, Stripe webhook handling, iCal feed generation, performance of
availability and booking APIs.

**Out of scope**: Third-party Stripe dashboard, Supabase admin UI, Telegram
bot API internal behavior, Cloudflare edge infrastructure.

### Test levels

| Level | Tool | Trigger |
|-------|------|---------|
| Unit | Vitest | Every PR |
| API/Integration | Vitest | Every PR |
| E2E smoke | Playwright | Every PR (chromium only) |
| E2E regression | Playwright | Pre-release (3 browsers) |
| Performance smoke | JMeter | Every deployment |
| Performance load | JMeter | Weekly (staging) |
| Performance stress | JMeter | Pre-major-release only |

### Entry/Exit criteria

**Entry**: Dev server starts clean, Supabase migrations applied, test data seeded.

**Exit (unit/API)**: All tests pass, coverage thresholds met, no skipped tests
without documented reason.

**Exit (E2E)**: All P1/P2 scenarios pass on chromium; mobile viewports pass
for P1 flows; no console errors on public pages.

**Exit (performance)**: Smoke passes SLOs; no p99 regression > 20% vs baseline.

### Regression strategy

- Unit + API tests run on every PR (fast, < 30 s)
- E2E smoke runs on every PR (chromium only)
- Full E2E regression (all browsers + mobile) runs nightly and on release branches
- Performance baseline locked per release, regression flagged if p95 degrades > 15%

---

## Known Assumptions and Gaps

### Assumptions made

1. **Test database**: Unit and API tests use mocked Supabase — no real DB.
   E2E tests that need real data (listing slug, booking ID) require you to
   populate `.env.test.local` with values from your dev Supabase project.

2. **Stripe in performance tests**: All JMeter booking payloads use
   `payment_method: bank_transfer` to avoid Stripe charges. If you test
   Stripe flows under load, set up Stripe's test mode and never use
   production credentials.

3. **JMeter CSV listing IDs**: The UUIDs in `data/listings.csv` are
   placeholders. Replace with real seeded listing IDs from your dev/staging DB.

4. **Webhook signature verification**: The stripe-webhook API test mocks
   `constructWebhookEvent`. Real webhook testing requires a valid
   `STRIPE_WEBHOOK_SECRET` and an actual Stripe-signed payload.

5. **Admin tests**: All admin E2E tests skip gracefully when `TEST_ADMIN_EMAIL`
   is not set. They require a real admin account in your Supabase dev project.

6. **deposit_percent column**: Tests assume the `deposit_percent` column exists
   on the `listings` table (migration 004+). Verify this is applied.

7. **Cloudflare Workers context**: API route tests call handlers directly with
   a fake `Request`. The Cloudflare `ctx.waitUntil()` path is not exercised —
   fire-and-forget tasks (email, Telegram) are tested via mock call assertions,
   not actual execution.

### What to verify before applying

- [ ] Replace placeholder UUIDs in CSV files with real listing IDs
- [ ] Run `npm install` after adding new devDependencies
- [ ] Install Playwright browsers: `npx playwright install --with-deps`
- [ ] Install JMeter 5.6+ and verify `jmeter --version`
- [ ] Verify `STRIPE_WEBHOOK_SECRET` is set for webhook tests in staging
- [ ] Confirm `deposit_percent` and `payment_type` columns exist in Supabase
- [ ] Add seeded coupons `PERF10`, `PERF20`, `SUMMER25` to dev/staging DB
- [ ] Set `TEST_ADMIN_EMAIL` + `TEST_ADMIN_PASSWORD` in `.env.test.local`

### Gaps to address later

- **Contract tests**: No Pact or OpenAPI contract tests for the Supabase RPC
  `check_availability` function — worth adding if the DB schema evolves.
- **Visual regression**: No screenshot diffing (Percy, Argos). Add for
  listing cards if design stability becomes a concern.
- **Auth guard middleware unit tests**: `src/middleware/index.ts` is not unit-
  tested directly; its behavior is covered only by E2E admin auth tests.
- **iCal import parsing**: `parseICalFeed` is tested but the actual import
  flow (`/api/listings/[id]/ical.ts`) is not covered by API-level tests.
- **Email HTML rendering**: `sendBookingReceived` builds HTML — snapshot tests
  for email templates would catch regressions.
- **Telegram webhook handling**: `src/pages/api/telegram/webhook.ts` has no
  test coverage. Add when Telegram bot behavior becomes business-critical.
