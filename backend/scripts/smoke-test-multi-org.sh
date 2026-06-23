#!/usr/bin/env bash
# Smoke test multi-tenant membership for a cross-org user.
# Usage: API_URL=https://api.axplatform.app/api/v1 EMAIL=... PASSWORD=... ./scripts/smoke-test-multi-org.sh

set -euo pipefail

API_URL="${API_URL:-https://api.axplatform.app/api/v1}"
EMAIL="${EMAIL:-mark@kandeconsulting.com}"
PASSWORD="${PASSWORD:-abc123}"

failures=0
pass() { echo "✅ $1"; }
fail() { echo "❌ $1"; failures=$((failures + 1)); }

echo "=== Multi-org smoke test ==="
echo "API: $API_URL"
echo "User: $EMAIL"

LOGIN=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

if ! echo "$LOGIN" | python3 -c "import sys,json; assert json.load(sys.stdin).get('success')" 2>/dev/null; then
  fail "Login failed"
  echo "$LOGIN"
  exit 1
fi
pass "Login"

TOKEN=$(echo "$LOGIN" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['accessToken'])")
ORG_COUNT=$(echo "$LOGIN" | python3 -c "import sys,json; print(len(json.load(sys.stdin)['data']['user'].get('organizations',[])))")
HOME_ORG=$(echo "$LOGIN" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['user']['organizationId'])")
GUEST_ORG=$(echo "$LOGIN" | python3 -c "import sys,json; u=json.load(sys.stdin)['data']['user']; print(next((o['id'] for o in u.get('organizations',[]) if o.get('membershipType')=='guest'), ''))")

if [ "$ORG_COUNT" -ge 2 ]; then
  pass "User has $ORG_COUNT organizations"
else
  fail "Expected at least 2 organizations, got $ORG_COUNT"
fi

# CORS preflight must allow X-Active-Organization-Id
CORS_HEADERS=$(curl -s -D - -o /dev/null -X OPTIONS \
  -H "Origin: https://kandeconsulting.axplatform.app" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: authorization,x-active-organization-id" \
  "$API_URL/auth/profile" | tr -d '\r')

if echo "$CORS_HEADERS" | grep -qi "x-active-organization-id"; then
  pass "CORS allows X-Active-Organization-Id"
else
  fail "CORS missing X-Active-Organization-Id in Access-Control-Allow-Headers"
  echo "$CORS_HEADERS" | grep -i access-control-allow-headers || true
fi

check_org() {
  local org_id="$1"
  local label="$2"
  local code

  code=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $TOKEN" \
    -H "X-Active-Organization-Id: $org_id" \
    "$API_URL/auth/profile")
  if [ "$code" = "200" ]; then pass "Profile ($label)"; else fail "Profile ($label) returned $code"; fi

  code=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $TOKEN" \
    -H "X-Active-Organization-Id: $org_id" \
    "$API_URL/organizations/current")
  if [ "$code" = "200" ]; then pass "Organization current ($label)"; else fail "Organization current ($label) returned $code"; fi

  code=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $TOKEN" \
    -H "X-Active-Organization-Id: $org_id" \
    "$API_URL/organizations/$org_id/teams/null/quarterly-priorities/current")
  if [ "$code" = "200" ]; then pass "Priorities ($label)"; else fail "Priorities ($label) returned $code"; fi

  code=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $TOKEN" \
    -H "X-Active-Organization-Id: $org_id" \
    "$API_URL/organizations/$org_id/todos")
  if [ "$code" = "200" ]; then pass "Todos ($label)"; else fail "Todos ($label) returned $code"; fi

  code=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $TOKEN" \
    -H "X-Active-Organization-Id: $org_id" \
    "$API_URL/organizations/$org_id/issues")
  if [ "$code" = "200" ]; then pass "Issues ($label)"; else fail "Issues ($label) returned $code"; fi
}

check_org "$HOME_ORG" "home"
if [ -n "$GUEST_ORG" ]; then
  check_org "$GUEST_ORG" "guest"
fi

echo "=== Results: $failures failure(s) ==="
exit $failures