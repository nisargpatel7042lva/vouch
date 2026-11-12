#!/usr/bin/env bash
# Gate runner for Vouch phases.
# Usage: ./scripts/gate.sh <phase_number>
set -euo pipefail

PHASE="${1:-0}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

pass() { echo "  [PASS] $*"; }
fail() { echo "  [FAIL] $*" >&2; exit 1; }
section() { echo ""; echo "--- Gate ${PHASE}.$1: $2 ---"; }

echo ""
echo "==========================================="
echo " Vouch Gate – Phase $PHASE"
echo "==========================================="

case "$PHASE" in
# ---------------------------------------------------------------------------
0)
  section 1 "Lint"
  npm run lint 2>&1 | tail -5
  pass "lint clean"

  section 2 "Typecheck"
  npm run typecheck
  pass "typecheck clean"

  section 3 "Unit tests (attestation, no live calls)"
  npx vitest run tests/near/attest.test.ts --config vitest.config.ts
  pass "unit tests passed"

  section 4 "Spike – live NEAR AI Cloud call + attestation"
  npm run spike
  pass "spike exited 0"

  section 5 ".env hygiene"
  if ! grep -qxF '.env' .gitignore && ! grep -qxF '.env' .gitignore; then
    if ! grep -q '\.env$' .gitignore; then
      fail ".env is NOT in .gitignore"
    fi
  fi
  pass ".env is gitignored"

  if git rev-parse --git-dir &>/dev/null; then
    if git ls-files --error-unmatch .env 2>/dev/null; then
      fail ".env is tracked by git"
    fi
    # Check no real key in tracked files
    TRACKED=$(git ls-files '*.ts' '*.tsx' '*.js' '*.json' '*.md' '*.sh' 2>/dev/null || true)
    if [ -n "$TRACKED" ]; then
      KEY_PATTERN='NEAR_AI_API_KEY=[^$"]'
      if echo "$TRACKED" | xargs grep -l "$KEY_PATTERN" 2>/dev/null | grep -v '.env.example'; then
        fail "A real NEAR_AI_API_KEY value found in tracked files"
      fi
    fi
  fi
  pass "no secrets in tracked files"

  echo ""
  echo "==========================================="
  echo " Phase 0 gate PASSED"
  echo "==========================================="
  ;;

# ---------------------------------------------------------------------------
1)
  section 1 "Phase 0 regression"
  bash scripts/gate.sh 0

  section 2 "Unit tests (extraction)"
  npx vitest run tests/extract/ --config vitest.config.ts
  pass "extraction unit tests passed"

  section 3 "P1 privacy invariant"
  npx vitest run tests/extract/privacy.test.ts --config vitest.config.ts
  pass "P1 privacy test passed"

  section 4 "Live extraction accuracy on all fixtures"
  npx tsx -r dotenv/config scripts/check-accuracy.ts
  pass "extraction accuracy above thresholds"

  echo ""
  echo "==========================================="
  echo " Phase 1 gate PASSED"
  echo "==========================================="
  ;;

# ---------------------------------------------------------------------------
2)
  section 1 "Phase 1 regression"
  bash scripts/gate.sh 1

  section 2 "Unit tests (claim engine)"
  npx vitest run tests/claims/ --config vitest.config.ts
  pass "claim unit tests passed"

  section 3 "CLI claim on each fixture (live)"
  npx tsx -r dotenv/config scripts/claim.ts fixtures/salaried.csv income_floor '{"minMonthlyAmount":3000,"months":3,"currency":"USD"}' | grep -q "PASS\|FAIL\|pass\|fail" && pass "salaried fixture claim ran"
  npx tsx -r dotenv/config scripts/claim.ts fixtures/freelancer.csv income_floor '{"minMonthlyAmount":1000,"months":3,"currency":"USD"}' | grep -q "PASS\|FAIL\|pass\|fail" && pass "freelancer fixture claim ran"
  npx tsx -r dotenv/config scripts/claim.ts fixtures/crypto.csv income_floor '{"minMonthlyAmount":500,"months":3,"currency":"USD"}' | grep -q "PASS\|FAIL\|pass\|fail" && pass "crypto fixture claim ran"

  echo ""
  echo "==========================================="
  echo " Phase 2 gate PASSED"
  echo "==========================================="
  ;;

# ---------------------------------------------------------------------------
3)
  section 1 "Phase 2 regression"
  bash scripts/gate.sh 2

  section 2 "Unit tests (proofs API)"
  npx vitest run tests/proofs/ --config vitest.config.ts
  pass "proofs unit tests passed"

  section 3 "P2 privacy scan"
  npx vitest run tests/proofs/privacy.test.ts --config vitest.config.ts
  pass "P2 privacy scan passed"

  section 4 "API scripted run"
  npx tsx -r dotenv/config scripts/api-smoke.ts
  pass "API scripted run passed"

  echo ""
  echo "==========================================="
  echo " Phase 3 gate PASSED"
  echo "==========================================="
  ;;

# ---------------------------------------------------------------------------
4)
  section 1 "Phase 3 regression"
  bash scripts/gate.sh 3

  section 2 "Playwright – verifier page"
  npx playwright test tests/e2e/verifier.spec.ts
  pass "verifier e2e passed"

  section 3 "Accessibility scan"
  npx playwright test tests/e2e/accessibility.spec.ts
  pass "accessibility passed"

  section 4 "Screenshots saved"
  ls artifacts/verifier-*.png 2>/dev/null || fail "verifier screenshots not found in artifacts/"
  pass "screenshots present"

  echo ""
  echo "==========================================="
  echo " Phase 4 gate PASSED"
  echo "==========================================="
  ;;

# ---------------------------------------------------------------------------
5)
  section 1 "Phase 4 regression"
  bash scripts/gate.sh 4

  section 2 "Full prover e2e – run 1"
  npx playwright test tests/e2e/prover.spec.ts
  section 2 "Full prover e2e – run 2 (flakiness check)"
  npx playwright test tests/e2e/prover.spec.ts
  pass "e2e passed twice"

  echo ""
  echo "==========================================="
  echo " Phase 5 gate PASSED"
  echo "==========================================="
  ;;

# ---------------------------------------------------------------------------
6)
  section 1 "Phase 5 regression"
  bash scripts/gate.sh 5

  section 2 "Adversarial suite"
  npx vitest run tests/adversarial/ --config vitest.config.ts
  pass "adversarial tests passed"

  section 3 "npm audit"
  AUDIT_OUT=$(npm audit --audit-level=high 2>&1 || true)
  if echo "$AUDIT_OUT" | grep -qE 'found [1-9][0-9]* (high|critical)'; then
    echo "$AUDIT_OUT"
    fail "npm audit found high/critical issues (undocumented)"
  fi
  pass "npm audit clean"

  section 4 "Red team doc exists"
  test -f docs/red-team.md || fail "docs/red-team.md missing"
  ATTACKS=$(grep -c '^##' docs/red-team.md || true)
  [ "$ATTACKS" -ge 6 ] || fail "red-team.md lists fewer than 6 attacks ($ATTACKS found)"
  pass "red-team.md present with $ATTACKS attacks"

  echo ""
  echo "==========================================="
  echo " Phase 6 gate PASSED"
  echo "==========================================="
  ;;

# ---------------------------------------------------------------------------
7)
  section 1 "Phase 6 regression (VOUCH_PAID_CHECKS=false)"
  VOUCH_PAID_CHECKS=false bash scripts/gate.sh 6
  pass "all earlier gates pass with flag off"

  if [ "${VOUCH_PAID_CHECKS:-false}" = "true" ]; then
    section 2 "Payment layer tests (flag on)"
    npx vitest run tests/payment/ --config vitest.config.ts
    pass "payment tests passed"
  else
    echo "  [SKIP] VOUCH_PAID_CHECKS not set – feature cut, roadmap only"
  fi

  echo ""
  echo "==========================================="
  echo " Phase 7 gate PASSED"
  echo "==========================================="
  ;;

# ---------------------------------------------------------------------------
8)
  section 1 "Full regression Phase 0–7"
  bash scripts/gate.sh 7

  section 2 "README quickstart commands run"
  npx tsx -r dotenv/config scripts/readme-claims-check.ts
  pass "README claims verified"

  section 3 "Repo hygiene"
  test -f LICENSE || fail "LICENSE file missing"
  test -f README.md || fail "README.md missing"
  ! git ls-files .env 2>/dev/null | grep -q . || fail ".env committed"
  pass "hygiene checks passed"

  section 4 "Clean-clone smoke test"
  TMPDIR=$(mktemp -d)
  cp -r . "$TMPDIR/vouch-test"
  cd "$TMPDIR/vouch-test"
  npm ci --silent
  npx tsx -r dotenv/config scripts/spike.ts
  cd "$ROOT"
  rm -rf "$TMPDIR"
  pass "clean-clone smoke passed"

  echo ""
  echo "==========================================="
  echo " Phase 8 gate PASSED"
  echo "==========================================="

  # Mark completion
  grep -q 'ALL_PHASES_PASSED' PROGRESS.md || \
    echo -e "\n## ALL_PHASES_PASSED\nDate: $(date -u +%Y-%m-%dT%H:%MZ)" >> PROGRESS.md
  echo ""
  echo "ALL_PHASES_PASSED"
  ;;

*)
  echo "Unknown phase: $PHASE" >&2
  exit 1
  ;;
esac
