import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://czijxfbkihrauyjwcgfn.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6aWp4ZmJraWhyYXV5andjZ2ZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjE3NTk4MywiZXhwIjoyMDY3NzUxOTgzfQ._JnBgXZLk23daPdnCUksfvooIJk2r9mFyclO8MnvfQ8'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkTables() {
  console.log('Checking database tables...')

  const tables = ['goals', 'goal_milestones', 'goal_project_links', 'user_settings', 'organization_settings', 'project_settings', 'user_notification_preferences']

  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1)
      if (error) {
        console.log(`❌ Table '${table}' does not exist: ${error.message}`)
      } else {
        console.log(`✅ Table '${table}' exists`)
      }
    } catch (error) {
      console.log(`❌ Error checking table '${table}': ${error.message}`)
    }
  }
}

checkTables().catch(console.error)
