# Test Impact Analysis — [Feature Name]

> Copy this template into your PR description for every feature that touches
> business logic, API routes, or user-facing UI components.

---

## Feature summary

<!-- One paragraph. What does this feature do? -->

## Risk classification

<!-- Check one: -->
- [ ] Critical (pricing / booking / payment / auth / migrations)
- [ ] High (coupons / webhooks / uploads / admin access)
- [ ] Medium (UI changes / i18n / admin CRUD)
- [ ] Low (copy / styling / config)

---

## Modules changed

| File | Type of change |
|------|---------------|
| `src/lib/___` | e.g. "new function added" |
| `src/pages/api/___` | e.g. "validation logic updated" |
| `src/components/___` | e.g. "new data-testid required" |

---

## User journeys changed

| Journey | Changed? | Description of change |
|---------|---------|----------------------|
| Homepage → listings | Yes / No | |
| Listing detail → booking widget | Yes / No | |
| Booking form → submit | Yes / No | |
| Coupon application | Yes / No | |
| Admin bookings list | Yes / No | |
| Admin listing edit | Yes / No | |
| Language switching | Yes / No | |
| Other: _________________ | Yes / No | |

---

## API routes changed

| Route | Method | Change type |
|-------|--------|------------|
| `/api/___` | GET/POST | e.g. "new validation rule" |

---

## Integrations changed

| Integration | Changed? | How? |
|-------------|---------|------|
| Supabase (schema / query) | Yes / No | |
| Stripe (API / webhook) | Yes / No | |
| Email (Resend) | Yes / No | |
| Telegram bot | Yes / No | |
| iCal feed | Yes / No | |

---

## New risks introduced

<!-- What could go wrong? Consider:
  - edge cases at boundary values
  - race conditions (e.g. concurrent bookings)
  - data loss scenarios
  - security surface changes
  - backwards compatibility issues
-->

---

## Test plan

### Tests to update (existing)

| File | What to update |
|------|---------------|
| `tests/unit/___` | e.g. "add test for new edge case" |
| `tests/api/___` | e.g. "add 402 scenario" |
| `tests/e2e/___` | e.g. "update selector after data-testid rename" |

### Tests to add (new)

| File | Test case | Level | Priority |
|------|-----------|-------|---------|
| `tests/unit/___` | "should return 0 for negative coupon discount" | Unit | P1 |
| `tests/api/___` | "returns 409 when listing is at max capacity" | API | P1 |
| `tests/e2e/___` | "deposit plan card shows correct amount" | E2E | P2 |

---

## JMeter impact

| Question | Answer |
|----------|--------|
| Does this feature change a load-sensitive endpoint? | Yes / No |
| If yes, which endpoint? | `/api/___` |
| JMeter plan update required? | Yes / No |
| If yes, which plan? | `01-baseline-smoke` / `02-availability-load` / `03-booking-create-stress` |
| Scenario type | baseline / load / stress / spike / soak |
| When to run? | PR / nightly / pre-release |
| New CSV data needed? | Yes / No |

---

## Test pyramid distribution

<!-- Explain where the coverage sits on the pyramid for this feature. -->

- **Unit**: [X tests covering ___]
- **API/integration**: [X tests covering ___]
- **E2E**: [X tests covering ___]
- **JMeter**: [scenario: ___] or Not required because ___

---

## Fixtures and test data changes

| Item | Required? | File |
|------|----------|------|
| Factory function updated | Yes / No | `tests/fixtures/factories.ts` |
| New fixture added | Yes / No | `tests/fixtures/___` |
| `.env.test` variable added | Yes / No | Document name here |
| JMeter CSV updated | Yes / No | `tests/performance/jmeter/data/___` |
| Supabase seed data needed | Yes / No | Migration / manual seed |

---

## Definition of Done checklist

- [ ] Unit tests added/updated
- [ ] API tests added/updated
- [ ] E2E tests added/updated (or justified as not required)
- [ ] JMeter plan updated (or justified as not required)
- [ ] Accessibility smoke passes
- [ ] All CI stages green
- [ ] Coverage thresholds maintained
- [ ] No tests silenced or skipped without documented reason
- [ ] Fixtures/factories updated if schema changed
