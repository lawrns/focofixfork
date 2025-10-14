#!/bin/bash

echo "🔍 Testing current production (pre-deployment)..."
echo "================================================"
echo ""

# Test API endpoints
echo "Testing API endpoints..."

# Test auth endpoint
echo -n "1. Testing /api/auth/session: "
AUTH_RESPONSE=$(curl -s -w "\n%{http_code}" https://foco.mx/api/auth/session)
AUTH_STATUS=$(echo "$AUTH_RESPONSE" | tail -1)
echo "Status $AUTH_STATUS"

# Test projects endpoint (will likely fail without auth)
echo -n "2. Testing /api/projects: "
PROJECTS_RESPONSE=$(curl -s -w "\n%{http_code}" https://foco.mx/api/projects)
PROJECTS_STATUS=$(echo "$PROJECTS_RESPONSE" | tail -1)
echo "Status $PROJECTS_STATUS"

# Test specific project (the one from the error logs)
echo -n "3. Testing /api/projects/483c5a2a-cd6f-47a0-ae4a-f61c02848107: "
PROJECT_RESPONSE=$(curl -s -w "\n%{http_code}" https://foco.mx/api/projects/483c5a2a-cd6f-47a0-ae4a-f61c02848107)
PROJECT_STATUS=$(echo "$PROJECT_RESPONSE" | tail -1)
echo "Status $PROJECT_STATUS"

echo ""
echo "Testing public pages..."

# Test main pages
PAGES=(
    "/"
    "/login"
    "/register"
    "/about"
    "/pricing"
)

for page in "${PAGES[@]}"; do
    echo -n "Testing $page: "
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://foco.mx$page")
    if [ "$STATUS" = "200" ]; then
        echo "✅ $STATUS"
    else
        echo "❌ $STATUS"
    fi
done

echo ""
echo "================================================"
echo "Summary:"
echo "- API endpoints need authentication (expected)"
echo "- Check if any 500 errors occur"
echo ""

# Now let's try with a real browser simulation using curl with cookies
echo "Attempting login test..."
echo ""

# Create a cookie jar
COOKIE_JAR="/tmp/foco-cookies.txt"

# Get CSRF token or initial cookies
echo "Getting initial cookies..."
curl -s -c "$COOKIE_JAR" https://foco.mx/login > /dev/null

# Attempt login
echo "Attempting login with test credentials..."
LOGIN_RESPONSE=$(curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json" \
    -X POST \
    -d '{"email":"laurence@fyves.com","password":"Hennie@@18"}' \
    -w "\nHTTP_STATUS:%{http_code}" \
    https://foco.mx/api/auth/login)

LOGIN_STATUS=$(echo "$LOGIN_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
echo "Login response status: $LOGIN_STATUS"

if [ "$LOGIN_STATUS" = "200" ] || [ "$LOGIN_STATUS" = "201" ]; then
    echo "✅ Login successful"

    # Now test authenticated endpoints
    echo ""
    echo "Testing authenticated endpoints..."

    echo -n "1. /api/projects: "
    AUTH_PROJECTS=$(curl -s -b "$COOKIE_JAR" -w "\n%{http_code}" https://foco.mx/api/projects | tail -1)
    echo "Status $AUTH_PROJECTS"

    echo -n "2. /api/auth/session: "
    AUTH_SESSION=$(curl -s -b "$COOKIE_JAR" -w "\n%{http_code}" https://foco.mx/api/auth/session | tail -1)
    echo "Status $AUTH_SESSION"

    echo -n "3. /api/projects/483c5a2a-cd6f-47a0-ae4a-f61c02848107: "
    AUTH_PROJECT=$(curl -s -b "$COOKIE_JAR" -w "\n%{http_code}" https://foco.mx/api/projects/483c5a2a-cd6f-47a0-ae4a-f61c02848107 | tail -1)
    echo "Status $AUTH_PROJECT"
else
    echo "❌ Login failed with status $LOGIN_STATUS"
    echo "Response:"
    echo "$LOGIN_RESPONSE" | head -10
fi

# Clean up
rm -f "$COOKIE_JAR"

echo ""
echo "Test complete."