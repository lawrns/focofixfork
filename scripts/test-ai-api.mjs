import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://ouvqnyfqipgnrjnuqsqq.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91dnFueWZxaXBnbnJqbnVxc3FxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MDE0MTgsImV4cCI6MjA4MzQ3NzQxOH0.IWsTnd87r9H0FCxzPGqayhrvqRZN9DZp15U4DM_IXgc'

// Simulate the API call
async function testAIAPI() {
  console.log('🧪 Testing AI API endpoint...')
  
  try {
    const response = await fetch('http://localhost:3000/api/ai/task-actions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'sb-access-token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91dnFueWZxaXBnbnJqbnVxc3FxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MDE0MTgsImV4cCI6MjA4MzQ3NzQxOH0.IWsTnd87r9H0FCxzPGqayhrvqRZN9DZp15U4DM_IXgc; sb-refresh-token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test'
      },
      body: JSON.stringify({
        action: 'suggest_subtasks',
        task_id: '8e20cc6c-eb78-4bcb-821a-9ce120bf61df',
        workspace_id: 'd7de1d3e-cae6-4210-ae4e-775fb84ddb7d'
      })
    })
    
    const text = await response.text()
    console.log('Response status:', response.status)
    console.log('Response body:', text)
    
  } catch (error) {
    console.error('Error:', error.message)
  }
}

// Test direct Supabase insert with anon key
async function testDirectInsert() {
  console.log('\n🧪 Testing direct insert with anon key...')
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  
  try {
    const { data, error } = await supabase
      .from('activity_log')
      .insert({
        workspace_id: 'd7de1d3e-cae6-4210-ae4e-775fb84ddb7d',
        entity_type: 'ai_task_action',
        entity_id: '8e20cc6c-eb78-4bcb-821a-9ce120bf61df',
        action: 'ai_action:test',
        changes: { test: true },
        is_ai_action: true,
        can_undo: false
      })
      .select()
    
    if (error) {
      console.error('Insert error:', error)
    } else {
      console.log('Insert successful:', data)
    }
  } catch (error) {
    console.error('Error:', error)
  }
}

async function main() {
  // Start dev server if not running
  console.log('Make sure the dev server is running on localhost:3000')
  await testAIAPI()
  await testDirectInsert()
}

main().catch(console.error)
