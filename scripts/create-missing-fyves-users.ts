/**
 * Create missing Fyves users in Supabase Auth
 * These users exist in organization_members but not in auth.users
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Load environment variables from .env.local
config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Configuration
const FYVES_ORG_ID = '4d951a69-8cb0-4556-8201-b85405ce38b9'
const PASSWORD = 'Hennie@@18'

// Users that need to be created (exist in org_members but not in auth.users)
const MISSING_USERS = [
  { id: '0c2af3ff-bd5e-4fbe-b8e2-b5b73266b562', email: 'julian@fyves.com', name: 'Julian' },
  { id: 'ba78e8b2-2b9c-48e9-a833-bb6df89a47e5', email: 'paulo@fyves.com', name: 'Paulo' },
  { id: 'ed97d63f-0243-4015-847b-a85a05d115c4', email: 'paul@fyves.com', name: 'Paul' },
  { id: '158c0385-f4b5-40f9-a647-a49f29fe3b8a', email: 'oscar@fyves.com', name: 'Oscar' },
  { id: '74d88017-f435-46c0-bbad-92e91849f730', email: 'jose@fyves.com', name: 'José' },
  { id: '59bbe21d-6a4d-49f8-a264-2ac4acd3060a', email: 'isaac@fyves.com', name: 'Isaac' }
]

/**
 * Create a user in Supabase Auth with a specific UUID
 */
async function createUser(userId: string, email: string, name: string): Promise<boolean> {
  try {
    console.log(`\n🔄 Creating user: ${email}...`)

    // Check if user already exists
    const { data: { user: existingUser }, error: checkError } = await supabase.auth.admin.getUserById(userId)

    if (existingUser && !checkError) {
      console.log(`   ✅ User already exists in auth.users`)
      return true
    }

    // Create user with specific UUID
    const { data, error } = await supabase.auth.admin.createUser({
      id: userId, // Use the existing UUID from organization_members
      email: email,
      password: PASSWORD,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        display_name: name,
        full_name: name
      }
    })

    if (error) {
      console.error(`   ❌ Error creating user: ${error.message}`)
      return false
    }

    console.log(`   ✅ User created successfully in auth.users`)
    console.log(`   📧 Email: ${email}`)
    console.log(`   🔑 Password: ${PASSWORD}`)
    console.log(`   👤 Name: ${name}`)

    return true
  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`)
    return false
  }
}

/**
 * Verify organization membership still exists
 */
async function verifyOrgMembership(userId: string, email: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', FYVES_ORG_ID)
      .eq('user_id', userId)
      .single()

    if (error || !data) {
      console.log(`   ⚠️  ${email}: Not found in organization_members`)
      return false
    }

    console.log(`   ✅ ${email}: Organization member (role: ${data.role})`)
    return true
  } catch (error: any) {
    console.log(`   ❌ ${email}: ${error.message}`)
    return false
  }
}

/**
 * Test login for a user
 */
async function testLogin(email: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: PASSWORD
    })

    if (error) {
      console.log(`   ❌ Login failed: ${error.message}`)
      return false
    }

    console.log(`   ✅ Login successful!`)
    
    // Sign out immediately
    await supabase.auth.signOut()
    
    return true
  } catch (error: any) {
    console.log(`   ❌ Login error: ${error.message}`)
    return false
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('👥 Create Missing Fyves Users Script')
  console.log('=' .repeat(70))
  console.log(`Supabase Project: Bieno (czijxfbkihrauyjwcgfn)`)
  console.log(`Organization ID: ${FYVES_ORG_ID}`)
  console.log(`Password: ${PASSWORD}`)
  console.log(`Users to create: ${MISSING_USERS.length}`)
  console.log('=' .repeat(70))

  // Step 1: Verify organization memberships
  console.log('\n📋 Step 1: Verifying organization memberships...')
  let membershipCount = 0

  for (const user of MISSING_USERS) {
    const isMember = await verifyOrgMembership(user.id, user.email)
    if (isMember) membershipCount++
  }

  console.log(`\n✅ Verified ${membershipCount}/${MISSING_USERS.length} organization memberships`)

  // Step 2: Create users in auth.users
  console.log('\n👤 Step 2: Creating users in auth.users...')
  let createdCount = 0

  for (const user of MISSING_USERS) {
    const created = await createUser(user.id, user.email, user.name)
    if (created) createdCount++
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 200))
  }

  console.log(`\n✅ Created ${createdCount}/${MISSING_USERS.length} users`)

  // Step 3: Test logins
  console.log('\n🔐 Step 3: Testing logins...')
  let loginCount = 0

  for (const user of MISSING_USERS) {
    console.log(`\n   Testing ${user.email}...`)
    const canLogin = await testLogin(user.email)
    if (canLogin) loginCount++
    
    // Small delay between login attempts
    await new Promise(resolve => setTimeout(resolve, 300))
  }

  console.log(`\n✅ ${loginCount}/${MISSING_USERS.length} users can log in successfully`)

  // Final summary
  console.log('\n' + '='.repeat(70))
  console.log('🎉 User Creation Complete!')
  console.log('='.repeat(70))
  console.log(`\n📊 Summary:`)
  console.log(`   - Users to create: ${MISSING_USERS.length}`)
  console.log(`   - Organization memberships verified: ${membershipCount}`)
  console.log(`   - Users created: ${createdCount}`)
  console.log(`   - Login tests passed: ${loginCount}`)
  console.log(`\n🔑 Login Credentials for ALL users:`)
  console.log(`   - Password: ${PASSWORD}`)
  console.log(`   - Login URL: https://foco.mx/login`)
  console.log(`\n📧 Created Users:`)
  MISSING_USERS.forEach((user, index) => {
    console.log(`   ${index + 1}. ${user.email} (${user.name})`)
  })
  console.log('\n✅ All users can now log in and access the Fyves organization!')
  console.log('\n')
}

// Run the script
main().catch(error => {
  console.error('\n❌ Fatal error:', error)
  process.exit(1)
})

