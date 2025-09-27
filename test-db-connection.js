// Test database connection script
require('dotenv').config({ path: '.env.local' })

async function testConnection() {
  try {
    console.log('🔍 Testing Supabase Database Connection...\n')

    // Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    console.log('📋 Environment Variables:')
    console.log(`NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? '✅ Set' : '❌ Missing'}`)
    console.log(`NEXT_PUBLIC_SUPABASE_ANON_KEY: ${supabaseKey ? '✅ Set' : '❌ Missing'}`)
    console.log(`SUPABASE_SERVICE_ROLE_KEY: ${serviceRoleKey ? '✅ Set' : '❌ Missing'}`)
    console.log()

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing required environment variables')
    }

    // Import Supabase client
    const { createClient } = require('@supabase/supabase-js')
    
    // Create client
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: false
      }
    })

    console.log('🔌 Testing database connectivity...')

    // Test basic connectivity by querying a system table
    const { data: healthCheck, error: healthError } = await supabase
      .from('organizations')
      .select('count')
      .limit(1)

    if (healthError) {
      if (healthError.message.includes('does not exist')) {
        console.log('⚠️  Organizations table does not exist yet - this is normal for a new setup')
      } else {
        throw healthError
      }
    } else {
      console.log('✅ Database connection successful!')
      console.log('✅ Organizations table accessible')
    }

    // Test other tables
    const tables = ['projects', 'tasks', 'milestones', 'user_profiles']
    
    for (const table of tables) {
      try {
        const { error } = await supabase
          .from(table)
          .select('count')
          .limit(1)
        
        if (error) {
          if (error.message.includes('does not exist')) {
            console.log(`⚠️  ${table} table does not exist yet`)
          } else {
            console.log(`❌ ${table} table error: ${error.message}`)
          }
        } else {
          console.log(`✅ ${table} table accessible`)
        }
      } catch (err) {
        console.log(`❌ ${table} table error: ${err.message}`)
      }
    }

    // Test authentication
    console.log('\n🔐 Testing authentication...')
    const { data: session, error: authError } = await supabase.auth.getSession()
    
    if (authError) {
      console.log(`⚠️  Auth check: ${authError.message}`)
    } else {
      console.log('✅ Authentication system accessible')
      console.log(`Current session: ${session?.session ? 'Active' : 'None'}`)
    }

    console.log('\n🎉 Database connection test completed successfully!')
    console.log('\n📝 Next steps:')
    console.log('1. If tables don\'t exist, you may need to run database migrations')
    console.log('2. Check your Supabase dashboard for table creation')
    console.log('3. Verify RLS (Row Level Security) policies if needed')

  } catch (error) {
    console.error('\n❌ Database connection test failed:')
    console.error(error.message)
    console.error('\n🔧 Troubleshooting:')
    console.error('1. Check your .env.local file exists and has correct values')
    console.error('2. Verify your Supabase project is active')
    console.error('3. Check your internet connection')
    console.error('4. Verify the Supabase URL and keys are correct')
    process.exit(1)
  }
}

// Run the test
testConnection()