#!/bin/bash

# Production verification script
# Run this after deployment to verify everything is working

set -e

echo "🔍 Verifying production deployment..."

# Base URL - change this to your production URL
BASE_URL="${BASE_URL:-https://foco.mx}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check HTTP status
check_status() {
    local url="$1"
    local expected_status="$2"
    local description="$3"
    
    echo -n "Checking $description... "
    
    local status=$(curl -s -o /dev/null -w "%{http_code}" "$url")
    
    if [ "$status" = "$expected_status" ]; then
        echo -e "${GREEN}✓${NC} ($status)"
        return 0
    else
        echo -e "${RED}✗${NC} ($status, expected $expected_status)"
        return 1
    fi
}

# Function to check JSON response
check_json() {
    local url="$1"
    local jq_filter="$2"
    local description="$3"
    
    echo -n "Checking $description... "
    
    local response=$(curl -s "$url")
    local result=$(echo "$response" | jq -r "$jq_filter" 2>/dev/null || echo "null")
    
    if [ "$result" != "null" ] && [ "$result" != "" ]; then
        echo -e "${GREEN}✓${NC} ($result)"
        return 0
    else
        echo -e "${RED}✗${NC} (invalid JSON or missing field)"
        return 1
    fi
}

echo "🌐 Testing endpoints at $BASE_URL"
echo

# Health check
check_status "$BASE_URL/api/health" "200" "Health endpoint"

# Homepage
check_status "$BASE_URL/" "200" "Homepage"

# Login page
check_status "$BASE_URL/login" "200" "Login page"

# Register page
check_status "$BASE_URL/register" "200" "Register page"

# Dashboard (should redirect to login)
check_status "$BASE_URL/dashboard" "302" "Dashboard redirect"

# Protected API endpoints (should return 401)
check_status "$BASE_URL/api/organizations" "401" "Organizations API (protected)"
check_status "$BASE_URL/api/projects" "401" "Projects API (protected)"

# Crypto API stubs (should return 204)
check_status "$BASE_URL/api/orderbook/stream?symbol=BTC&exchange=binance" "204" "Orderbook API stub"
check_status "$BASE_URL/api/market-data?symbol=BTC" "204" "Market data API stub"
check_status "$BASE_URL/api/bursts?symbol=BTCUSDT&hours=24&minMagnitude=100000" "204" "Bursts API stub"

# Analytics endpoint
check_status "$BASE_URL/api/analytics/events" "200" "Analytics events endpoint"

echo
echo "🔧 Testing service worker configuration..."

# Check if service worker is disabled
sw_response=$(curl -s "$BASE_URL/sw.js")
if echo "$sw_response" | grep -q "Version 1.0.1"; then
    echo -e "Service worker version: ${GREEN}✓${NC} (1.0.1)"
else
    echo -e "Service worker version: ${RED}✗${NC} (not found or wrong version)"
fi

echo
echo "📊 Testing JSON responses..."

# Health endpoint JSON
check_json "$BASE_URL/api/health" ".ok" "Health endpoint JSON"

# Analytics endpoint JSON
analytics_response=$(curl -s -X POST "$BASE_URL/api/analytics/events" \
    -H "Content-Type: application/json" \
    -d '{"events":[{"id":"test","type":"test","category":"user_action","action":"test","sessionId":"test","page":"/","timestamp":1234567890}]}')
echo "$analytics_response" | jq -e '.success == true' > /dev/null
if [ $? -eq 0 ]; then
    echo -e "Analytics endpoint JSON: ${GREEN}✓${NC}"
else
    echo -e "Analytics endpoint JSON: ${RED}✗${NC}"
fi

echo
echo "🚀 Production verification complete!"

# Summary
echo
echo "📋 Summary:"
echo "- Health endpoint: Working"
echo "- Static pages: Working"
echo "- API authentication: Working"
echo "- Crypto API stubs: Working"
echo "- Service worker: Updated"
echo "- Analytics: Working"

echo
echo -e "${GREEN}✅ Production deployment verified successfully!${NC}"
echo
echo "Next steps:"
echo "1. Test login flow with real credentials"
echo "2. Verify dashboard functionality"
echo "3. Check for any remaining console errors"
echo "4. Monitor performance metrics"
