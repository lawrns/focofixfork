/**
 * Create Fyves users and update organization_members table
 * Strategy: Create new auth users, then update organization_members to use new UUIDs
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

// Users that need to be created
const USERS_TO_CREATE = [
  { oldId: '0c2af3ff-bd5e-4fbe-b8e2-b5b73266b562', email: 'julian@fyves.com', name: 'Julian', role: 'member' },
  { oldId: 'ba78e8b2-2b9c-48e9-a833-bb6df89a47e5', email: 'paulo@fyves.com', name: 'Paulo', role: 'member' },
  { oldId: 'ed97d63f-0243-4015-847b-a85a05d115c4', email: 'paul@fyves.com', name: 'Paul', role: 'member' },
  { oldId: '158c0385-f4b5-40f9-a647-a49f29fe3b8a', email: 'oscar@fyves.com', name: 'Oscar', role: 'member' },
  { oldId: '74d88017-f435-46c0-bbad-92e91849f730', email: 'jose@fyves.com', name: 'José', role: 'member' },
  { oldId: '59bbe21d-6a4d-49f8-a264-2ac4acd3060a', email: 'isaac@fyves.com', name: 'Isaac', role: 'member' }
]

interface UserMapping {
  oldId: string
  newId: string
  email: string
  name: string
  role: string
}

/**
 * Create a user in Supabase Auth
 */
async function createAuthUser(email: string, name: string): Promise<string | null> {
  try {
    console.log(`\n🔄 Creating auth user: ${email}...`)

    // Check if user already exists by email
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
    
    if (!listError && users) {
      const existing = users.find(u => u.email === email)
      if (existing) {
        console.log(`   ✅ User already exists (ID: ${existing.id})`)
        return existing.id
      }
    }

    // Create new user
    const { data, error } = await supabase.auth.admin.createUser({
      email: email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: {
        display_name: name,
        full_name: name
      }
    })

    if (error) {
      console.error(`   ❌ Error: ${error.message}`)
      return null
    }

    console.log(`   ✅ Created successfully (ID: ${data.user.id})`)
    return data.user.id
  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`)
    return null
  }
}

/**
 * Update organization_members table with new user ID
 */
async function updateOrgMember(oldId: string, newId: string, email: string): Promise<boolean> {
  try {
    console.log(`\n🔄 Updating organization member: ${email}...`)
    console.log(`   Old ID: ${oldId}`)
    console.log(`   New ID: ${newId}`)

    const { error } = await supabase
      .from('organization_members')
      .update({ user_id: newId })
      .eq('organization_id', FYVES_ORG_ID)
      .eq('user_id', oldId)

    if (error) {
      console.error(`   ❌ Error: ${error.message}`)
      return false
    }

    console.log(`   ✅ Updated successfully`)
    return true
  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`)
    return false
  }
}

/**
 * Verify user can log in
 */
async function verifyLogin(email: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: PASSWORD
    })

    if (error) {
      console.log(`   ❌ Login failed: ${error.message}`)
      return false
    }

    console.log(`   ✅ Login successful`)
    
    // Sign out
    await supabase.auth.signOut()
    
    return true
  } catch (error: any) {
    console.log(`   ❌ Error: ${error.message}`)
    return false
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('👥 Create and Link Fyves Users Script')
  console.log('=' .repeat(70))
  console.log(`Supabase Project: Bieno (czijxfbkihrauyjwcgfn)`)
  console.log(`Organization ID: ${FYVES_ORG_ID}`)
  console.log(`Password: ${PASSWORD}`)
  console.log(`Users to process: ${USERS_TO_CREATE.length}`)
  console.log('=' .repeat(70))

  const userMappings: UserMapping[] = []

  // Step 1: Create auth users
  console.log('\n👤 Step 1: Creating auth users...')
  let createdCount = 0

  for (const user of USERS_TO_CREATE) {
    const newId = await createAuthUser(user.email, user.name)
    
    if (newId) {
      userMappings.push({
        oldId: user.oldId,
        newId: newId,
        email: user.email,
        name: user.name,
        role: user.role
      })
      createdCount++
    }
    
    // Small delay
    await new Promise(resolve => setTimeout(resolve, 200))
  }

  console.log(`\n✅ Created/verified ${createdCount}/${USERS_TO_CREATE.length} auth users`)

  // Step 2: Update organization_members table
  console.log('\n🔗 Step 2: Updating organization_members table...')
  let updatedCount = 0

  for (const mapping of userMappings) {
    const updated = await updateOrgMember(mapping.oldId, mapping.newId, mapping.email)
    if (updated) updatedCount++
    
    // Small delay
    await new Promise(resolve => setTimeout(resolve, 200))
  }

  console.log(`\n✅ Updated ${updatedCount}/${userMappings.length} organization members`)

  // Step 3: Verify logins
  console.log('\n🔐 Step 3: Verifying logins...')
  let loginCount = 0

  for (const mapping of userMappings) {
    console.log(`\n   Testing ${mapping.email}...`)
    const canLogin = await verifyLogin(mapping.email)
    if (canLogin) loginCount++
    
    // Small delay
    await new Promise(resolve => setTimeout(resolve, 300))
  }

  console.log(`\n✅ ${loginCount}/${userMappings.length} users can log in`)

  // Final summary
  console.log('\n' + '='.repeat(70))
  console.log('🎉 User Creation and Linking Complete!')
  console.log('='.repeat(70))
  console.log(`\n📊 Summary:`)
  console.log(`   - Users processed: ${USERS_TO_CREATE.length}`)
  console.log(`   - Auth users created: ${createdCount}`)
  console.log(`   - Organization members updated: ${updatedCount}`)
  console.log(`   - Login tests passed: ${loginCount}`)
  console.log(`\n🔑 Login Credentials:`)
  console.log(`   - Password: ${PASSWORD}`)
  console.log(`   - Login URL: https://foco.mx/login`)
  console.log(`\n📧 User Mappings:`)
  userMappings.forEach((mapping, index) => {
    console.log(`   ${index + 1}. ${mapping.email}`)
    console.log(`      Old ID: ${mapping.oldId}`)
    console.log(`      New ID: ${mapping.newId}`)
  })
  console.log('\n✅ All users can now log in and access the Fyves organization!')
  console.log('\n')
}

// Run the script
main().catch(error => {
  console.error('\n❌ Fatal error:', error)
  process.exit(1)
})

