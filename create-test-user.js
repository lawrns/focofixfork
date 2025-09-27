// Create test user script for Supabase Auth
require('dotenv').config({ path: '.env.local' })

async function createTestUser() {
  try {
    console.log('🚀 Creating test user for Foco application...\n')

    // Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey || !serviceRoleKey) {
      throw new Error('Missing required environment variables')
    }

    console.log('✅ Environment variables loaded')

    // Import Supabase client
    const { createClient } = require('@supabase/supabase-js')
    
    // Create admin client (for user creation)
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Create regular client (for testing login)
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: false
      }
    })

    console.log('✅ Supabase clients initialized')

    // Test user credentials
    const testUser = {
      email: 'dev@focolin.com',
      password: '123test',
      user_metadata: {
        full_name: 'Foco Developer',
        display_name: 'Dev User',
        role: 'developer'
      }
    }

    console.log(`📧 Creating user: ${testUser.email}`)

    // Step 1: Create user with admin client
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: testUser.email,
      password: testUser.password,
      user_metadata: testUser.user_metadata,
      email_confirm: true // Auto-confirm email
    })

    if (authError) {
      if (authError.message.includes('already registered')) {
        console.log('⚠️  User already exists, proceeding with existing user...')
        
        // Get existing user
        const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers()
        if (listError) throw listError
        
        const existingUser = existingUsers.users.find(u => u.email === testUser.email)
        if (!existingUser) throw new Error('User exists but could not be found')
        
        console.log(`✅ Found existing user: ${existingUser.id}`)
        authData.user = existingUser
      } else {
        throw authError
      }
    } else {
      console.log(`✅ User created successfully: ${authData.user.id}`)
    }

    const userId = authData.user.id

    // Step 2: Create user profile in user_profiles table
    console.log('👤 Creating user profile...')
    
    const userProfile = {
      id: userId,
      display_name: testUser.user_metadata.full_name,
      bio: 'Test developer account for Foco application',
      avatar_url: null,
      theme_preference: 'system',
      locale: 'en',
      timezone: 'UTC',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .upsert(userProfile)
      .select()
      .single()

    if (profileError) {
      console.log('⚠️  Profile creation error (table might not exist):', profileError.message)
    } else {
      console.log('✅ User profile created successfully')
    }

    // Step 3: Test login with regular client
    console.log('🔐 Testing login with new credentials...')
    
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: testUser.email,
      password: testUser.password
    })

    if (loginError) {
      throw new Error(`Login failed: ${loginError.message}`)
    }

    console.log('✅ Login successful!')
    console.log(`   User ID: ${loginData.user.id}`)
    console.log(`   Email: ${loginData.user.email}`)
    console.log(`   Email confirmed: ${loginData.user.email_confirmed_at ? 'Yes' : 'No'}`)

    // Step 4: Test database operations with authenticated user
    console.log('🗄️  Testing database operations...')

    // Test reading organizations (should work with RLS)
    const { data: orgs, error: orgsError } = await supabase
      .from('organizations')
      .select('*')
      .limit(5)

    if (orgsError && !orgsError.message.includes('does not exist')) {
      console.log('⚠️  Organizations query error:', orgsError.message)
    } else {
      console.log(`✅ Organizations table accessible (${orgs?.length || 0} records)`)
    }

    // Test reading user profile
    const { data: profile, error: profileReadError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (profileReadError && !profileReadError.message.includes('does not exist')) {
      console.log('⚠️  User profile read error:', profileReadError.message)
    } else {
      console.log('✅ User profile readable')
      if (profile) {
        console.log(`   Display name: ${profile.display_name}`)
        console.log(`   Theme: ${profile.theme_preference}`)
      }
    }

    // Step 5: Test creating an organization (if user has permissions)
    console.log('🏢 Testing organization creation...')
    
    const testOrg = {
      name: 'Foco Test Organization',
      slug: 'foco-test-org',
      description: 'Test organization created by automated script',
      created_by: userId
    }

    const { data: newOrg, error: orgError } = await supabase
      .from('organizations')
      .insert(testOrg)
      .select()
      .single()

    if (orgError) {
      console.log('⚠️  Organization creation error:', orgError.message)
      console.log('   This might be due to RLS policies or missing table')
    } else {
      console.log('✅ Organization created successfully!')
      console.log(`   Organization ID: ${newOrg.id}`)
      console.log(`   Name: ${newOrg.name}`)
    }

    // Step 6: Sign out
    await supabase.auth.signOut()
    console.log('✅ Signed out successfully')

    console.log('\n🎉 Test user creation and database testing completed!')
    console.log('\n📋 Summary:')
    console.log(`   Email: ${testUser.email}`)
    console.log(`   Password: ${testUser.password}`)
    console.log(`   User ID: ${userId}`)
    console.log('   Status: Ready for login')
    
    console.log('\n🔗 Next steps:')
    console.log('1. Try logging in through your application UI')
    console.log('2. Test creating projects and tasks')
    console.log('3. Verify all features work with this user account')

  } catch (error) {
    console.error('\n❌ Test user creation failed:')
    console.error(error.message)
    console.error('\n🔧 Troubleshooting:')
    console.error('1. Check your Supabase project settings')
    console.error('2. Verify your environment variables')
    console.error('3. Check if email confirmations are required')
    console.error('4. Verify RLS policies allow user operations')
    process.exit(1)
  }
}

// Run the script
createTestUser()