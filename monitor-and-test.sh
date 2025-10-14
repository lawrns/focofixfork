#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔄 Monitoring deployment and testing production${NC}"
echo "================================================"
echo ""

# Function to check deployment
check_deployment() {
    local sw_content=$(curl -s https://foco.mx/sw.js | head -100)
    local version=$(echo "$sw_content" | grep -o "SW_VERSION.*=.*['\"].*['\"]" | grep -o "[0-9]\+\.[0-9]\+\.[0-9]\+")
    local has_circuit=$(echo "$sw_content" | grep -c "circuitBreaker")

    if [ -z "$version" ]; then
        # Try alternative version detection
        version=$(echo "$sw_content" | grep -o "v[0-9]\+\.[0-9]\+\.[0-9]\+" | head -1 | sed 's/v//')
    fi

    echo "$version|$has_circuit"
}

# Monitor deployment
echo -e "${YELLOW}Waiting for deployment...${NC}"
MAX_CHECKS=20
CHECK_COUNT=0
DEPLOYED=false

while [ $CHECK_COUNT -lt $MAX_CHECKS ]; do
    CHECK_COUNT=$((CHECK_COUNT + 1))

    result=$(check_deployment)
    version=$(echo "$result" | cut -d'|' -f1)
    has_circuit=$(echo "$result" | cut -d'|' -f2)

    echo -n "Check #$CHECK_COUNT: v${version:-unknown}"

    if [ "$version" = "1.0.21" ] && [ "$has_circuit" -gt 0 ]; then
        echo -e " ${GREEN}✓ Deployed!${NC}"
        DEPLOYED=true
        break
    elif [ "$version" = "1.0.21" ]; then
        echo -e " ${YELLOW}(partial - no circuit breaker)${NC}"
    else
        echo ""
    fi

    if [ $CHECK_COUNT -lt $MAX_CHECKS ]; then
        sleep 20
    fi
done

echo ""
echo "================================================"
echo -e "${BLUE}Running Production Tests${NC}"
echo "================================================"
echo ""

# Function to test endpoint
test_endpoint() {
    local url=$1
    local cookie=$2
    local description=$3

    if [ -n "$cookie" ]; then
        response=$(curl -s -b "$cookie" -w "\n%{http_code}" "$url")
    else
        response=$(curl -s -w "\n%{http_code}" "$url")
    fi

    status=$(echo "$response" | tail -1)
    body=$(echo "$response" | head -n -1)

    echo -n "$description: "

    if [ "$status" = "200" ] || [ "$status" = "201" ]; then
        echo -e "${GREEN}✓ $status${NC}"
        return 0
    elif [ "$status" = "401" ] || [ "$status" = "403" ]; then
        echo -e "${YELLOW}⚠ $status (auth required)${NC}"
        return 1
    elif [ "$status" = "404" ]; then
        echo -e "${YELLOW}⚠ $status (not found)${NC}"
        return 1
    elif [ "$status" = "500" ] || [ "$status" = "502" ] || [ "$status" = "503" ]; then
        echo -e "${RED}✗ $status (server error)${NC}"
        # Check if it's a circuit breaker response
        if echo "$body" | grep -q "temporarily unavailable"; then
            echo -e "  ${YELLOW}Circuit breaker active${NC}"
        fi
        return 2
    else
        echo -e "${RED}✗ $status${NC}"
        return 2
    fi
}

# Test public endpoints
echo -e "${BLUE}1. Testing Public Endpoints${NC}"
echo "----------------------------"
test_endpoint "https://foco.mx" "" "Homepage"
test_endpoint "https://foco.mx/login" "" "Login page"
test_endpoint "https://foco.mx/register" "" "Register page"
test_endpoint "https://foco.mx/api/auth/session" "" "Auth session (no auth)"

echo ""
echo -e "${BLUE}2. Testing Authentication${NC}"
echo "----------------------------"

COOKIE_JAR="/tmp/foco-test-cookies.txt"
rm -f "$COOKIE_JAR"

# Get initial cookies
curl -s -c "$COOKIE_JAR" https://foco.mx/login > /dev/null

# Attempt login
echo -n "Login attempt: "
LOGIN_RESPONSE=$(curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json" \
    -X POST \
    -d '{"email":"laurence@fyves.com","password":"Hennie@@18"}' \
    -w "\n%{http_code}" \
    https://foco.mx/api/auth/login)

LOGIN_STATUS=$(echo "$LOGIN_RESPONSE" | tail -1)

if [ "$LOGIN_STATUS" = "200" ] || [ "$LOGIN_STATUS" = "201" ]; then
    echo -e "${GREEN}✓ Success${NC}"
    AUTH_SUCCESS=true
else
    echo -e "${RED}✗ Failed ($LOGIN_STATUS)${NC}"
    AUTH_SUCCESS=false
fi

if [ "$AUTH_SUCCESS" = true ]; then
    echo ""
    echo -e "${BLUE}3. Testing Authenticated Endpoints${NC}"
    echo "-----------------------------------"

    test_endpoint "https://foco.mx/api/auth/session" "$COOKIE_JAR" "Auth session"
    test_endpoint "https://foco.mx/api/projects" "$COOKIE_JAR" "Projects list"
    test_endpoint "https://foco.mx/api/tasks" "$COOKIE_JAR" "Tasks list"
    test_endpoint "https://foco.mx/api/milestones" "$COOKIE_JAR" "Milestones list"

    # Test the problematic project endpoint
    echo ""
    echo -e "${BLUE}4. Testing Specific Project (from error logs)${NC}"
    echo "----------------------------------------------"
    test_endpoint "https://foco.mx/api/projects/483c5a2a-cd6f-47a0-ae4a-f61c02848107" "$COOKIE_JAR" "Project 483c5a2a"

    # If we have circuit breaker, test it
    if [ "$DEPLOYED" = true ]; then
        echo ""
        echo -e "${BLUE}5. Testing Circuit Breaker${NC}"
        echo "---------------------------"

        # Make multiple requests to a failing endpoint
        echo "Making 5 rapid requests to test circuit breaker..."
        for i in {1..5}; do
            echo -n "  Request $i: "
            status=$(curl -s -b "$COOKIE_JAR" -o /dev/null -w "%{http_code}" \
                "https://foco.mx/api/projects/nonexistent-$(date +%s)")

            if [ "$status" = "503" ]; then
                echo -e "${GREEN}✓ Circuit open (503)${NC}"
            elif [ "$status" = "404" ]; then
                echo -e "${YELLOW}404 (circuit closed)${NC}"
            else
                echo -e "Status: $status"
            fi

            sleep 0.5
        done
    fi

    echo ""
    echo -e "${BLUE}6. Testing Main Application Pages${NC}"
    echo "----------------------------------"

    # Test authenticated pages
    PAGES=("/dashboard" "/projects" "/tasks" "/settings")
    for page in "${PAGES[@]}"; do
        url="https://foco.mx$page"
        echo -n "Page $page: "
        status=$(curl -s -b "$COOKIE_JAR" -L -o /dev/null -w "%{http_code}" "$url")
        if [ "$status" = "200" ]; then
            echo -e "${GREEN}✓ $status${NC}"
        else
            echo -e "${RED}✗ $status${NC}"
        fi
    done
fi

# Clean up
rm -f "$COOKIE_JAR"

echo ""
echo "================================================"
echo -e "${BLUE}Test Summary${NC}"
echo "================================================"

if [ "$DEPLOYED" = true ]; then
    echo -e "${GREEN}✓ New service worker deployed (v1.0.21)${NC}"
    echo -e "${GREEN}✓ Circuit breaker implemented${NC}"
else
    echo -e "${YELLOW}⚠ Running on old service worker${NC}"
fi

if [ "$AUTH_SUCCESS" = true ]; then
    echo -e "${GREEN}✓ Authentication working${NC}"
else
    echo -e "${RED}✗ Authentication failed${NC}"
fi

echo ""
echo "Test complete at $(date '+%H:%M:%S')"