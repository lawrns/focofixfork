/**
 * Script to create Fyves organization members
 * Creates users and adds them to the organization with 'member' role
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Load environment variables from .env.local
config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const FYVES_ORG_ID = '4d951a69-8cb0-4556-8201-b85405ce38b9'
const PASSWORD = 'Hennie@@12'

const newMembers = [
  { email: 'isaac@fyves.com', name: 'Isaac' },
  { email: 'oscar@fyves.com', name: 'Oscar' },
  { email: 'jose@fyves.com', name: 'José' }
]

async function createMember(email: string, displayName: string) {
  console.log(`\n🔄 Creating account for ${email}...`)

  try {
    // Check if user already exists by checking auth.users table via admin API
    const { data: existingUser, error: checkError } = await supabase.auth.admin.getUserByEmail(email)

    if (existingUser && existingUser.user) {
      console.log(`✅ User ${email} already exists with ID: ${existingUser.user.id}`)
      return existingUser.user.id
    }

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        display_name: displayName
      }
    })

    if (authError) {
      console.error(`❌ Auth error for ${email}:`, authError.message)
      return null
    }

    console.log(`✅ Auth user created: ${authData.user.id}`)

    // Create user profile (without email column since it's stored in auth.users)
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: authData.user.id,
        user_id: authData.user.id,
        bio: `Member of Fyves organization`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (profileError) {
      console.error(`❌ Profile error for ${email}:`, profileError.message)
      return null
    }

    console.log(`✅ User profile created for ${email}`)
    return authData.user.id

  } catch (error: any) {
    console.error(`❌ Error creating ${email}:`, error.message)
    return null
  }
}

async function addToOrganization(userId: string, email: string) {
  console.log(`\n🔄 Adding ${email} to Fyves organization...`)

  try {
    // Check if already a member
    const { data: existingMember } = await supabase
      .from('organization_members')
      .select('id, role')
      .eq('organization_id', FYVES_ORG_ID)
      .eq('user_id', userId)
      .single()

    if (existingMember) {
      console.log(`✅ ${email} is already a member with role: ${existingMember.role}`)
      return true
    }

    // Add as member
    const { error } = await supabase
      .from('organization_members')
      .insert({
        organization_id: FYVES_ORG_ID,
        user_id: userId,
        role: 'member',
        is_active: true,
        joined_at: new Date().toISOString()
      })

    if (error) {
      console.error(`❌ Error adding ${email} to organization:`, error.message)
      return false
    }

    console.log(`✅ ${email} added to Fyves organization as member`)
    return true

  } catch (error: any) {
    console.error(`❌ Error adding ${email} to org:`, error.message)
    return false
  }
}

async function sendWelcomeEmail(email: string, name: string) {
  console.log(`\n📧 Sending welcome email to ${email}...`)

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://foco.mx'}/api/send-welcome`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        name,
        password: PASSWORD,
        organization: 'Fyves'
      })
    })

    if (response.ok) {
      console.log(`✅ Welcome email sent to ${email}`)
      return true
    } else {
      console.log(`⚠️  Email API returned ${response.status} - email may not have sent`)
      return false
    }
  } catch (error: any) {
    console.log(`⚠️  Could not send email to ${email}: ${error.message}`)
    console.log(`   Manual email needed with credentials:`)
    console.log(`   Email: ${email}`)
    console.log(`   Password: ${PASSWORD}`)
    console.log(`   Login: https://foco.mx/login`)
    return false
  }
}

async function main() {
  console.log('🚀 Creating Fyves organization members...\n')
  console.log(`Organization ID: ${FYVES_ORG_ID}`)
  console.log(`Members to create: ${newMembers.length}\n`)

  for (const member of newMembers) {
    console.log(`\n${'='.repeat(60)}`)
    console.log(`Processing: ${member.name} (${member.email})`)
    console.log('='.repeat(60))

    // Create user account
    const userId = await createMember(member.email, member.name)

    if (!userId) {
      console.log(`❌ Failed to create account for ${member.email}`)
      continue
    }

    // Add to organization
    const added = await addToOrganization(userId, member.email)

    if (!added) {
      console.log(`❌ Failed to add ${member.email} to organization`)
      continue
    }

    // Send welcome email
    await sendWelcomeEmail(member.email, member.name)

    console.log(`\n✅ ${member.name} (${member.email}) - Complete!`)
  }

  console.log('\n' + '='.repeat(60))
  console.log('🎉 All members processed!')
  console.log('='.repeat(60))
  console.log('\nCredentials for all members:')
  console.log(`Password: ${PASSWORD}`)
  console.log(`Login URL: https://foco.mx/login`)
  console.log('\nMembers:')
  newMembers.forEach(m => console.log(`  - ${m.name}: ${m.email}`))
}

main().catch(console.error)
