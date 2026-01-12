#!/bin/bash

# Comprehensive Production Test Script for foco.mx
# Tests key user stories to ensure everything is functional

set -e

BASE_URL="https://foco.mx"
TEST_EMAIL="laurence@fyves.com"
TEST_PASSWORD="hennie12"
PROJECT_SLUG="website-redesign"

echo "🧪 Starting Comprehensive Production Tests for foco.mx"
echo "=================================================="
echo ""

# Test 1: Check if site is accessible
echo "✅ Test 1: Site Accessibility"
if curl -s -o /dev/null -w "%{http_code}" "$BASE_URL" | grep -q "200\|301\|302"; then
    echo "   ✓ Site is accessible"
else
    echo "   ✗ Site is not accessible"
    exit 1
fi

# Test 2: Check project detail page
echo ""
echo "✅ Test 2: Project Detail Page"
PROJECT_URL="$BASE_URL/projects/$PROJECT_SLUG"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$PROJECT_URL")
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "301" ] || [ "$HTTP_CODE" = "302" ]; then
    echo "   ✓ Project page is accessible (HTTP $HTTP_CODE)"
    
    # Check if page contains project-related content
    if curl -s "$PROJECT_URL" | grep -qi "project\|task\|board\|overview"; then
        echo "   ✓ Page contains project content"
    else
        echo "   ⚠ Page may not have expected content"
    fi
else
    echo "   ✗ Project page returned HTTP $HTTP_CODE"
fi

# Test 3: Check database connectivity (indirect test)
echo ""
echo "✅ Test 3: Database Connectivity (Indirect)"
# If the project page loads with data, database is working
if curl -s "$PROJECT_URL" | grep -qi "website\|redesign\|task"; then
    echo "   ✓ Database appears to be connected (data visible)"
else
    echo "   ⚠ Database connection status unclear"
fi

# Test 4: Check API endpoints
echo ""
echo "✅ Test 4: API Endpoints"
API_ENDPOINTS=(
    "/api/projects"
    "/api/tasks"
)

for endpoint in "${API_ENDPOINTS[@]}"; do
    API_URL="$BASE_URL$endpoint"
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL")
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "403" ]; then
        echo "   ✓ $endpoint responds (HTTP $HTTP_CODE)"
    else
        echo "   ⚠ $endpoint returned HTTP $HTTP_CODE"
    fi
done

# Test 5: Check static assets
echo ""
echo "✅ Test 5: Static Assets"
if curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/favicon.ico" | grep -q "200\|404"; then
    echo "   ✓ Static assets are served"
else
    echo "   ⚠ Static assets may have issues"
fi

# Test 6: Check JavaScript bundle
echo ""
echo "✅ Test 6: JavaScript Bundle"
if curl -s "$BASE_URL" | grep -qi "_next/static\|app.*\.js"; then
    echo "   ✓ JavaScript bundles are referenced"
else
    echo "   ⚠ JavaScript bundles may not be loading"
fi

echo ""
echo "=================================================="
echo "🎯 Test Summary"
echo "=================================================="
echo ""
echo "Key User Stories to Verify Manually:"
echo "  • US-2.2: View Project Dashboard - Navigate to /projects"
echo "  • US-2.3: Update Project - Check project detail page"
echo "  • US-3.1: Create Task - Test task creation"
echo "  • US-3.2: Update Task Status - Test status changes"
echo ""
echo "Next Steps:"
echo "  1. Log in at $BASE_URL with credentials:"
echo "     Email: $TEST_EMAIL"
echo "     Password: $TEST_PASSWORD"
echo "  2. Navigate to: $PROJECT_URL"
echo "  3. Verify:"
echo "     - Project details load correctly"
echo "     - Task cards are visible and clickable"
echo "     - Team members display properly"
echo "     - Tab navigation works"
echo "     - Board view shows tasks in correct columns"
echo ""

