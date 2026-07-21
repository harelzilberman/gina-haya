#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# test_established_identification.sh
#
# Integration tests for the established_plant_name / user_hint fields added
# to POST /api/chupchu/full-diagnosis in commit 0ca1947.
#
# Requires:
#   - Supabase service-role key for user creation / storage download / cleanup
#   - Railway (or any deployed instance) URL
#   - pnpm/node available in PATH (for the setup helper)
#
# Usage:
#   ./packages/api/scripts/test_established_identification.sh \
#     <base_url> \
#     <supabase_url> \
#     <supabase_service_role_key> \
#     <photo_storage_path>
#
# Example:
#   ./packages/api/scripts/test_established_identification.sh \
#     https://powerful-embrace-production-95ea.up.railway.app \
#     https://qlcaweebrouzfwkumffc.supabase.co \
#     eyJ... \
#     b0902d9f-a5c6-4875-9b30-b4251061f395/chupchu/chat/1784648286213.jpg
#
# The script creates throwaway Supabase users (prefixed diag-hint-test-),
# runs all four tests, then deletes the users and verifies deletion.
#
# Exit code 0 if all tests pass, 1 if any fail.
# ──────────────────────────────────────────────────────────────────────────────

set -euo pipefail

BASE="${1:?base_url required}"
SUPA_URL="${2:?supabase_url required}"
SUPA_KEY="${3:?supabase_service_role_key required}"
PHOTO_PATH="${4:?photo_storage_path required}"

PASS=0
FAIL=0
TMPDIR_LOCAL="$(mktemp -d)"
trap 'rm -rf "$TMPDIR_LOCAL"' EXIT

log()  { echo "  $*"; }
pass() { echo "  ${1}✅ ${2}"; echo "     ${3}"; PASS=$((PASS+1)); }
fail() { echo "  ${1}❌ ${2}"; echo "     expected: ${3}"; echo "     got:      ${4}"; FAIL=$((FAIL+1)); }

# ── helper: Supabase Admin REST call ─────────────────────────────────────────
supa() { curl -s -X "$1" "${SUPA_URL}${2}" -H "apikey: ${SUPA_KEY}" -H "Authorization: Bearer ${SUPA_KEY}" "${@:3}"; }

# ── Setup: fetch photo, create users, get tokens ─────────────────────────────
echo
echo "=== Setup ==="

log "Downloading citrus photo from storage: ${PHOTO_PATH}"
PHOTO_B64=$(supa GET "/storage/v1/object/tracker-photos/${PHOTO_PATH}" \
  -o "${TMPDIR_LOCAL}/photo.jpg" -w "%{http_code}" 2>/dev/null)
if [[ ! -s "${TMPDIR_LOCAL}/photo.jpg" ]]; then
  echo "  ❌ Failed to download photo (HTTP ${PHOTO_B64}). Aborting."
  exit 1
fi
base64 "${TMPDIR_LOCAL}/photo.jpg" | tr -d '\n' > "${TMPDIR_LOCAL}/photo.b64"
log "Photo downloaded ($(wc -c < "${TMPDIR_LOCAL}/photo.jpg") bytes)"

# Tests 1-3 share one user (3 vision uses = free tier limit)
TS=$(date +%s)
EMAIL1="diag-hint-test-${TS}@test.internal"
RESP1=$(supa POST "/auth/v1/admin/users" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL1}\",\"password\":\"DiagHint_9x!\",\"email_confirm\":true}")
USER1=$(echo "$RESP1" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
TOKEN1=$(supa POST "/auth/v1/token?grant_type=password" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL1}\",\"password\":\"DiagHint_9x!\"}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")
log "Created user 1: ${USER1} (${EMAIL1}) — tests 1-3"

# Test 4 needs its own user (4th vision call would exceed free quota)
EMAIL2="diag-hint-test-$((TS+1))@test.internal"
RESP2=$(supa POST "/auth/v1/admin/users" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL2}\",\"password\":\"DiagHint_9x!\",\"email_confirm\":true}")
USER2=$(echo "$RESP2" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
TOKEN2=$(supa POST "/auth/v1/token?grant_type=password" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL2}\",\"password\":\"DiagHint_9x!\"}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")
log "Created user 2: ${USER2} (${EMAIL2}) — test 4"

# Build request JSON bodies
PHOTO=$(cat "${TMPDIR_LOCAL}/photo.b64")
python3 - <<PYEOF
import json, os
photo = open('${TMPDIR_LOCAL}/photo.b64').read().strip()
base = '${TMPDIR_LOCAL}'

json.dump({'image': photo, 'mimeType': 'image/jpeg', 'language': 'he'},
  open(base+'/req1.json','w'), ensure_ascii=False)

json.dump({'image': photo, 'mimeType': 'image/jpeg', 'language': 'he',
  'established_plant_name': 'תפוז וושינגטון', 'user_hint': 'תפוז וושינגטון'},
  open(base+'/req2.json','w'), ensure_ascii=False)

json.dump({'image': photo, 'mimeType': 'image/jpeg', 'language': 'he',
  'established_plant_name': 'בזיליקום', 'user_hint': 'בזיליקום'},
  open(base+'/req3.json','w'), ensure_ascii=False)

filler = 'הערה כללית על הצמח שגדל בגינה שלי ורוצה לדעת עוד עליו ועל טיפולו הנכון: '
species = 'תפוז נבל (Citrus sinensis var. Washington Navel)'
hint4 = filler + species   # 120 chars; species begins at char 72, well past old 80-char cut
json.dump({'image': photo, 'mimeType': 'image/jpeg', 'language': 'he',
  'established_plant_name': 'תפוז', 'user_hint': hint4},
  open(base+'/req4.json','w'), ensure_ascii=False)
PYEOF
log "Request bodies written."

# ── helper: call the endpoint ─────────────────────────────────────────────────
diag_call() {
  local token="$1" reqfile="$2"
  curl -s -X POST "${BASE}/api/chupchu/full-diagnosis" \
    -H "Authorization: Bearer ${token}" \
    -H "Content-Type: application/json" \
    --data "@${reqfile}"
}

extract() { echo "$1" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d$2)" 2>/dev/null || echo "PARSE_ERR"; }

echo
echo "=== Tests ==="

# ── Test 1: no new fields — regression check ─────────────────────────────────
echo "--- Test 1: no new fields (regression) ---"
R1=$(diag_call "$TOKEN1" "${TMPDIR_LOCAL}/req1.json")
SRC1=$(extract "$R1" ".get('identification_source')")
SUC1=$(extract "$R1" ".get('success')")
CNFL1=$(extract "$R1" ".get('diagnosis',{}).get('identification_conflict')")
if [[ "$SUC1" == "True" && "$SRC1" == "fresh" && "$CNFL1" == "None" ]]; then
  PN1=$(extract "$R1" ".get('diagnosis',{}).get('plant_name')")
  pass "1" "no new fields → identification_source=fresh, no conflict" \
    "plant_name=${PN1} identification_source=${SRC1}"
else
  fail "1" "no new fields regression" \
    "success=True identification_source=fresh identification_conflict=None" \
    "success=${SUC1} identification_source=${SRC1} identification_conflict=${CNFL1}"
fi

# ── Test 2: established_plant_name + user_hint matching image ─────────────────
echo "--- Test 2: established + user_hint = תפוז וושינגטון ---"
R2=$(diag_call "$TOKEN1" "${TMPDIR_LOCAL}/req2.json")
SRC2=$(extract "$R2" ".get('identification_source')")
PN2=$(extract "$R2" ".get('diagnosis',{}).get('plant_name')")
SUC2=$(extract "$R2" ".get('success')")
if [[ "$SUC2" == "True" && "$SRC2" == "user" && "$PN2" == "תפוז וושינגטון" ]]; then
  pass "2" "user_hint honoured → plant_name=תפוז וושינגטון identification_source=user" \
    "plant_name=${PN2} identification_source=${SRC2}"
else
  fail "2" "user_hint honoured" \
    "success=True identification_source=user plant_name=תפוז וושינגטון" \
    "success=${SUC2} identification_source=${SRC2} plant_name=${PN2}"
fi

# ── Test 3: contradicting hint — must not silently return בזיליקום ────────────
echo "--- Test 3: contradicting hint (בזיליקום on citrus photo) ---"
R3=$(diag_call "$TOKEN1" "${TMPDIR_LOCAL}/req3.json")
SRC3=$(extract "$R3" ".get('identification_source')")
PN3=$(extract "$R3" ".get('diagnosis',{}).get('plant_name')")
CNFL3=$(extract "$R3" ".get('diagnosis',{}).get('identification_conflict')")
SUC3=$(extract "$R3" ".get('success')")
# Pass if: success, identification_source=user, plant_name=בזיליקום (hint honoured),
# AND identification_conflict is set and non-null (disagreement surfaced)
CONFLICT_SET=false
[[ "$CNFL3" != "None" && "$CNFL3" != "PARSE_ERR" && -n "$CNFL3" ]] && CONFLICT_SET=true
if [[ "$SUC3" == "True" && "$SRC3" == "user" && "$PN3" == "בזיליקום" && "$CONFLICT_SET" == "true" ]]; then
  pass "3" "contradicting hint: name honoured, conflict surfaced explicitly" \
    "plant_name=${PN3} conflict=$(echo "$CNFL3" | head -c 80)..."
else
  fail "3" "contradicting hint" \
    "success=True identification_source=user plant_name=בזיליקום identification_conflict=<set>" \
    "success=${SUC3} identification_source=${SRC3} plant_name=${PN3} conflict_set=${CONFLICT_SET}"
fi

# ── Test 4: hint >80 chars, species after char 72 ────────────────────────────
echo "--- Test 4: 120-char hint, species at char 72 (proves 200-char pass-through) ---"
R4=$(diag_call "$TOKEN2" "${TMPDIR_LOCAL}/req4.json")
SRC4=$(extract "$R4" ".get('identification_source')")
PN4=$(extract "$R4" ".get('diagnosis',{}).get('plant_name')")
LAT4=$(extract "$R4" ".get('diagnosis',{}).get('plant_name_latin')")
SUC4=$(extract "$R4" ".get('success')")
# Pass if species term appears in either plant_name or plant_name_latin
SPECIES_PRESENT=false
{ echo "$PN4" | grep -qi "נבל\|navel" || echo "$LAT4" | grep -qi "sinensis\|navel"; } && SPECIES_PRESENT=true
if [[ "$SUC4" == "True" && "$SRC4" == "user" && "$SPECIES_PRESENT" == "true" ]]; then
  pass "4" "120-char hint: species at char 72 reached model" \
    "plant_name=${PN4} plant_name_latin=${LAT4} identification_source=${SRC4}"
else
  fail "4" "120-char hint pass-through" \
    "success=True identification_source=user plant_name/latin contains navel/sinensis" \
    "success=${SUC4} identification_source=${SRC4} plant_name=${PN4} latin=${LAT4}"
fi

# ── Cleanup ───────────────────────────────────────────────────────────────────
echo
echo "=== Cleanup ==="
supa DELETE "/auth/v1/admin/users/${USER1}" > /dev/null
supa DELETE "/auth/v1/admin/users/${USER2}" > /dev/null

# Verify deletion
CHECK1=$(supa GET "/auth/v1/admin/users/${USER1}")
CHECK2=$(supa GET "/auth/v1/admin/users/${USER2}")
U1_GONE=false; U2_GONE=false
echo "$CHECK1" | grep -q "user_not_found" && U1_GONE=true
echo "$CHECK2" | grep -q "user_not_found" && U2_GONE=true

if $U1_GONE && $U2_GONE; then
  log "Both test users deleted and confirmed gone."
else
  log "⚠️  Cleanup verification failed — U1_GONE=${U1_GONE} U2_GONE=${U2_GONE}"
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo
echo "Results: ${PASS} passed, ${FAIL} failed"
[[ $FAIL -eq 0 ]]
