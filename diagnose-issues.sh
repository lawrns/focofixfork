#!/bin/bash

echo "🔍 CODEBASE DIAGNOSTIC SCRIPT"
echo "============================="
echo ""

# 1. Check for supabase-server imports in client code
echo "1. Checking for supabase-server imports in client components..."
echo "-----------------------------------------------------------"
grep -r "supabase-server" src/app --include="*.tsx" --include="*.ts" | grep -v "/api/" | head -5
grep -r "supabase-server" src/components --include="*.tsx" --include="*.ts" | head -5
grep -r "supabase-server" src/features --include="*.tsx" --include="*.ts" | head -5
echo ""

# 2. Check API route structure
echo "2. Checking API routes structure..."
echo "-----------------------------------"
ls -la src/app/api/projects/\[id\]/ 2>/dev/null || echo "❌ Missing [id] route"
echo ""

# 3. Check for proper array handling
echo "3. Searching for .map usage without array checks..."
echo "---------------------------------------------------"
grep -r "\.map(" src --include="*.tsx" --include="*.ts" | grep -v "Array.isArray" | grep -v "\?" | head -5
echo ""

# 4. Check environment variables
echo "4. Checking environment variables..."
echo "------------------------------------"
[ -f .env.local ] && echo "✅ .env.local exists" || echo "❌ .env.local missing"
[ -f .env ] && echo "✅ .env exists" || echo "❌ .env missing"
echo ""

# 5. Check for multiple Supabase client initializations
echo "5. Checking Supabase client initialization..."
echo "---------------------------------------------"
grep -r "createClient" src --include="*.ts" --include="*.tsx" | grep -v "// " | head -10
echo ""

# 6. Check service worker
echo "6. Checking service worker configuration..."
echo "-------------------------------------------"
[ -f public/sw.js ] && echo "✅ sw.js exists" || echo "❌ sw.js missing"
echo ""

# 7. Check API response consistency
echo "7. Checking API response patterns..."
echo "------------------------------------"
grep -r "return Response.json" src/app/api --include="*.ts" | head -5
grep -r "return NextResponse.json" src/app/api --include="*.ts" | head -5
echo ""

# 8. Check for type mismatches
echo "8. Running TypeScript check..."
echo "------------------------------"
npx tsc --noEmit 2>&1 | head -20
echo ""

# 9. Check auth middleware
echo "9. Checking auth middleware..."
echo "------------------------------"
[ -f src/middleware.ts ] && echo "✅ middleware.ts exists" || echo "❌ middleware.ts missing"
grep -r "getUser\|getSession" src/middleware.ts 2>/dev/null | head -5
echo ""

# 10. Check database connection
echo "10. Testing database connection..."
echo "----------------------------------"
grep "SUPABASE_URL" .env* 2>/dev/null | head -2
grep "SUPABASE.*KEY" .env* 2>/dev/null | head -2
echo ""

echo "============================="
echo "DIAGNOSTIC COMPLETE"
echo "============================="