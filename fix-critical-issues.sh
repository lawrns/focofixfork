#!/bin/bash

echo "🔧 FIXING CRITICAL ISSUES"
echo "========================="
echo ""

# Fix 1: Find and replace server-side imports in client code
echo "1. Finding client components importing server-side code..."
echo "---------------------------------------------------------"
grep -r "projectService" src --include="*.tsx" --include="*.ts" | grep -v "/api/" | grep -v "projectClientService"
echo ""
echo "TO FIX: Replace all 'projectService' imports with 'projectClientService' in components"
echo ""

# Fix 2: Check for array safety
echo "2. Adding array checks to all .map() calls..."
echo "---------------------------------------------"
echo "Files that need Array.isArray() checks:"
grep -r "\.map(" src/app --include="*.tsx" | grep -v "Array.isArray" | grep -v "\?" | cut -d: -f1 | sort -u | head -10
echo ""

# Fix 3: Create singleton Supabase client
echo "3. Creating singleton Supabase client pattern..."
echo "------------------------------------------------"
cat << 'EOF' > src/lib/supabase-singleton.ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

let clientInstance: ReturnType<typeof createClient<Database>> | null = null
let serverInstance: ReturnType<typeof createClient<Database>> | null = null

export function getSupabaseClient() {
  if (!clientInstance) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    clientInstance = createClient<Database>(url, key)
  }
  return clientInstance
}

export function getSupabaseServer() {
  if (!serverInstance && typeof window === 'undefined') {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
    serverInstance = createClient<Database>(url, key)
  }
  return serverInstance!
}
EOF
echo "✅ Singleton pattern created"
echo ""

# Fix 4: Standardize API responses
echo "4. Creating standard API response helper..."
echo "------------------------------------------"
cat << 'EOF' > src/lib/api-response.ts
import { NextResponse } from 'next/server'

export function apiSuccess<T = any>(data: T, meta?: any) {
  return NextResponse.json({
    success: true,
    data,
    ...meta
  })
}

export function apiError(error: string, status = 400) {
  return NextResponse.json(
    {
      success: false,
      error,
      data: null
    },
    { status }
  )
}
EOF
echo "✅ API response helper created"
echo ""

# Fix 5: Install missing TypeScript types
echo "5. Installing missing TypeScript types..."
echo "-----------------------------------------"
npm install -D @testing-library/jest-dom @types/testing-library__jest-dom msw --legacy-peer-deps
echo ""

# Fix 6: Check RLS policies
echo "6. Checking database RLS policies..."
echo "------------------------------------"
echo "Run this SQL in Supabase dashboard to check policies:"
cat << 'EOF'
-- Check if RLS is enabled and policies exist
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'projects'
ORDER BY policyname;

-- If no policies exist, create them:
-- ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can view their own projects" ON projects
--   FOR SELECT TO authenticated
--   USING (
--     created_by = auth.uid() OR
--     organization_id IN (
--       SELECT organization_id FROM organization_members
--       WHERE user_id = auth.uid()
--     )
--   );
EOF
echo ""

echo "========================="
echo "FIXES PREPARED"
echo "========================="
echo ""
echo "Next steps:"
echo "1. Run the SQL above in Supabase dashboard"
echo "2. Replace projectService imports with projectClientService"
echo "3. Add Array.isArray() checks before .map() calls"
echo "4. Update all API routes to use the new response helpers"
echo "5. Clear browser cache and service worker"
echo "6. Verify all Netlify environment variables are set"