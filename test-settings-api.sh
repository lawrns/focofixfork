#!/bin/bash

# Test Settings API Endpoints
echo "Testing Settings API Endpoints..."
echo "================================"

# Login first to get auth token
echo "1. Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "https://foco.mx/auth/v1/token?grant_type=password" \
  -H "apikey: sb_publishable_6m9EbrvSIdMQ5tBTxfgVMA_WQjeipVO" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "laurence@fyves.com",
    "password": "hennie12"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.access_token')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Login failed"
  exit 1
fi

echo "✅ Login successful"

# Test GET user settings
echo ""
echo "2. Testing GET /api/user/settings..."
SETTINGS_RESPONSE=$(curl -s -X GET "https://foco.mx/api/user/settings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo "Response: $SETTINGS_RESPONSE"

# Test PATCH user settings
echo ""
echo "3. Testing PATCH /api/user/settings..."
UPDATE_RESPONSE=$(curl -s -X PATCH "https://foco.mx/api/user/settings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Laurence Test Updated",
    "timezone": "America/New_York",
    "language": "en"
  }')

echo "Response: $UPDATE_RESPONSE"

# Test GET notification settings
echo ""
echo "4. Testing GET /api/user/settings/notifications..."
NOTIF_RESPONSE=$(curl -s -X GET "https://foco.mx/api/user/settings/notifications" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo "Response: $NOTIF_RESPONSE"

# Test PUT notification settings
echo ""
echo "5. Testing PUT /api/user/settings/notifications..."
NOTIF_UPDATE=$(curl -s -X PUT "https://foco.mx/api/user/settings/notifications" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email_notifications": true,
    "push_notifications": false,
    "weekly_reports": true,
    "marketing_emails": false
  }')

echo "Response: $NOTIF_UPDATE"

echo ""
echo "✅ Settings API tests completed"
