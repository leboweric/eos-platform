#!/bin/bash

# Test Daily Active Users API Endpoints
# Usage: ./test-dau-api.sh <your-jwt-token>

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if token is provided
if [ -z "$1" ]; then
    echo -e "${RED}Error: Please provide your JWT token${NC}"
    echo "Usage: $0 <jwt-token>"
    echo ""
    echo "To get your JWT token:"
    echo "1. Open your browser's developer tools (F12)"
    echo "2. Go to the Application/Storage tab"
    echo "3. Look for 'token' in localStorage"
    echo "4. Copy the token value (without quotes)"
    exit 1
fi

TOKEN=$1
BASE_URL="https://api.axplatform.app/api/v1"

echo -e "${YELLOW}Testing Daily Active Users API Endpoints...${NC}\n"

# Test 1: Get today's report
echo -e "${GREEN}1. Getting today's activity report...${NC}"
curl -X GET \
  "$BASE_URL/daily-active-users/report" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  | python3 -m json.tool

echo -e "\n${GREEN}2. Checking your subscription status...${NC}"
curl -X GET \
  "$BASE_URL/daily-active-users/subscription" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  | python3 -m json.tool

echo -e "\n${GREEN}3. Getting list of all report recipients...${NC}"
curl -X GET \
  "$BASE_URL/daily-active-users/recipients" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  | python3 -m json.tool

echo -e "\n${YELLOW}To subscribe yourself to daily reports:${NC}"
echo "curl -X PUT \\"
echo "  \"$BASE_URL/daily-active-users/subscription\" \\"
echo "  -H \"Authorization: Bearer $TOKEN\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"subscribed\": true}'"

echo -e "\n${YELLOW}To send yourself a test email:${NC}"
echo "curl -X POST \\"
echo "  \"$BASE_URL/daily-active-users/test-email\" \\"
echo "  -H \"Authorization: Bearer $TOKEN\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{}'"

echo -e "\n${YELLOW}To manually trigger the daily report for all recipients:${NC}"
echo "curl -X POST \\"
echo "  \"$BASE_URL/daily-active-users/send\" \\"
echo "  -H \"Authorization: Bearer $TOKEN\" \\"
echo "  -H \"Content-Type: application/json\""