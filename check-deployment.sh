#!/bin/bash

# Production deployment verification script
SITE_URL="https://focofixfork.netlify.app"

echo "=== Deployment Status Check ==="
echo "Site: $SITE_URL"
echo "Time: $(date)"
echo ""

# Check if site is accessible
echo "1. Checking site accessibility..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$SITE_URL/")
echo "   Root path (/): HTTP $STATUS"

# Try common routes
for route in "/login" "/projects" "/dashboard" "/search"; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$SITE_URL$route")
  echo "   $route: HTTP $STATUS"
done

echo ""
echo "2. Checking for deployment errors..."
# Try to get the HTML and check for error messages
RESPONSE=$(curl -s "$SITE_URL/login")
if echo "$RESPONSE" | grep -q "404"; then
  echo "   ⚠️  Site returning 404 errors"
elif echo "$RESPONSE" | grep -q "<!DOCTYPE html>"; then
  echo "   ✓ Site is serving HTML content"
else
  echo "   ⚠️  Unexpected response"
fi

echo ""
echo "3. Checking latest deployment..."
# Check Netlify status header
HEADERS=$(curl -s -I "$SITE_URL/" 2>&1)
echo "$HEADERS" | grep -i "x-nf\|cache\|server"
