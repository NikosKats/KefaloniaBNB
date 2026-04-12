# Performance Testing — JMeter

## Prerequisites

```bash
# macOS (via Homebrew)
brew install jmeter

# Linux
wget https://downloads.apache.org/jmeter/binaries/apache-jmeter-5.6.3.tgz
tar xzf apache-jmeter-5.6.3.tgz
export JMETER_HOME=/path/to/apache-jmeter-5.6.3
export PATH=$PATH:$JMETER_HOME/bin
```

Verify: `jmeter --version`

## Test Plans

| File | Purpose | VUs | Duration |
|------|---------|-----|----------|
| `01-baseline-smoke.jmx` | Validate SLOs before heavier tests | 5 | 3 min |
| `02-availability-load.jmx` | Sustained load on `/api/availability` | 50 | 10 min |
| `03-booking-create-stress.jmx` | Stress + spike on `POST /api/bookings/create` | 100→200 | 20 min |

## Running Tests

```bash
cd tests/performance/jmeter

# Smoke test (local dev server)
./run.sh smoke local

# Availability load test (staging)
./run.sh availability staging

# Booking stress test (staging only — never production)
./run.sh stress staging

# Override thread count inline
jmeter -n -t plans/02-availability-load.jmx \
       -p env/staging.properties \
       -Jthreads=25 \
       -l results/quick.jtl -e -o results/quick-report
```

## SLO Targets

| Endpoint | p50 | p95 | p99 | Error rate |
|----------|-----|-----|-----|------------|
| `GET /` | 500ms | 1500ms | 3000ms | < 0.1% |
| `GET /villas` | 500ms | 1500ms | 3000ms | < 0.1% |
| `GET /villas/[slug]` | 400ms | 1200ms | 2000ms | < 0.1% |
| `GET /api/availability` | 100ms | 500ms | 1000ms | < 0.5% |
| `POST /api/bookings/create` | 400ms | 2000ms | 4000ms | < 2% |
| `GET /api/listings` | 200ms | 800ms | 1500ms | < 0.5% |

## Safe Data Strategy

- Test bookings use `payment_method: bank_transfer` — no real Stripe charges
- Guest emails use `@test.invalid` domain — not deliverable
- All test listing IDs are seeded with prefix `00000000-0000-0000-0000`
- After stress runs, clean up with:

```sql
DELETE FROM bookings
WHERE guest_email LIKE '%@test.invalid'
  AND created_at > NOW() - INTERVAL '1 day';
```

## Endpoints NOT to Load Test in Lower Environments

- `POST /api/stripe/webhook` — only test with mocked Stripe signatures
- `POST /api/auth/login` with real credentials — risk of rate limiting
- `POST /api/upload/image` — avoid filling storage quota
- Any cron endpoints — idempotency not guaranteed under parallel load

## CI Integration

Add to `.github/workflows/perf-smoke.yml`:

```yaml
- name: Run JMeter smoke test
  run: |
    cd tests/performance/jmeter
    jmeter -n \
      -t plans/01-baseline-smoke.jmx \
      -p env/local.properties \
      -Jprotocol=http -Jhost=localhost -Jport=4321 \
      -l results/ci-smoke.jtl \
      -e -o results/ci-report
  # Fail CI if JMeter exits non-zero (assertion failures)
```
