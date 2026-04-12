#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# run.sh — JMeter test runner helper
#
# Usage:
#   ./run.sh smoke          # baseline smoke (5 VUs)
#   ./run.sh availability   # availability load test (50 VUs)
#   ./run.sh stress         # booking create stress test
#   ./run.sh smoke staging  # override environment
#
# Requirements:
#   - Apache JMeter 5.6+ installed and on $PATH, or JMETER_HOME set
#   - Target server running and accessible
# ──────────────────────────────────────────────────────────────────────────────

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLANS_DIR="${SCRIPT_DIR}/plans"
RESULTS_BASE="${SCRIPT_DIR}/results"

# ── Resolve JMeter binary ──────────────────────────────────────────────────────
if [[ -n "${JMETER_HOME:-}" ]]; then
  JMETER="${JMETER_HOME}/bin/jmeter"
elif command -v jmeter &>/dev/null; then
  JMETER="jmeter"
else
  echo "ERROR: JMeter not found. Set JMETER_HOME or add jmeter to PATH." >&2
  exit 1
fi

# ── Arguments ─────────────────────────────────────────────────────────────────
SUITE="${1:-smoke}"
ENV="${2:-local}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
PROPS_FILE="${SCRIPT_DIR}/env/${ENV}.properties"

if [[ ! -f "${PROPS_FILE}" ]]; then
  echo "ERROR: Properties file not found: ${PROPS_FILE}" >&2
  echo "Available environments:" >&2
  ls "${SCRIPT_DIR}/env/" >&2
  exit 1
fi

# ── Select test plan ───────────────────────────────────────────────────────────
case "${SUITE}" in
  smoke)
    PLAN="${PLANS_DIR}/01-baseline-smoke.jmx"
    SUITE_NAME="smoke"
    ;;
  availability)
    PLAN="${PLANS_DIR}/02-availability-load.jmx"
    SUITE_NAME="availability-load"
    ;;
  stress)
    PLAN="${PLANS_DIR}/03-booking-create-stress.jmx"
    SUITE_NAME="booking-stress"
    ;;
  *)
    echo "ERROR: Unknown suite '${SUITE}'. Use: smoke | availability | stress" >&2
    exit 1
    ;;
esac

# ── Output paths ───────────────────────────────────────────────────────────────
RESULTS_DIR="${RESULTS_BASE}/${ENV}/${SUITE_NAME}-${TIMESTAMP}"
JTL_FILE="${RESULTS_DIR}/results.jtl"
REPORT_DIR="${RESULTS_DIR}/html-report"

mkdir -p "${RESULTS_DIR}"

echo ""
echo "══════════════════════════════════════════════════════"
echo "  JMeter Performance Test Runner"
echo "══════════════════════════════════════════════════════"
echo "  Suite:      ${SUITE_NAME}"
echo "  Environment: ${ENV}"
echo "  Plan:       ${PLAN}"
echo "  Results:    ${RESULTS_DIR}"
echo "══════════════════════════════════════════════════════"
echo ""

# ── Run JMeter in non-GUI mode ─────────────────────────────────────────────────
"${JMETER}" \
  -n \
  -t "${PLAN}" \
  -p "${PROPS_FILE}" \
  -l "${JTL_FILE}" \
  -e \
  -o "${REPORT_DIR}" \
  -j "${RESULTS_DIR}/jmeter.log"

EXIT_CODE=$?

echo ""
echo "══════════════════════════════════════════════════════"
if [[ $EXIT_CODE -eq 0 ]]; then
  echo "  ✓ Test completed successfully"
  echo "  HTML report: ${REPORT_DIR}/index.html"
else
  echo "  ✗ Test completed with errors (exit code: ${EXIT_CODE})"
  echo "  Check log: ${RESULTS_DIR}/jmeter.log"
fi
echo "══════════════════════════════════════════════════════"
echo ""

exit $EXIT_CODE
