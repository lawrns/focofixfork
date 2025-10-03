/**
 * Direct database script to reset passwords for all Fyves organization members
 * Uses Supabase Admin API to directly update user passwords
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
const NEW_PASSWORD = 'Hennie@@18'

// Known Fyves users from the database query
const FYVES_USERS = [
  { id: '0c2af3ff-bd5e-4fbe-b8e2-b5b73266b562', email: 'julian@fyves.com', role: 'member' },
  { id: 'ba78e8b2-2b9c-48e9-a833-bb6df89a47e5', email: 'paulo@fyves.com', role: 'member' },
  { id: 'ed97d63f-0243-4015-847b-a85a05d115c4', email: 'paul@fyves.com', role: 'member' },
  { id: '158c0385-f4b5-40f9-a647-a49f29fe3b8a', email: 'oscar@fyves.com', role: 'member' },
  { id: '74d88017-f435-46c0-bbad-92e91849f730', email: 'jose@fyves.com', role: 'member' },
  { id: '59bbe21d-6a4d-49f8-a264-2ac4acd3060a', email: 'isaac@fyves.com', role: 'member' },
  { id: 'e15af19f-3e2b-4017-8b34-11a84e0898e6', email: 'laurence@fyves.com', role: 'owner' }
]

/**
 * Reset password for a user using Supabase Admin API
 */
async function resetPassword(userId: string, email: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.auth.admin.updateUserById(userId, {
      password: NEW_PASSWORD
    })

    if (error) {
      console.error(`   ❌ ${email}: ${error.message}`)
      return false
    }

    console.log(`   ✅ ${email} - Password reset successful`)
    return true
  } catch (error: any) {
    console.error(`   ❌ ${email}: ${error.message}`)
    return false
  }
}

/**
 * Verify user exists in auth.users
 */
async function verifyUser(userId: string, email: string): Promise<boolean> {
  try {
    const { data: { user }, error } = await supabase.auth.admin.getUserById(userId)

    if (error || !user) {
      console.log(`   ⚠️  ${email}: User not found in auth.users`)
      return false
    }

    console.log(`   ✅ ${email}: User verified (created: ${user.created_at})`)
    return true
  } catch (error: any) {
    console.log(`   ❌ ${email}: ${error.message}`)
    return false
  }
}

/**
 * Verify organization membership
 */
async function verifyOrgMembership(): Promise<void> {
  console.log('\n📋 Verifying organization membership...\n')

  try {
    const { data: members, error } = await supabase
      .from('organization_members')
      .select('user_id, role, created_at')
      .eq('organization_id', FYVES_ORG_ID)
      .order('created_at')

    if (error) {
      console.error('❌ Error fetching members:', error.message)
      return
    }

    console.log(`✅ Fyves organization has ${members.length} members:\n`)

    for (const member of members) {
      const user = FYVES_USERS.find(u => u.id === member.user_id)
      if (user) {
        console.log(`   ✅ ${user.email} (${member.role})`)
      } else {
        console.log(`   ⚠️  Unknown user: ${member.user_id} (${member.role})`)
      }
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message)
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🔐 Fyves Password Reset Script (Direct Database Access)')
  console.log('=' .repeat(70))
  console.log(`Supabase Project: Bieno (czijxfbkihrauyjwcgfn)`)
  console.log(`Organization ID: ${FYVES_ORG_ID}`)
  console.log(`New Password: ${NEW_PASSWORD}`)
  console.log(`Total Users: ${FYVES_USERS.length}`)
  console.log('=' .repeat(70))

  // Step 1: Verify all users exist
  console.log('\n📋 Step 1: Verifying users in auth.users...\n')
  let verifiedCount = 0

  for (const user of FYVES_USERS) {
    const verified = await verifyUser(user.id, user.email)
    if (verified) verifiedCount++
  }

  console.log(`\n✅ Verified ${verifiedCount}/${FYVES_USERS.length} users`)

  // Step 2: Reset passwords
  console.log('\n🔐 Step 2: Resetting passwords...\n')
  let successCount = 0

  for (const user of FYVES_USERS) {
    const success = await resetPassword(user.id, user.email)
    if (success) successCount++
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  console.log(`\n✅ Reset ${successCount}/${FYVES_USERS.length} passwords`)

  // Step 3: Verify organization membership
  await verifyOrgMembership()

  // Final summary
  console.log('\n' + '='.repeat(70))
  console.log('🎉 Fyves Password Reset Complete!')
  console.log('='.repeat(70))
  console.log(`\n📊 Summary:`)
  console.log(`   - Total users: ${FYVES_USERS.length}`)
  console.log(`   - Users verified: ${verifiedCount}`)
  console.log(`   - Passwords reset: ${successCount}`)
  console.log(`   - Failed: ${FYVES_USERS.length - successCount}`)
  console.log(`\n🔑 Login Credentials for ALL Fyves users:`)
  console.log(`   - Password: ${NEW_PASSWORD}`)
  console.log(`   - Login URL: https://foco.mx/login`)
  console.log(`\n📧 Fyves Users:`)
  FYVES_USERS.forEach((user, index) => {
    console.log(`   ${index + 1}. ${user.email} (${user.role})`)
  })
  console.log('\n✅ All users can now log in with the standardized password!')
  console.log('\n')
}

// Run the script
main().catch(error => {
  console.error('\n❌ Fatal error:', error)
  process.exit(1)
})

