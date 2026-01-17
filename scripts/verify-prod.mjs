
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ouvqnyfqipgnrjnuqsqq.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91dnFueWZxaXBnbnJqbnVxc3FxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MDE0MTgsImV4cCI6MjA4MzQ3NzQxOH0.IWsTnd87r9H0FCxzPGqayhrvqRZN9DZp15U4DM_IXgc'

async function verifyProduction() {
  const supabase = createClient(supabaseUrl, supabaseAnonKey)
  
  console.log('Logging in as laurence@fyves.com...')
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'laurence@fyves.com',
    password: 'hennie12'
  })

  if (error) {
    console.error('Login failed:', error.message)
    return
  }

  const session = data.session
  const token = session.access_token
  const refreshToken = session.refresh_token
  console.log('Login successful. Token acquired.')

  const endpoints = [
    '/api/my-work/assigned',
    '/api/organizations',
    '/api/workspaces'
  ]

  // Supabase Auth helper expects cookies. We'll simulate the cookie format.
  // The @supabase/ssr library uses a specific cookie format.
  const cookieValue = JSON.stringify([token, refreshToken, null, null, null])
  const cookieName = `sb-ouvqnyfqipgnrjnuqsqq-auth-token`

  for (const endpoint of endpoints) {
    console.log(`Testing ${endpoint}...`)
    const res = await fetch(`https://foco.mx${endpoint}`, {
      headers: {
        'Cookie': `${cookieName}=${encodeURIComponent(cookieValue)}`
      }
    })
    
    if (res.ok) {
      const data = await res.json()
      console.log(`✅ ${endpoint} returned 200 OK. Success: ${data.success || data.ok}`)
    } else {
      console.error(`❌ ${endpoint} failed with status ${res.status}`)
      try {
        const errData = await res.json()
        console.error('Error details:', JSON.stringify(errData, null, 2))
      } catch (e) {}
    }
  }
}

verifyProduction()
