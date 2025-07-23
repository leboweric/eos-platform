#!/bin/bash

# Test the scorecard API endpoint directly
# Replace YOUR_ACCESS_TOKEN with an actual token from localStorage

echo "Testing scorecard API for Skykit organization and Leadership Team..."
echo ""

# You'll need to get the access token from browser localStorage
# In browser console: localStorage.getItem('accessToken')

curl -X GET \
  "http://localhost:3001/api/v1/organizations/22c2e9d6-3518-4aa3-b945-c9580d638457/teams/47d53797-be5f-49c2-883a-326a401a17c1/scorecard" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" | jq '.'

echo ""
echo "Replace YOUR_ACCESS_TOKEN with: localStorage.getItem('accessToken') from browser console"