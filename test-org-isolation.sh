#!/bin/bash

# ============================================
# Organization Isolation Security Test Script
# ============================================
# This script tests that the organization access validation is working correctly.
# Users should only be able to access their own organization's data.

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration (update these with actual values)
API_BASE_URL="${API_URL:-http://localhost:3001/api/v1}"

# Test data - You need to update these with real values from your database
# User A (belongs to Organization A)
USER_A_TOKEN="${USER_A_TOKEN:-your_user_a_token_here}"
USER_A_ORG_ID="${USER_A_ORG_ID:-org_a_uuid_here}"
USER_A_EMAIL="${USER_A_EMAIL:-usera@example.com}"

# User B (belongs to Organization B)
USER_B_TOKEN="${USER_B_TOKEN:-your_user_b_token_here}"
USER_B_ORG_ID="${USER_B_ORG_ID:-org_b_uuid_here}"
USER_B_EMAIL="${USER_B_EMAIL:-userb@example.com}"

# Consultant User (has access to both orgs)
CONSULTANT_TOKEN="${CONSULTANT_TOKEN:-your_consultant_token_here}"
CONSULTANT_EMAIL="${CONSULTANT_EMAIL:-consultant@example.com}"

echo "============================================"
echo "Organization Isolation Security Test"
echo "============================================"
echo "API Base URL: $API_BASE_URL"
echo ""

# Function to test API access
test_access() {
    local user_name=$1
    local token=$2
    local org_id=$3
    local endpoint=$4
    local expected_status=$5
    local test_description=$6
    
    # Make the API call
    response=$(curl -s -w "\n%{http_code}" -X GET \
        -H "Authorization: Bearer $token" \
        "$API_BASE_URL/organizations/$org_id/$endpoint")
    
    # Extract status code and body
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    # Check if the status matches expected
    if [ "$http_code" = "$expected_status" ]; then
        echo -e "${GREEN}✓ PASS${NC}: $test_description"
        echo "  User: $user_name | Org: $org_id | Status: $http_code"
    else
        echo -e "${RED}✗ FAIL${NC}: $test_description"
        echo "  User: $user_name | Org: $org_id"
        echo "  Expected: $expected_status | Got: $http_code"
        echo "  Response: $body"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    echo ""
}

# Initialize test counter
TESTS_FAILED=0

# ============================================
# Test 1: User A accessing their own org (should succeed)
# ============================================
echo -e "${YELLOW}Test Set 1: Legitimate Access${NC}"
echo "Testing User A accessing their own organization..."
echo ""

test_access "User A" "$USER_A_TOKEN" "$USER_A_ORG_ID" "issues" "200" \
    "User A can access their own org's issues"

test_access "User A" "$USER_A_TOKEN" "$USER_A_ORG_ID" "todos" "200" \
    "User A can access their own org's todos"

test_access "User A" "$USER_A_TOKEN" "$USER_A_ORG_ID" "headlines" "200" \
    "User A can access their own org's headlines"

# ============================================
# Test 2: User A trying to access User B's org (should fail)
# ============================================
echo -e "${YELLOW}Test Set 2: Cross-Organization Access (Should Be Blocked)${NC}"
echo "Testing User A trying to access Organization B..."
echo ""

test_access "User A" "$USER_A_TOKEN" "$USER_B_ORG_ID" "issues" "403" \
    "User A blocked from accessing Org B's issues"

test_access "User A" "$USER_A_TOKEN" "$USER_B_ORG_ID" "todos" "403" \
    "User A blocked from accessing Org B's todos"

test_access "User A" "$USER_A_TOKEN" "$USER_B_ORG_ID" "headlines" "403" \
    "User A blocked from accessing Org B's headlines"

# ============================================
# Test 3: User B accessing their own org (should succeed)
# ============================================
echo -e "${YELLOW}Test Set 3: User B Legitimate Access${NC}"
echo "Testing User B accessing their own organization..."
echo ""

test_access "User B" "$USER_B_TOKEN" "$USER_B_ORG_ID" "issues" "200" \
    "User B can access their own org's issues"

# ============================================
# Test 4: User B trying to access User A's org (should fail)
# ============================================
echo -e "${YELLOW}Test Set 4: User B Cross-Org Access (Should Be Blocked)${NC}"
echo "Testing User B trying to access Organization A..."
echo ""

test_access "User B" "$USER_B_TOKEN" "$USER_A_ORG_ID" "issues" "403" \
    "User B blocked from accessing Org A's issues"

# ============================================
# Test 5: Consultant access (if configured)
# ============================================
if [ -n "$CONSULTANT_TOKEN" ] && [ "$CONSULTANT_TOKEN" != "your_consultant_token_here" ]; then
    echo -e "${YELLOW}Test Set 5: Consultant Access${NC}"
    echo "Testing consultant accessing client organizations..."
    echo ""
    
    test_access "Consultant" "$CONSULTANT_TOKEN" "$USER_A_ORG_ID" "issues" "200" \
        "Consultant can access Org A (client)"
    
    test_access "Consultant" "$CONSULTANT_TOKEN" "$USER_B_ORG_ID" "issues" "200" \
        "Consultant can access Org B (client)"
fi

# ============================================
# Test 6: No authentication token (should fail with 401)
# ============================================
echo -e "${YELLOW}Test Set 6: Unauthenticated Access${NC}"
echo "Testing access without authentication token..."
echo ""

response=$(curl -s -w "\n%{http_code}" -X GET \
    "$API_BASE_URL/organizations/$USER_A_ORG_ID/issues")
http_code=$(echo "$response" | tail -n1)

if [ "$http_code" = "401" ]; then
    echo -e "${GREEN}✓ PASS${NC}: Unauthenticated requests are blocked with 401"
else
    echo -e "${RED}✗ FAIL${NC}: Unauthenticated request returned $http_code instead of 401"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# ============================================
# Summary
# ============================================
echo ""
echo "============================================"
if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ ALL TESTS PASSED!${NC}"
    echo "Organization isolation is working correctly."
else
    echo -e "${RED}✗ $TESTS_FAILED TEST(S) FAILED!${NC}"
    echo "CRITICAL: Organization isolation is NOT working!"
    echo "DO NOT DEPLOY TO PRODUCTION!"
fi
echo "============================================"

# Exit with error code if tests failed
exit $TESTS_FAILED