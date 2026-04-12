# Flaky Test Register

Track quarantined flaky tests here. Every entry must have an owner and a
resolution target date. Tests in this list are moved to `tests/e2e/flaky/`
until fixed. A test in quarantine for more than one sprint (2 weeks) requires
escalation.

| Spec file | Test name | Failure mode | Owner | Quarantined | Target fix |
|-----------|-----------|-------------|-------|-------------|-----------|
| _(none yet)_ | | | | | |

---

## Protocol

1. Mark as flaky: move the test to `tests/e2e/flaky/` so it no longer blocks CI
2. Add a row to this table
3. Open a GitHub Issue tagged `test:flaky`
4. Fix within one sprint; if not feasible, escalate and document the new target date
5. When fixed: move the test back, remove from this table, close the Issue
