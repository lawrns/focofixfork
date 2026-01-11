#!/bin/bash

# Production Route Verification Script
# Tests that previously failing routes now work correctly

BASE_URL="https://foco.mx"
ERRORS=0

echo "======================================"
echo "Testing Production Routes"
echo "======================================"
echo ""

# Test main pages that link to tasks/projects
echo "1. Testing home page..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/")
if [ "$STATUS" = "200" ]; then
    echo "   ✅ Home page: $STATUS"
else
    echo "   ❌ Home page: $STATUS (expected 200)"
    ERRORS=$((ERRORS + 1))
fi

echo "2. Testing projects page..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/projects")
if [ "$STATUS" = "200" ]; then
    echo "   ✅ Projects page: $STATUS"
else
    echo "   ❌ Projects page: $STATUS (expected 200)"
    ERRORS=$((ERRORS + 1))
fi

echo "3. Testing timeline page..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/timeline")
if [ "$STATUS" = "200" ]; then
    echo "   ✅ Timeline page: $STATUS"
else
    echo "   ❌ Timeline page: $STATUS (expected 200)"
    ERRORS=$((ERRORS + 1))
fi

echo "4. Testing my-work page..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/my-work")
if [ "$STATUS" = "200" ]; then
    echo "   ✅ My Work page: $STATUS"
else
    echo "   ❌ My Work page: $STATUS (expected 200)"
    ERRORS=$((ERRORS + 1))
fi

# Test that old /app/ routes return 404 (as expected)
echo ""
echo "5. Verifying old /app/ routes are not accessible..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/app/projects")
if [ "$STATUS" = "404" ]; then
    echo "   ✅ /app/projects correctly returns 404"
else
    echo "   ⚠️  /app/projects returns: $STATUS (expected 404)"
fi

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/app/tasks/1")
if [ "$STATUS" = "404" ]; then
    echo "   ✅ /app/tasks/1 correctly returns 404"
else
    echo "   ⚠️  /app/tasks/1 returns: $STATUS (expected 404)"
fi

echo ""
echo "======================================"
if [ $ERRORS -eq 0 ]; then
    echo "✅ All tests passed!"
    echo "======================================"
    exit 0
else
    echo "❌ $ERRORS test(s) failed"
    echo "======================================"
    exit 1
fi
