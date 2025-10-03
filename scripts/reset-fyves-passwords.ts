/**
 * Script to reset passwords for all Fyves organization members
 * Queries the organization_members table and resets passwords for all members
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

interface OrgMember {
  user_id: string
  email: string
  role: string
}

/**
 * Get all Fyves organization members with their emails
 */
async function getFyvesMembers(): Promise<OrgMember[]> {
  console.log('\n📋 Fetching Fyves organization members...\n')

  try {
    // Query organization members with email from auth.users
    const { data, error } = await supabase.rpc('exec_sql', {
      query: `
        SELECT 
          om.user_id,
          om.role,
          au.email
        FROM organization_members om
        LEFT JOIN auth.users au ON om.user_id = au.id
        WHERE om.organization_id = '${FYVES_ORG_ID}'
        ORDER BY om.created_at
      `
    })

    if (error) {
      console.error('❌ Error fetching members:', error.message)
      console.log('   ℹ️  Trying alternative method...')
      
      // Alternative: Get members and then fetch emails individually
      const { data: members, error: membersError } = await supabase
        .from('organization_members')
        .select('user_id, role')
        .eq('organization_id', FYVES_ORG_ID)

      if (membersError) {
        console.error('❌ Error fetching members:', membersError.message)
        return []
      }

      // Fetch emails for each member
      const membersWithEmails: OrgMember[] = []
      for (const member of members) {
        const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(member.user_id)
        
        if (!userError && user && user.email) {
          membersWithEmails.push({
            user_id: member.user_id,
            email: user.email,
            role: member.role
          })
        }
      }

      console.log(`✅ Found ${membersWithEmails.length} members:\n`)
      membersWithEmails.forEach((member, index) => {
        console.log(`   ${index + 1}. ${member.email} (role: ${member.role})`)
      })

      return membersWithEmails
    }

    console.log(`✅ Found ${data.length} members:\n`)
    data.forEach((member: any, index: number) => {
      console.log(`   ${index + 1}. ${member.email} (role: ${member.role})`)
    })

    return data
  } catch (error: any) {
    console.error('❌ Error:', error.message)
    return []
  }
}

/**
 * Reset password for a user
 */
async function resetPassword(userId: string, email: string): Promise<boolean> {
  try {
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      password: NEW_PASSWORD
    })

    if (error) {
      console.error(`   ❌ ${email}: ${error.message}`)
      return false
    }

    console.log(`   ✅ ${email}`)
    return true
  } catch (error: any) {
    console.error(`   ❌ ${email}: ${error.message}`)
    return false
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🔐 Fyves Password Reset Script')
  console.log('=' .repeat(60))
  console.log(`Organization ID: ${FYVES_ORG_ID}`)
  console.log(`New Password: ${NEW_PASSWORD}`)
  console.log('=' .repeat(60))

  // Get all Fyves members
  const members = await getFyvesMembers()

  if (members.length === 0) {
    console.log('\n⚠️  No members found. Exiting.')
    return
  }

  // Reset passwords
  console.log('\n🔄 Resetting passwords...\n')
  let successCount = 0

  for (const member of members) {
    const success = await resetPassword(member.user_id, member.email)
    if (success) successCount++
  }

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('🎉 Password Reset Complete!')
  console.log('='.repeat(60))
  console.log(`\n📊 Summary:`)
  console.log(`   - Total members: ${members.length}`)
  console.log(`   - Passwords reset: ${successCount}`)
  console.log(`   - Failed: ${members.length - successCount}`)
  console.log(`\n🔑 Login Credentials:`)
  console.log(`   - Password: ${NEW_PASSWORD}`)
  console.log(`   - Login URL: https://foco.mx/login`)
  console.log(`\n📧 Users:`)
  members.forEach(member => {
    const status = member.email ? '✅' : '❌'
    console.log(`   ${status} ${member.email || 'Unknown'} (${member.role})`)
  })
  console.log('\n')
}

// Run the script
main().catch(error => {
  console.error('\n❌ Fatal error:', error)
  process.exit(1)
})

