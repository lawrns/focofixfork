#!/bin/bash
BASE_URL="http://localhost:3007"

echo "Testing all pages on $BASE_URL"
echo "================================="

# List of pages to test
pages=(
    "/"
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

for page in "${pages[@]}"; do
    echo ""
    echo "Testing: $page"
    echo "URL: $BASE_URL$page"
    
    # Curl the page and check status
    response=$(curl -s -w "HTTPSTATUS:%{http_code};" "$BASE_URL$page")
    http_code=$(echo $response | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
    body=$(echo $response | sed -e 's/HTTPSTATUS:.*//g')
    
    echo "Status: $http_code"
    
    if [ "$http_code" = "200" ]; then
        echo "✓ Page loaded successfully"
        # Check for common indicators of a working page
        if echo "$body" | grep -q "<!DOCTYPE html>"; then
            echo "✓ Contains HTML"
        else
            echo "✗ Missing HTML structure"
        fi
        
        if echo "$body" | grep -q "<title>"; then
            title=$(echo "$body" | grep -o '<title>[^<]*</title>' | sed 's/<title>//;s/<\/title>//')
            echo "✓ Title: $title"
        else
            echo "✗ Missing title"
        fi
        
        # Check for error messages
        if echo "$body" | grep -q "Error\|error\|Error:"; then
            echo "! Contains error text"
        fi
    else
        echo "✗ Failed to load (HTTP $http_code)"
        echo "Response: $(echo "$body" | head -5)"
    fi
    
    echo "---"
done

echo ""
echo "Page testing complete!"
