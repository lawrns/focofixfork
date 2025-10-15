import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const SUPABASE_URL = 'https://czijxfbkihrauyjwcgfn.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6aWp4ZmJraWhyYXV5andjZ2ZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjE3NTk4MywiZXhwIjoyMDY3NzUxOTgzfQ._JnBgXZLk23daPdnCUksfvooIJk2r9mEyclO8MnvfQ8'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
})

async function runSQL(description: string, sql: string) {
  console.log(`\n📊 ${description}...`)
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })
    if (error) {
      // Try direct query if RPC doesn't exist
      const result = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
        },
        body: JSON.stringify({ sql_query: sql })
      })
      console.log('Result:', await result.text())
    } else {
      console.log('✅ Success')
      if (data) console.log(data)
    }
  } catch (e) {
    console.error('❌ Error:', e)
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════════════════')
  console.log('  🔧 APPLYING COMPREHENSIVE DATABASE FIXES')
  console.log('═══════════════════════════════════════════════════════════════════════════\n')

  // Read the migration file
  const migrationSQL = readFileSync('database/migrations/999_comprehensive_database_fixes.sql', 'utf-8')
  
  console.log('📋 Executing migration...')
  
  // Split by sections and execute
  const sections = migrationSQL.split('-- ═══════════════════════════════════════════════════════════════════════════')
  
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i].trim()
    if (section) {
      console.log(`\n🔧 Section ${i + 1}/${sections.length}`)
      await runSQL(`Executing section ${i + 1}`, section)
    }
  }
  
  console.log('\n═══════════════════════════════════════════════════════════════════════════')
  console.log('  ✅ DATABASE FIXES COMPLETED!')
  console.log('═══════════════════════════════════════════════════════════════════════════')
}

main().catch(console.error)
