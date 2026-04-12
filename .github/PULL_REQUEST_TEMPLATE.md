## Feature Summary

<!-- What does this PR do? One paragraph. -->

## Risk Level

<!-- Select one: -->
- [ ] **Critical** — pricing / availability / booking / payment / auth / admin access / migrations
- [ ] **High** — coupons / webhooks / uploads / owner/payout logic
- [ ] **Medium** — UI changes / i18n / admin CRUD / content management
- [ ] **Low** — copy / styling / documentation / configuration

---

## Test Impact Analysis

### Modules changed
<!-- List: e.g. src/lib/pricing.ts, src/pages/api/bookings/create.ts -->

### User journeys changed
<!-- e.g. "Booking flow — deposit plan selection" -->

### API routes changed
<!-- e.g. POST /api/bookings/create, GET /api/availability -->

### Integrations changed
<!-- Supabase / Stripe / Telegram / email / iCal — check all that apply -->
- [ ] Supabase schema or query
- [ ] Stripe API or webhook
- [ ] Email (Resend)
- [ ] Telegram bot
- [ ] iCal feed
- [ ] None

### New risks introduced
<!-- What could break? What edge cases did you consider? -->

---

## Tests Added / Updated

### Unit tests
<!-- List spec files added or changed, or explain why none were needed -->

### API / integration tests
<!-- List spec files added or changed -->

### E2E tests
<!-- List spec files added or changed, or explain why this flow doesn't need E2E -->

### JMeter performance tests
<!-- Required if this PR touches: /api/bookings/*, /api/availability/*, /api/coupons/*, /api/stripe/* -->
- [ ] Not applicable — no load-sensitive path changed
- [ ] JMeter plan updated: `tests/performance/jmeter/plans/___`
- [ ] New CSV data added: `tests/performance/jmeter/data/___`
- [ ] Performance scenario: `baseline | load | stress | spike | soak`

---

## Definition of Done Checklist

> A feature is not ready to merge unless all checked boxes pass CI.

- [ ] Unit tests added or updated for affected business logic
- [ ] API/integration tests added or updated for affected endpoints
- [ ] E2E tests added or updated for affected user-visible flows
- [ ] Performance impact assessed; JMeter updated if load-sensitive path changed
- [ ] Accessibility impact considered for UI changes (`npm run test:e2e -- --grep accessibility`)
- [ ] All CI stages pass (lint, type-check, unit, API, E2E smoke, build)
- [ ] No new TypeScript errors introduced
- [ ] No existing tests broken or skipped without justification
- [ ] Test data / fixtures updated if required
- [ ] Coverage thresholds still met for critical modules

---

## Schema / Migration Notes

<!-- If Supabase migrations added: list the migration file and the columns/tables affected -->
<!-- If no migrations: "None" -->

---

## Environment / Config Changes

<!-- New env vars, Cloudflare secrets, Wrangler config changes -->
<!-- If none: "None" -->

---

## Screenshots / Recordings

<!-- Required for any UI changes. Drag and drop or paste screenshots here. -->
<!-- For flows: a short screen recording (Loom, etc.) is strongly preferred for P1 flows. -->

---

## Rollback Considerations

<!-- How do we roll back this change if it causes an incident? -->
<!-- Is it DB-safe to roll back (i.e., are columns nullable/additive)? -->

---

## Accessibility Considerations

<!-- Did you check colour contrast, keyboard navigation, screen reader compatibility? -->
<!-- If UI changed: "Checked" / "Not checked — reason" -->

---

## Performance Considerations

<!-- Will this feature increase DB query count, payload size, or render time? -->
<!-- If yes: what was the before/after, or why is it acceptable? -->
