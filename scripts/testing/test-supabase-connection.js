const { createClient } = require('@supabase/supabase-js')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

async function testSupabaseConnection() {
  console.log('🔍 Testing Supabase connection and environment setup...')

  // Test environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  console.log('Environment variables check:')
  console.log(`- NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? '✅ Set' : '❌ Missing'}`)
  console.log(`- NEXT_PUBLIC_SUPABASE_ANON_KEY: ${supabaseAnonKey ? '✅ Set' : '❌ Missing'}`)

  if (!supabaseUrl || !supabaseAnonKey) {
    console.log('❌ Environment setup failed - missing required variables')
    return false
  }

  // Test Supabase connection
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    console.log('\nTesting Supabase client initialization...')
    const { data, error } = await supabase.auth.getSession()

    if (error) {
      console.log(`❌ Supabase auth test failed: ${error.message}`)
      return false
    }

    console.log('✅ Supabase auth connection successful')

    // Test database connectivity
    console.log('Testing database connectivity...')
    try {
      const { data: dbData, error: dbError } = await supabase
        .from('organizations')
        .select('count')
        .limit(1)

      if (dbError) {
        if (dbError.code === 'PGRST116' || dbError.message.includes('does not exist')) {
          console.log('✅ Database accessible - schema not yet created (expected)')
        } else {
          console.log(`❌ Database connection failed: ${dbError.message}`)
          return false
        }
      } else {
        console.log('✅ Database fully accessible with existing schema')
      }
    } catch (dbTestError) {
      console.log(`❌ Database test failed: ${dbTestError.message}`)
      return false
    }

    console.log('\n🎉 T001: Supabase connection and environment setup verified successfully!')
    return true

  } catch (error) {
    console.log(`❌ Supabase connection test failed: ${error.message}`)
    return false
  }
}

// Run the test
testSupabaseConnection()
  .then(success => {
    if (!success) {
      process.exit(1)
    }
  })
  .catch(error => {
    console.error('Test execution failed:', error)
    process.exit(1)
  })


