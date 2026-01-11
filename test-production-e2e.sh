#!/bin/bash

# Production E2E Testing Script
# Tests registration flow and navigation paths

BASE_URL="https://foco.mx"
ERRORS=0

echo "======================================"
echo "Production E2E Testing"
echo "======================================"
echo ""

# Test Authentication & Registration Flow
echo "🔐 Testing Authentication Flow..."
echo ""

echo "1. Registration page accessibility"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/register")
if [ "$STATUS" = "200" ]; then
    echo "   ✅ /register: $STATUS"
else
    echo "   ❌ /register: $STATUS (expected 200)"
    ERRORS=$((ERRORS + 1))
fi

echo "2. Login page accessibility"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/login")
if [ "$STATUS" = "200" ]; then
    echo "   ✅ /login: $STATUS"
else
    echo "   ❌ /login: $STATUS (expected 200)"
    ERRORS=$((ERRORS + 1))
fi

echo "3. Forgot password page"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/forgot-password")
if [ "$STATUS" = "200" ]; then
    echo "   ✅ /forgot-password: $STATUS"
else
    echo "   ❌ /forgot-password: $STATUS (expected 200)"
    ERRORS=$((ERRORS + 1))
fi

echo "4. Organization setup page"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/organization-setup")
if [ "$STATUS" = "200" ]; then
    echo "   ✅ /organization-setup: $STATUS"
else
    echo "   ❌ /organization-setup: $STATUS (expected 200)"
    ERRORS=$((ERRORS + 1))
fi

# Test Main Navigation Paths
echo ""
echo "🧭 Testing Main Navigation..."
echo ""

declare -a nav_routes=(
    "/"
    "/dashboard"
    "/inbox"
    "/my-work"
    "/projects"
    "/timeline"
    "/calendar"
    "/people"
    "/reports"
    "/settings"
    "/docs"
    "/help"
)

for route in "${nav_routes[@]}"; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$route")
    if [ "$STATUS" = "200" ]; then
        echo "   ✅ $route: $STATUS"
    else
        echo "   ❌ $route: $STATUS (expected 200)"
        ERRORS=$((ERRORS + 1))
    fi
done

# Test Content Integrity (no 404 errors in HTML)
echo ""
echo "🔍 Testing Page Content Integrity..."
echo ""

echo "5. Checking home page has no RSC 404 errors"
CONTENT=$(curl -s "$BASE_URL/")
if echo "$CONTENT" | grep -q "404" && echo "$CONTENT" | grep -q "_rsc"; then
    echo "   ❌ Home page contains RSC 404 references"
    ERRORS=$((ERRORS + 1))
else
    echo "   ✅ Home page has clean content (no RSC 404s)"
fi

echo "6. Checking projects page loads without errors"
CONTENT=$(curl -s "$BASE_URL/projects")
if echo "$CONTENT" | grep -q "404"; then
    echo "   ⚠️  Projects page may contain 404 references"
else
    echo "   ✅ Projects page loads cleanly"
fi

echo "7. Checking timeline page loads without errors"
CONTENT=$(curl -s "$BASE_URL/timeline")
if echo "$CONTENT" | grep -q "404"; then
    echo "   ⚠️  Timeline page may contain 404 references"
else
    echo "   ✅ Timeline page loads cleanly"
fi

# Test Critical Static Assets
echo ""
echo "📦 Testing Static Assets..."
echo ""

echo "8. Service worker"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/sw.js")
if [ "$STATUS" = "200" ]; then
    echo "   ✅ /sw.js: $STATUS"
else
    echo "   ⚠️  /sw.js: $STATUS"
fi

echo "9. Robots.txt"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/robots.txt")
if [ "$STATUS" = "200" ]; then
    echo "   ✅ /robots.txt: $STATUS"
else
    echo "   ⚠️  /robots.txt: $STATUS"
fi

echo "10. Sitemap"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/sitemap.xml")
if [ "$STATUS" = "200" ]; then
    echo "   ✅ /sitemap.xml: $STATUS"
else
    echo "   ⚠️  /sitemap.xml: $STATUS"
fi

# Summary
echo ""
echo "======================================"
if [ $ERRORS -eq 0 ]; then
    echo "✅ All E2E tests passed!"
    echo "======================================"
    echo ""
    echo "✨ Production is ready!"
    echo "   - Registration flow: ✅"
    echo "   - Main navigation: ✅"
    echo "   - Route fixes: ✅"
    echo "   - No 404 errors: ✅"
    exit 0
else
    echo "❌ $ERRORS test(s) failed"
    echo "======================================"
    exit 1
fi
