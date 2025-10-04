#!/bin/bash

# Test All Pages with Curl
echo "🌐 Testing All Pages on Port 3001"
echo "=================================="
echo ""

BASE_URL="http://localhost:3001"
PASSED=0
FAILED=0

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

test_page() {
    local page="$1"
    local url="$BASE_URL$page"

    echo -n "Testing $page ... "

    response=$(curl -s -o /dev/null -w "%{http_code}" "$url")

    if [ "$response" = "200" ]; then
        echo -e "${GREEN}✓ OK${NC} (HTTP $response)"
        ((PASSED++))
    else
        echo -e "${RED}✗ FAIL${NC} (HTTP $response)"
        ((FAILED++))
    fi
}

echo "📄 Public Pages"
echo "---------------"
test_page "/"
test_page "/login"
test_page "/register"
test_page "/organization-setup"
echo ""

echo "🏠 Dashboard Pages"
echo "------------------"
test_page "/dashboard"
test_page "/dashboard/analytics"
test_page "/dashboard/goals"
test_page "/dashboard/settings"
echo ""

echo "📊 Management Pages"
echo "-------------------"
test_page "/projects"
test_page "/milestones"
test_page "/tasks"
test_page "/organizations"
test_page "/team"
echo ""

echo "📥 Other Pages"
echo "--------------"
test_page "/inbox"
test_page "/favorites"
test_page "/reports"
test_page "/help"
echo ""

echo "🔌 API Endpoints"
echo "----------------"
test_page "/api/health"
test_page "/api/ai/health"
test_page "/api/projects"
test_page "/api/milestones"
test_page "/api/tasks"
test_page "/api/goals"
test_page "/api/organizations"
test_page "/api/analytics/dashboard"
echo ""

echo "=================================="
echo "📊 SUMMARY"
echo "=================================="
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo "Total: $((PASSED + FAILED))"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All pages working!${NC}"
    exit 0
else
    echo -e "${RED}⚠️  Some pages failed${NC}"
    exit 1
fi
