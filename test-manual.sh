#!/bin/bash

echo "🧪 Manual Testing Script for Foco"
echo "=================================="
echo ""

BASE_URL="http://localhost:3004"

# Check if server is running
echo "1. Checking if server is running..."
if curl -s "$BASE_URL" > /dev/null; then
    echo "   ✅ Server is running on port 3004"
else
    echo "   ❌ Server is not running"
    exit 1
fi

echo ""
echo "2. Testing API endpoints..."

# Test tasks API
echo "   - Testing /api/tasks endpoint..."
curl -s -o /dev/null -w "   Status: %{http_code}\n" "$BASE_URL/api/tasks"

# Test projects API
echo "   - Testing /api/projects endpoint..."
curl -s -o /dev/null -w "   Status: %{http_code}\n" "$BASE_URL/api/projects"

echo ""
echo "3. Key pages to test manually:"
echo "   📄 Login: $BASE_URL/login"
echo "   📄 Dashboard: $BASE_URL/dashboard"
echo "   📄 Tasks: $BASE_URL/tasks"
echo "   📄 Projects: $BASE_URL/projects"
echo "   📄 Goals: $BASE_URL/dashboard/goals"
echo "   📄 Analytics: $BASE_URL/analytics"
echo "   📄 Reports: $BASE_URL/reports"
echo ""

echo "4. Test credentials:"
echo "   Email: laurence@fyves.com"
echo "   Password: Hennie@@18"
echo ""

echo "5. Things to test:"
echo "   ✓ Login with credentials"
echo "   ✓ Navigate to Tasks page"
echo "   ✓ Click 'New Task' button - modal should open"
echo "   ✓ Scroll in modal - should be able to reach 'Create Task' button"
echo "   ✓ Select a project from dropdown - should open and show options"
echo "   ✓ Check for checkboxes next to tasks - bulk selection"
echo "   ✓ Select multiple tasks and try bulk delete"
echo "   ✓ Open browser console (F12) - check for errors"
echo ""

echo "📊 Server logs available in background process"
echo "🔍 Open $BASE_URL in your browser to test"
