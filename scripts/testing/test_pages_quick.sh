#!/bin/bash
BASE_URL="http://localhost:3001"

echo "Quick page status check on $BASE_URL"
echo "================================="

pages=(
    "/login"
    "/register" 
    "/dashboard"
    "/projects"
    "/tasks"
    "/milestones"
    "/organizations"
    "/settings"
    "/goals"
    "/reports"
    "/favorites"
    "/inbox"
    "/help"
)

working=0
total=${#pages[@]}

for page in "${pages[@]}"; do
    status=$(curl -s -w "%{http_code}" -o /dev/null "$BASE_URL$page")
    if [ "$status" = "200" ]; then
        echo "✓ $page - $status"
        ((working++))
    else
        echo "✗ $page - $status"
    fi
done

echo ""
echo "Summary: $working/$total pages working"
