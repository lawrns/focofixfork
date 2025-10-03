/**
 * Script to manage Fyves organization users
 * - Finds all users with @fyves.com email addresses
 * - Resets their passwords to a standardized password
 * - Ensures they are members of the Fyves organization
 * - Verifies organization membership
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
const FYVES_ORG_NAME = 'Fyves'
const NEW_PASSWORD = 'Hennie@@18'

interface FyvesUser {
  id: string
  email: string
  created_at: string
}

interface Organization {
  id: string
  name: string
}

/**
 * Step 1: Find all users with @fyves.com email addresses
 * Uses direct database query to get all users including those not returned by listUsers()
 */
async function findFyvesUsers(): Promise<FyvesUser[]> {
  console.log('\n📋 Step 1: Finding all @fyves.com users...\n')

  try {
    // Query auth.users table directly for all @fyves.com emails
    const { data: users, error } = await supabase.rpc('get_fyves_users', {})

    if (error) {
      // Fallback to admin API if RPC doesn't exist
      console.log('   ℹ️  Using admin API fallback...')
      const { data: { users: adminUsers }, error: adminError } = await supabase.auth.admin.listUsers()

      if (adminError) {
        console.error('❌ Error fetching users:', adminError.message)
        return []
      }

      // Filter for @fyves.com emails
      const fyvesUsers = adminUsers
        .filter(user => user.email?.endsWith('@fyves.com'))
        .map(user => ({
          id: user.id,
          email: user.email!,
          created_at: user.created_at
        }))

      console.log(`✅ Found ${fyvesUsers.length} users with @fyves.com email addresses:\n`)
      fyvesUsers.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.email} (ID: ${user.id})`)
      })

      return fyvesUsers
    }

    console.log(`✅ Found ${users.length} users with @fyves.com email addresses:\n`)
    users.forEach((user: any, index: number) => {
      console.log(`   ${index + 1}. ${user.email} (ID: ${user.id})`)
    })

    return users
  } catch (error: any) {
    console.error('❌ Error finding Fyves users:', error.message)
    return []
  }
}

/**
 * Step 2: Reset password for a user
 */
async function resetUserPassword(userId: string, email: string): Promise<boolean> {
  try {
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      password: NEW_PASSWORD
    })

    if (error) {
      console.error(`   ❌ Error resetting password for ${email}:`, error.message)
      return false
    }

    console.log(`   ✅ Password reset for ${email}`)
    return true
  } catch (error: any) {
    console.error(`   ❌ Error resetting password for ${email}:`, error.message)
    return false
  }
}

/**
 * Step 3: Find or create Fyves organization
 */
async function findOrCreateFyvesOrganization(): Promise<string | null> {
  console.log('\n🏢 Step 3: Finding or creating Fyves organization...\n')

  try {
    // Check if Fyves organization exists
    const { data: existingOrgs, error: fetchError } = await supabase
      .from('organizations')
      .select('id, name')
      .ilike('name', FYVES_ORG_NAME)
      .limit(1)

    if (fetchError) {
      console.error('❌ Error fetching organizations:', fetchError.message)
      return null
    }

    if (existingOrgs && existingOrgs.length > 0) {
      console.log(`✅ Fyves organization already exists (ID: ${existingOrgs[0].id})`)
      return existingOrgs[0].id
    }

    // Create Fyves organization
    console.log('📝 Creating Fyves organization...')

    // Get the first @fyves.com user to be the creator
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers()
    
    if (usersError || !users || users.length === 0) {
      console.error('❌ No users found to create organization')
      return null
    }

    const fyvesUser = users.find(u => u.email?.endsWith('@fyves.com'))
    
    if (!fyvesUser) {
      console.error('❌ No @fyves.com user found to create organization')
      return null
    }

    const { data: newOrg, error: createError } = await supabase
      .from('organizations')
      .insert({
        name: FYVES_ORG_NAME,
        created_by: fyvesUser.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (createError) {
      console.error('❌ Error creating organization:', createError.message)
      return null
    }

    console.log(`✅ Fyves organization created (ID: ${newOrg.id})`)
    return newOrg.id
  } catch (error: any) {
    console.error('❌ Error with Fyves organization:', error.message)
    return null
  }
}

/**
 * Step 4: Add user to Fyves organization
 */
async function addUserToOrganization(userId: string, email: string, orgId: string): Promise<boolean> {
  try {
    // Check if already a member
    const { data: existingMember } = await supabase
      .from('organization_members')
      .select('id, role')
      .eq('organization_id', orgId)
      .eq('user_id', userId)
      .single()

    if (existingMember) {
      console.log(`   ✅ ${email} is already a member (role: ${existingMember.role})`)
      return true
    }

    // Add as member
    const { error } = await supabase
      .from('organization_members')
      .insert({
        organization_id: orgId,
        user_id: userId,
        role: 'member',
        created_at: new Date().toISOString()
      })

    if (error) {
      console.error(`   ❌ Error adding ${email} to organization:`, error.message)
      return false
    }

    console.log(`   ✅ ${email} added to Fyves organization as member`)
    return true
  } catch (error: any) {
    console.error(`   ❌ Error adding ${email} to organization:`, error.message)
    return false
  }
}

/**
 * Step 5: Verify organization membership
 */
async function verifyOrganizationMembership(orgId: string): Promise<void> {
  console.log('\n✅ Step 5: Verifying organization membership...\n')

  try {
    const { data: members, error } = await supabase
      .from('organization_members')
      .select(`
        id,
        role,
        user_id,
        created_at
      `)
      .eq('organization_id', orgId)

    if (error) {
      console.error('❌ Error fetching organization members:', error.message)
      return
    }

    if (!members || members.length === 0) {
      console.log('⚠️  No members found in Fyves organization')
      return
    }

    console.log(`✅ Fyves organization has ${members.length} members:\n`)

    // Get user emails for each member
    for (const member of members) {
      const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(member.user_id)
      
      if (userError || !user) {
        console.log(`   - User ID: ${member.user_id} (role: ${member.role}) - Email not found`)
      } else {
        console.log(`   - ${user.email} (role: ${member.role})`)
      }
    }
  } catch (error: any) {
    console.error('❌ Error verifying membership:', error.message)
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log('🚀 Fyves User Management Script')
  console.log('=' .repeat(60))
  console.log(`Supabase URL: ${supabaseUrl}`)
  console.log(`New Password: ${NEW_PASSWORD}`)
  console.log('=' .repeat(60))

  // Step 1: Find all @fyves.com users
  const fyvesUsers = await findFyvesUsers()

  if (fyvesUsers.length === 0) {
    console.log('\n⚠️  No @fyves.com users found. Exiting.')
    return
  }

  // Step 2: Reset passwords
  console.log('\n🔐 Step 2: Resetting passwords...\n')
  let passwordResetCount = 0

  for (const user of fyvesUsers) {
    const success = await resetUserPassword(user.id, user.email)
    if (success) passwordResetCount++
  }

  console.log(`\n✅ Reset ${passwordResetCount}/${fyvesUsers.length} passwords`)

  // Step 3: Find or create Fyves organization
  const orgId = await findOrCreateFyvesOrganization()

  if (!orgId) {
    console.log('\n❌ Could not find or create Fyves organization. Exiting.')
    return
  }

  // Step 4: Add users to organization
  console.log('\n👥 Step 4: Adding users to Fyves organization...\n')
  let membershipCount = 0

  for (const user of fyvesUsers) {
    const success = await addUserToOrganization(user.id, user.email, orgId)
    if (success) membershipCount++
  }

  console.log(`\n✅ Added ${membershipCount}/${fyvesUsers.length} users to organization`)

  // Step 5: Verify organization membership
  await verifyOrganizationMembership(orgId)

  // Final summary
  console.log('\n' + '='.repeat(60))
  console.log('🎉 Fyves User Management Complete!')
  console.log('='.repeat(60))
  console.log(`\n📊 Summary:`)
  console.log(`   - Users found: ${fyvesUsers.length}`)
  console.log(`   - Passwords reset: ${passwordResetCount}`)
  console.log(`   - Organization members: ${membershipCount}`)
  console.log(`   - Organization ID: ${orgId}`)
  console.log(`\n🔑 Login Credentials:`)
  console.log(`   - Password: ${NEW_PASSWORD}`)
  console.log(`   - Login URL: https://foco.mx/login`)
  console.log(`\n📧 Users:`)
  fyvesUsers.forEach(user => console.log(`   - ${user.email}`))
  console.log('\n')
}

// Run the script
main().catch(error => {
  console.error('\n❌ Fatal error:', error)
  process.exit(1)
})

