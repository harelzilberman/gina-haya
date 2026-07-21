#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# test_recognition_guards.sh
#
# Executable integration tests for PATCH /api/recognitions/:id guard logic.
# Run against Railway (or any deployed instance) with a valid bearer token
# and a pair of recognition/plant UUIDs.
#
# Usage:
#   ./test_recognition_guards.sh \
#     <base_url> \
#     <bearer_token> \
#     <recognition_id_pending> \
#     <recognition_id_wrong> \
#     <recognition_id_retried> \
#     <plant_id_A> \
#     <plant_id_B>
#
# All seven arguments are required. UUIDs must already exist in the DB and
# be owned by the user whose token is supplied.
#
# Exit code 0 if all tests pass, 1 if any fail.
# ──────────────────────────────────────────────────────────────────────────────

set -euo pipefail

BASE="${1:?base_url required}"
TOKEN="${2:?bearer_token required}"
REC_PENDING="${3:?recognition_id_pending required}"
REC_WRONG="${4:?recognition_id_wrong required}"
REC_RETRIED="${5:?recognition_id_retried required}"
PLANT_A="${6:?plant_id_A required}"
PLANT_B="${7:?plant_id_B required}"

PASS=0
FAIL=0

# ── helper ────────────────────────────────────────────────────────────────────
patch() {
  local id="$1" body="$2"
  curl -s -w '\n%{http_code}' \
    -X PATCH "${BASE}/api/recognitions/${id}" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -d "$body"
}

assert() {
  local test_num="$1" label="$2" got_code="$3" want_code="$4" got_body="$5" want_error="${6:-}"
  local ok=true

  if [[ "$got_code" != "$want_code" ]]; then
    ok=false
  fi
  if [[ -n "$want_error" ]] && ! echo "$got_body" | grep -q "\"$want_error\""; then
    ok=false
  fi

  if $ok; then
    echo "  ${test_num}✅ ${label}"
    echo "     HTTP ${got_code} — ${got_body}"
    PASS=$((PASS + 1))
  else
    echo "  ${test_num}❌ ${label}"
    echo "     expected HTTP ${want_code}${want_error:+ with error \"$want_error\"}"
    echo "     got     HTTP ${got_code} — ${got_body}"
    FAIL=$((FAIL + 1))
  fi
}

# ── run ───────────────────────────────────────────────────────────────────────
echo
echo "Recognition guard tests — ${BASE}"
echo "  pending rec : ${REC_PENDING}"
echo "  wrong rec   : ${REC_WRONG}"
echo "  retried rec : ${REC_RETRIED}"
echo "  plant A     : ${PLANT_A}"
echo "  plant B     : ${PLANT_B}"
echo

# Test 1 — link pending recognition to plant A
echo "--- Test 1: link pending → plant A ---"
raw=$(patch "$REC_PENDING" "{\"status\":\"linked\",\"garden_plants_id\":\"${PLANT_A}\"}")
body=$(echo "$raw" | head -n -1)
code=$(echo "$raw" | tail -n 1)
assert "1" "link pending rec to plant A" "$code" "200" "$body"

# Test 2 — re-link same recognition to plant A (idempotent)
echo "--- Test 2: re-link to same plant A (idempotent) ---"
raw=$(patch "$REC_PENDING" "{\"status\":\"linked\",\"garden_plants_id\":\"${PLANT_A}\"}")
body=$(echo "$raw" | head -n -1)
code=$(echo "$raw" | tail -n 1)
assert "2" "re-link to plant A idempotent" "$code" "200" "$body"

# Test 3 — link that recognition to plant B (should fail: already linked to A)
echo "--- Test 3: link to plant B — already linked to A ---"
raw=$(patch "$REC_PENDING" "{\"status\":\"linked\",\"garden_plants_id\":\"${PLANT_B}\"}")
body=$(echo "$raw" | head -n -1)
code=$(echo "$raw" | tail -n 1)
assert "3" "link to plant B rejected" "$code" "400" "$body" "already_linked_to_other_plant"

# Test 4 — bypass attempt: confirm it, then link to plant B
echo "--- Test 4: bypass — confirm first, then link to plant B ---"
raw_confirm=$(patch "$REC_PENDING" '{"status":"confirmed"}')
confirm_body=$(echo "$raw_confirm" | head -n -1)
confirm_code=$(echo "$raw_confirm" | tail -n 1)
echo "  step 4a confirm: HTTP ${confirm_code} — ${confirm_body}"

raw=$(patch "$REC_PENDING" "{\"status\":\"linked\",\"garden_plants_id\":\"${PLANT_B}\"}")
body=$(echo "$raw" | head -n -1)
code=$(echo "$raw" | tail -n 1)
assert "4" "bypass (linked→confirmed→linked B) blocked" "$code" "400" "$body" "already_linked_to_other_plant"

# Test 5 — link a wrong recognition
echo "--- Test 5: link wrong recognition ---"
raw=$(patch "$REC_WRONG" "{\"status\":\"linked\",\"garden_plants_id\":\"${PLANT_A}\"}")
body=$(echo "$raw" | head -n -1)
code=$(echo "$raw" | tail -n 1)
assert "5" "link wrong rec rejected" "$code" "400" "$body" "cannot_link_invalidated_recognition"

# Test 6 — link a retried recognition
echo "--- Test 6: link retried recognition ---"
raw=$(patch "$REC_RETRIED" "{\"status\":\"linked\",\"garden_plants_id\":\"${PLANT_A}\"}")
body=$(echo "$raw" | head -n -1)
code=$(echo "$raw" | tail -n 1)
assert "6" "link retried rec rejected" "$code" "400" "$body" "cannot_link_invalidated_recognition"

# Test 7 — confirm a wrong recognition
echo "--- Test 7: confirm wrong recognition ---"
raw=$(patch "$REC_WRONG" '{"status":"confirmed"}')
body=$(echo "$raw" | head -n -1)
code=$(echo "$raw" | tail -n 1)
assert "7" "confirm wrong rec rejected" "$code" "409" "$body" "invalid_transition"

echo
echo "Results: ${PASS} passed, ${FAIL} failed"
echo "(Test 8 — userHint in Railway logs — must be verified manually after deploy)"
echo
[[ $FAIL -eq 0 ]]
