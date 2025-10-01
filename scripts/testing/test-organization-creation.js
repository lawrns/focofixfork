// Test organization creation
require('dotenv').config({ path: '.env.local' })

async function testOrganizationCreation() {
  try {
    console.log('🔍 Testing Organization Creation...\n')

    // Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing required environment variables')
    }

    // Import Supabase client
    const { createClient } = require('@supabase/supabase-js')

    // Create client
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log('🔐 Testing authentication...')

    // First, let's see if we can authenticate
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'test@example.com', // You'll need to change this to a real test user
      password: 'testpassword'
    })

    if (authError) {
      console.log('⚠️  Could not authenticate test user:', authError.message)
      console.log('This is expected if the test user doesn\'t exist')
      console.log('Let\'s try with service role key instead...\n')

      // Try with service role key
      const adminClient = createClient(supabaseUrl, serviceRoleKey)

      console.log('🔧 Testing organization creation with admin client...')

      const { data, error } = await adminClient
        .from('organizations')
        .insert({
          name: 'Test Organization',
          slug: 'test-organization'
        })
        .select()
        .single()

      if (error) {
        console.error('❌ Organization creation failed:', error)
      } else {
        console.log('✅ Organization created successfully:', data)
      }
    } else {
      console.log('✅ Authentication successful')
      console.log('User ID:', authData.user.id)

      console.log('🏗️  Testing organization creation...')

      const { data, error } = await supabase
        .from('organizations')
        .insert({
          name: 'Test Organization',
          slug: 'test-organization'
        })
        .select()
        .single()

      if (error) {
        console.error('❌ Organization creation failed:', error)
        console.error('This might be due to RLS policies')
      } else {
        console.log('✅ Organization created successfully:', data)
      }
    }

  } catch (error) {
    console.error('\n❌ Test failed:')
    console.error(error.message)
  }
}

// Run the test
testOrganizationCreation()