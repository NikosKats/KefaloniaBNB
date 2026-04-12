# Feature Delivery Testing Policy

> **Non-negotiable principle:**
> No new feature may be merged unless the appropriate automated tests are added
> or updated and the relevant testing pipeline passes. Testing is a release gate,
> not documentation.

---

## 1. Definition of Done

A feature is **not done** unless every applicable item below is satisfied.
"Not applicable" must be explicitly justified in the PR description.

### Mandatory for every feature

- [ ] Unit tests added or updated for all affected pure business logic
- [ ] API/integration tests added or updated for all affected route handlers
- [ ] All existing tests still pass; no tests deleted or silenced to make CI green
- [ ] No TypeScript errors introduced (`npm run type-check` passes)
- [ ] Build compiles cleanly (`npm run build` succeeds)
- [ ] Coverage thresholds still met for critical modules (see §8)
- [ ] PR checklist completed (see `.github/PULL_REQUEST_TEMPLATE.md`)

### Required for user-facing changes

- [ ] E2E tests added or updated for affected user journeys
- [ ] Accessibility impact assessed; smoke check passes for changed pages
- [ ] Screenshots or screen recordings attached to the PR

### Required for load-sensitive path changes

- [ ] Performance impact assessed
- [ ] JMeter plan updated or explicitly waived with justification
- [ ] Performance scenario identified: `baseline | load | stress | spike | soak`
- [ ] Threshold regression documented

### Required for schema changes

- [ ] Supabase migration file added under `supabase/migrations/`
- [ ] Migration is additive-safe (new columns nullable or have defaults)
- [ ] Test fixtures and factory functions updated in `tests/fixtures/factories.ts`
- [ ] Rollback plan documented

---

## 2. Test Impact Analysis

Every PR that touches business logic, API routes, or UI components must include
a Test Impact Analysis section. Use the template at
`docs/testing/templates/test-impact-analysis.md`.

The analysis must answer:

| Question | Required detail |
|----------|----------------|
| Which `src/lib/` modules changed? | List files |
| Which API routes changed? | List `src/pages/api/` paths |
| Which user journeys changed? | List E2E flows affected |
| Which external integrations changed? | Supabase / Stripe / Telegram / email / iCal |
| What new risks were introduced? | Edge cases, failure modes, security surface |
| Which existing tests must be updated? | List spec files |
| Which new tests must be added? | List spec files with test case names |
| Is JMeter coverage required? | Yes/No + scenario type |

---

## 3. Test Pyramid Distribution

Every new feature must be distributed across the test pyramid deliberately.
Claude must explain the distribution for each feature.

```
         ▲
        /E2E\          — business-critical user journeys only
       /─────\         — 8–15% of test count
      / API   \        — route handlers, validation, auth, mocks
     /─────────\       — 25–35% of test count
    /  Unit     \      — pure logic, boundary conditions, edge cases
   /─────────────\     — 50–65% of test count
```

### Rules

- **Unit tests first**: If a behaviour can be tested at the unit level, it
  should be. Unit tests are fast, deterministic, and cheap to maintain.
- **API tests for I/O boundaries**: Route handlers that interact with Supabase,
  Stripe, or email should be tested at the API level with mocked dependencies.
- **E2E only for user-visible flows**: Write E2E tests only when the value is
  in verifying the integrated experience (navigation, form submission, redirect,
  price display). Avoid E2E for logic already covered by unit tests.
- **No duplication across levels**: If a validation rule is fully covered by
  a Zod unit test, do not repeat the same assertion in an E2E test.

---

## 4. High-Risk Features — Mandatory Gates

The following features require **stricter** test gates before merge.

### High-risk feature list

| Area | Why it's high-risk |
|------|--------------------|
| Pricing logic (`src/lib/pricing.ts`) | Incorrect price = direct revenue impact |
| Availability (`src/lib/availability.ts`) | Double-booking = severe guest/owner impact |
| Booking creation (`/api/bookings/create`) | Core transaction; involves DB, Stripe, email, Telegram |
| Coupon validation (`/api/coupons/validate`) | Discount abuse / revenue leakage |
| Auth / login / logout (`/api/auth/*`) | Account takeover, privilege escalation |
| Admin access control (middleware) | Unauthorized admin access |
| Payment / Stripe (`/api/stripe/*`) | Financial data, PCI-DSS surface |
| File uploads (`/api/upload/*`) | Storage abuse, malicious file risk |
| Webhooks (`/api/stripe/webhook`, `/api/telegram/webhook`) | Replay attacks, state corruption |
| Supabase migrations | Schema changes affect all downstream queries |

### Mandatory gates for high-risk features

1. **Unit tests**: Required. Every business rule and edge case must have unit coverage.
2. **API/integration tests**: Required. Every success path, validation path, and
   external-dependency-failure path must be tested with mocked services.
3. **E2E tests**: Required where user-facing. At minimum: happy path + one failure scenario.
4. **JMeter**: Required if the endpoint appears in the load-sensitive list (§10).
   Must run as a pre-release gate. Baseline smoke must run on every staging deploy.
5. **Merge block**: PRs that add/modify a high-risk area without corresponding
   test updates are **blocked from merge** regardless of CI status.

---

## 5. Mandatory Pipeline Stages

Every feature passes through these stages in order.

```
Pull Request
  │
  ├─ [FAST — target < 8 min] ─────────────────────────────────────────────────
  │   ├─ 1. Install dependencies (cached)
  │   ├─ 2. Lint
  │   ├─ 3. Type-check (astro check)
  │   ├─ 4. Unit tests + coverage gate
  │   ├─ 5. API/integration tests
  │   ├─ 6. E2E smoke (chromium only, P1 specs)
  │   ├─ 7. Accessibility smoke (if src/ changed)
  │   └─ 8. Build validation
  │
Protected Branch (main / staging)
  │
  ├─ [EXTENDED — runs post-merge] ────────────────────────────────────────────
  │   ├─ 1. All of the above (fresh)
  │   ├─ 2. Full E2E regression (chromium + mobile-chrome + mobile-safari)
  │   ├─ 3. JMeter baseline smoke (5 VUs × 3 min)
  │   └─ 4. Build + staging deploy + post-deploy smoke
  │
Nightly (02:00 UTC)
  │
  ├─ [COMPREHENSIVE] ─────────────────────────────────────────────────────────
  │   ├─ 1. Full unit + API tests
  │   ├─ 2. Full E2E regression (3 browsers, admin tests included)
  │   ├─ 3. JMeter baseline smoke
  │   └─ 4. JMeter availability load (Mon only: 50 VUs × 10 min)
  │
Release / pre-production
  │
  └─ [GATE] ──────────────────────────────────────────────────────────────────
      ├─ 1. Full unit + API
      ├─ 2. Full E2E (3 browsers, retries=3)
      ├─ 3. JMeter baseline smoke (required, hard gate)
      ├─ 4. JMeter booking stress, condensed (30 VUs × 5 min, hard gate)
      ├─ 5. Build + staging deploy
      └─ 6. Post-deploy smoke verification
```

---

## 6. CI/CD Strategy

### Why PRs run only chromium E2E

Running all 3 browser projects (chromium + mobile-chrome + mobile-safari) on
every PR would add ~15 min to feedback time. The mobile-specific failures are
caught in nightly regression. PRs run chromium only for fast feedback.

### How to keep PR feedback fast

1. **Parallelise independent jobs** — static-analysis and build run in parallel
   with each other; unit tests run as soon as static-analysis passes.
2. **npm cache** — `actions/setup-node` with `cache: npm` restores node_modules
   from cache on most runs, saving 30–60 s per job.
3. **Chromium-only E2E** — reduces browser download and test execution time.
4. **Targeted E2E on PR** — only `homepage`, `listings`, `contact`, `faqs`,
   `i18n` run on every PR. Feature-specific specs run in the file-change
   path (see `paths` filter in PR workflow).
5. **Skip JMeter on PRs** — JMeter runs only nightly and pre-release, not per PR.

### How to avoid E2E overload

- Keep E2E specs focused on user-visible journeys, not implementation details
- Use `test.skip()` with documented reason for flaky-but-known tests
- Quarantine genuinely flaky tests immediately (see §9)
- Keep admin-only tests behind env var guards (`if (!process.env.TEST_ADMIN_EMAIL) test.skip()`)

---

## 7. Coverage Expectations

### Philosophy

Coverage numbers are a proxy for quality, not quality itself. A 90% coverage
number that skips all edge cases is less valuable than 70% coverage that
hammers every boundary condition and failure mode.

### Expectations by module type

| Module category | Minimum meaningful coverage | Rationale |
|-----------------|----------------------------|-----------|
| `src/lib/pricing.ts` | **90%** lines/branches | Revenue-critical; every branch must be intentional |
| `src/lib/availability.ts` | **95%** lines | Double-booking prevention; no untested paths |
| `src/lib/validators.ts` | **85%** lines | All schemas tested; defaults and cross-field covered |
| `src/lib/ical.ts` | **80%** lines | RFC compliance; round-trip must be tested |
| `src/i18n/translations.ts` | **70%** lines | Fallback and unknown-key paths covered |
| `src/lib/stripe.ts` | **60%** — mocked | Integration-level; pure functions only via unit tests |
| `src/lib/email.ts` | **40%** — mocked | HTML rendering tested by snapshot; sends mocked |
| `src/lib/supabase.ts` | **30%** — infrastructure | Client factories; behaviour tested via API tests |
| API route handlers | **70%** branch coverage | All HTTP status paths, not all internal branches |

### Global thresholds (enforced by Vitest)

```typescript
// vitest.config.ts
thresholds: { lines: 80, functions: 80, branches: 75 }
```

### What "meaningful coverage" means

- Every branching condition (if/else, switch, ternary) should have at least
  one test exercising the non-obvious path
- Boundary conditions at ±1 around limits (e.g. `min_nights = 3`, test 2 and 3 nights)
- Both success and failure paths for every external call mock
- Not: testing getter functions, trivial string returns, or re-exported types

---

## 8. JMeter Pipeline Rules

### Which endpoints require JMeter coverage

| Endpoint family | Scenario required | When to run |
|-----------------|-------------------|-------------|
| `GET /api/availability` | load (50 VUs × 10 min) | Nightly (Mon) + pre-release |
| `POST /api/bookings/create` | stress (100 VUs ramp) | Pre-release only |
| `GET /villas`, `GET /villas/[slug]` | baseline smoke (5 VUs) | Every staging deploy |
| `POST /api/coupons/validate` | baseline smoke | Every staging deploy |
| `POST /api/auth/login` | baseline smoke (low concurrency) | Every staging deploy |
| `POST /api/inquiries/create` | baseline smoke | Every staging deploy |
| `GET /api/listings` | load if new filters added | When filter logic changes |
| `POST /api/stripe/webhook` | baseline smoke only | Pre-release (mock Stripe sig) |
| `POST /api/upload/image` | **do not load test** | Use unit tests for size/type logic |

### Threshold policy

If a performance scenario reveals regression beyond these thresholds, the
release is **blocked** until root cause is identified and resolved or
explicitly accepted as a known trade-off with a documented timeline.

| Scenario | Blocking threshold |
|----------|--------------------|
| Baseline smoke: error rate | > 1% |
| Availability load: p95 | > 750ms (was 500ms SLO) |
| Booking stress: 5xx error rate | > 2% |
| Any endpoint: p99 regression vs baseline | > 30% |

### When a new feature changes a load-sensitive endpoint

1. Update the relevant `.jmx` test plan (add new CSV rows, update path)
2. Update `tests/performance/jmeter/data/` with test data for the new scenario
3. Run the plan against staging before opening the PR
4. Include the JTL result or report summary in the PR description
5. If threshold regression is introduced, the PR is blocked

---

## 9. Failure Policy

### Test failures

If any test fails, the feature is **not ready**. Failures are not a signal to
disable tests or add `.skip()`. They are a signal that either:
- the implementation has a bug, or
- the test expectation is wrong and needs deliberate correction

### Flaky test protocol

A test is flaky if it fails intermittently without code changes.

1. **Quarantine immediately**: move to `tests/e2e/flaky/` directory so it
   no longer blocks CI
2. **Open a bug**: create a GitHub Issue tagged `test:flaky` with:
   - spec file and test name
   - observed failure mode
   - reproduction rate estimate
   - owner assigned
3. **Fix within one sprint**: flaky tests must be fixed or deleted within the
   current sprint. A quarantine is not a permanent state.
4. **Track**: add the test name to `.github/flaky-tests.md` until resolved

### Performance regression

If JMeter reveals a p95 or error rate regression beyond thresholds:
1. Release is blocked (the `jmeter-baseline` or `jmeter-booking-stress` job exits non-zero)
2. Developer must investigate and fix before promoting to production
3. If the regression is accepted as a known trade-off, it must be documented
   in TESTING.md under "Known performance regressions" with a resolution timeline

### Missing tests

If a feature is merged without required tests (e.g. emergency hotfix):
1. The feature is treated as **incomplete** in the release notes
2. A follow-up issue must be created within 24 hours: `test debt: [feature name]`
3. The missing tests must be delivered in the next sprint

---

## 10. Pull Request Quality Policy

Every PR must include the completed `.github/PULL_REQUEST_TEMPLATE.md`.
PRs that are missing the template, or have unchecked mandatory boxes, may
be returned to the author without review.

### Fast-track exceptions

The following PR types may have a lighter test requirement:
- Copy/translation changes with no logic impact → unit test for `t()` if new keys added
- Styling/Tailwind class changes → screenshot in PR + accessibility check
- Documentation changes → no code tests required
- Dependency upgrades → CI must pass; no new tests required unless behaviour changes

In all cases, the PR author must explicitly state which exception applies
and confirm CI passes.

---

## 11. Test Data and Fixture Policy

### Factories

All test data must be generated via typed factory functions in
`tests/fixtures/factories.ts`. Hard-coded UUIDs or magic strings in test files
are not acceptable.

```typescript
// Good
const booking = makeBooking({ status: 'confirmed', payment_type: 'deposit' });

// Bad
const booking = { id: 'abc123', status: 'confirmed', payment_type: 'deposit', /* ... */ };
```

### Supabase seeding

Tests that require real Supabase data (E2E with listing/booking IDs) must:
1. Use IDs defined in `.env.test.local` (never hard-coded)
2. Assume the seed data is stable and not modified by other tests
3. Not create or delete records unless the test cleans up after itself

### JMeter test data cleanup

After any JMeter run that creates bookings:

```sql
-- Run immediately after stress test on staging
DELETE FROM bookings
WHERE guest_email LIKE '%@test.invalid'
  AND created_at > NOW() - INTERVAL '1 day';

-- Verify cleanup
SELECT COUNT(*) FROM bookings WHERE guest_email LIKE '%@test.invalid';
```

---

## 12. Environment Strategy

| Environment | Purpose | JMeter target | E2E target | Deploy trigger |
|-------------|---------|---------------|------------|----------------|
| `local` | Development | 5 VUs smoke | chromium manual | `npm run dev` |
| `staging` | Integration testing | 50 VUs load | All 3 browsers | Push to `develop`/`main` |
| `production` | Live platform | Never | Never (post-deploy smoke only) | After release gate passes |

**Production is never a direct JMeter target.** Performance testing is
always done against staging with production-equivalent data and configuration.
