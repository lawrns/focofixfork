#!/bin/bash

# Comprehensive UI Functionality Test Script
# Tests all major API endpoints and UI features

echo "🧪 Starting Comprehensive UI Functionality Test"
echo "================================================"
echo ""

BASE_URL="http://localhost:3001"
TEST_USER_ID="2b9cdec8-317f-4212-b2eb-811b12a694f7"  # test@example.com

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
PASSED=0
FAILED=0

# Helper function to test endpoint
test_endpoint() {
    local name="$1"
    local url="$2"
    local method="${3:-GET}"
    local data="$4"
    local expected_status="${5:-200}"

    echo -n "Testing: $name ... "

    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$url" \
            -H "x-user-id: $TEST_USER_ID" \
            -H "Content-Type: application/json")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$url" \
            -H "x-user-id: $TEST_USER_ID" \
            -H "Content-Type: application/json" \
            -d "$data")
    fi

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    if [ "$http_code" -eq "$expected_status" ] || [ "$http_code" -eq 200 ] || [ "$http_code" -eq 201 ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $http_code)"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC} (HTTP $http_code)"
        echo "  Response: $(echo $body | jq -r '.error // .message // .' 2>/dev/null || echo $body | head -c 200)"
        ((FAILED++))
        return 1
    fi
}

echo "1️⃣  HEALTH & SYSTEM CHECKS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "API Health Check" "$BASE_URL/api/health"
test_endpoint "AI Health Check" "$BASE_URL/api/ai/health"
echo ""

echo "2️⃣  AUTHENTICATION ENDPOINTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "Session Check" "$BASE_URL/api/auth/session"
echo ""

echo "3️⃣  PROJECT MANAGEMENT"
echo "━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "List Projects" "$BASE_URL/api/projects"
test_endpoint "Create Project" "$BASE_URL/api/projects" "POST" \
    '{"name":"Test Project UI Check","description":"Testing UI","status":"planning","priority":"medium"}'
echo ""

echo "4️⃣  ORGANIZATION MANAGEMENT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "List Organizations" "$BASE_URL/api/organizations"
echo ""

echo "5️⃣  MILESTONE MANAGEMENT"
echo "━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "List Milestones" "$BASE_URL/api/milestones"
echo ""

echo "6️⃣  TASK MANAGEMENT"
echo "━━━━━━━━━━━━━━━━━━━"
test_endpoint "List Tasks" "$BASE_URL/api/tasks"
echo ""

echo "7️⃣  GOALS MANAGEMENT"
echo "━━━━━━━━━━━━━━━━━━━"
test_endpoint "List Goals" "$BASE_URL/api/goals"
echo ""

echo "8️⃣  ANALYTICS ENDPOINTS"
echo "━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "Analytics Dashboard" "$BASE_URL/api/analytics/dashboard"
test_endpoint "Analytics Projects" "$BASE_URL/api/analytics/projects"
test_endpoint "Analytics Trends" "$BASE_URL/api/analytics/trends"
test_endpoint "Team Analytics" "$BASE_URL/api/analytics/team"
echo ""

echo "9️⃣  USER SETTINGS"
echo "━━━━━━━━━━━━━━━━"
test_endpoint "User Settings" "$BASE_URL/api/user/settings"
test_endpoint "Notification Settings" "$BASE_URL/api/user/settings/notifications"
echo ""

echo "🔟 COMMENTS SYSTEM"
echo "━━━━━━━━━━━━━━━━━"
test_endpoint "List Comments" "$BASE_URL/api/comments"
echo ""

echo ""
echo "================================================"
echo "📊 TEST SUMMARY"
echo "================================================"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo "Total: $((PASSED + FAILED))"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠️  Some tests failed. Check above for details.${NC}"
    exit 1
fi
