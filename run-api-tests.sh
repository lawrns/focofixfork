#!/bin/bash

# API Production Verification Test Runner
# This script runs API tests without starting a local webserver

export NEXT_PUBLIC_SUPABASE_URL=https://ouvqnyfqipgnrjnuqsqq.supabase.co
export NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91dnFueWZxaXBnbnJqbnVxc3FxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MDE0MTgsImV4cCI6MjA4MzQ3NzQxOH0.IWsTnd87r9H0FCxzPGqayhrvqRZN9DZp15U4DM_IXgc

echo "🚀 Running API Production Verification Tests"
echo "📍 Target: https://foco.mx"
echo "🔐 Test User: laurence@fyves.com"
echo ""

npx playwright test \
  --config=playwright.api.config.ts \
  --reporter=list

echo ""
echo "✅ Test run complete"
