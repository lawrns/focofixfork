// Script to check and fix organization assignments for users
require('dotenv').config({ path: '.env.local' })

async function fixOrganizationAssignments() {
  try {
    console.log('🔧 Checking and fixing organization assignments...\n')

    // Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing required environment variables')
    }

    const { createClient } = require('@supabase/supabase-js')
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // Check if organization_id column exists
    console.log('🔍 Checking database schema...')
    try {
      const { data: testProfile, error: testError } = await supabase
        .from('user_profiles')
        .select('organization_id')
        .limit(1)

      if (testError && testError.message.includes('does not exist')) {
        console.log('⚠️  organization_id column does not exist, creating it...')

        // Try to add the column using SQL
        const { error: alterError } = await supabase.rpc('exec_sql', {
          sql: 'ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);'
        })

        if (alterError) {
          console.log('❌ Could not add organization_id column via RPC, trying direct SQL...')

          // Try direct SQL execution
          const { error: sqlError } = await supabase
            .from('_supabase_migration_temp')
            .select('*')
            .limit(0)

          if (sqlError) {
            console.log('❌ Cannot execute DDL statements. Please run this SQL manually:')
            console.log('ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);')
            console.log('CREATE INDEX IF NOT EXISTS idx_user_profiles_organization_id ON user_profiles(organization_id);')
            return
          }
        } else {
          console.log('✅ organization_id column added successfully')
        }
      }
    } catch (error) {
      console.log('⚠️  Error checking/creating organization_id column:', error.message)
    }

    // Get all users and their profiles
    console.log('📋 Fetching user profiles...')
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('id, user_id, organization_id, bio, preferences, settings')

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
      return
    }

    console.log(`Found ${profiles.length} user profiles`)

    // Get all users from auth
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    if (authError) {
      console.error('Error fetching auth users:', authError)
      return
    }

    console.log(`Found ${authUsers.users.length} auth users`)

    // Get all organizations
    const { data: organizations, error: orgsError } = await supabase
      .from('organizations')
      .select('id, name, created_by')

    if (orgsError) {
      console.error('Error fetching organizations:', orgsError)
      return
    }

    console.log(`Found ${organizations.length} organizations`)

    // Create a map of user_id to email
    const userEmailMap = {}
    authUsers.users.forEach(user => {
      userEmailMap[user.id] = user.email
    })

    // Check for users with missing organizations
    const usersWithoutOrg = profiles.filter(p => !p.organization_id)
    console.log(`\n⚠️  Users without organizations: ${usersWithoutOrg.length}`)
    usersWithoutOrg.forEach(user => {
      const email = userEmailMap[user.user_id || user.id] || 'unknown'
      console.log(`  - User ${user.id}: ${email}`)
    })

    // Check for organization conflicts (multiple users in same org)
    const orgUserCount = {}
    profiles.forEach(profile => {
      if (profile.organization_id) {
        orgUserCount[profile.organization_id] = (orgUserCount[profile.organization_id] || 0) + 1
      }
    })

    const conflictedOrgs = Object.entries(orgUserCount)
      .filter(([orgId, count]) => count > 1)
      .map(([orgId, count]) => ({ orgId, count }))

    if (conflictedOrgs.length > 0) {
      console.log(`\n🚨 Organizations with multiple users: ${conflictedOrgs.length}`)
      conflictedOrgs.forEach(({ orgId, count }) => {
        const org = organizations.find(o => o.id === orgId)
        console.log(`  - Org "${org?.name || orgId}" (${orgId}): ${count} users`)

        // Show which users are in this org
        const usersInOrg = profiles.filter(p => p.organization_id === orgId)
        usersInOrg.forEach(user => {
          const email = userEmailMap[user.user_id || user.id] || 'unknown'
          console.log(`    * User ${user.id}: ${email}`)
        })
      })

      console.log('\n🔧 Fixing organization conflicts...')

      // For each conflicted organization, keep only the creator and move others to new orgs
      for (const { orgId } of conflictedOrgs) {
        const org = organizations.find(o => o.id === orgId)
        const usersInOrg = profiles.filter(p => p.organization_id === orgId)

        // Find the creator
        const creator = usersInOrg.find(u => u.id === org?.created_by)
        const nonCreators = usersInOrg.filter(u => u.id !== org?.created_by)

        console.log(`  Fixing org "${org?.name}":`)
        console.log(`    Keeping creator: ${creator?.id}`)
        console.log(`    Moving ${nonCreators.length} users to new organizations`)

        // Create new organizations for non-creators
        for (const user of nonCreators) {
          const userEmail = userEmailMap[user.user_id || user.id] || 'unknown'
          const userName = userEmail.split('@')[0] || 'User'

          // Create new organization
          const newOrgName = `${userName}'s Organization`
          const { data: newOrg, error: createError } = await supabase
            .from('organizations')
            .insert({
              name: newOrgName,
              slug: newOrgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
            })
            .select()
            .single()

          if (createError) {
            console.error(`    ❌ Failed to create org for user ${user.id} (${userEmail}):`, createError)
            continue
          }

          // Add creator to organization members
          const { error: memberError } = await supabase
            .from('organization_members')
            .insert({
              organization_id: newOrg.id,
              user_id: user.user_id || user.id,
              role: 'member',
              joined_at: new Date().toISOString()
            })

          if (memberError) {
            console.error(`    ❌ Failed to add member for user ${user.id} (${userEmail}):`, memberError)
            continue
          }

          // Update user profile
          const { error: profileError } = await supabase
            .from('user_profiles')
            .update({ organization_id: newOrg.id })
            .eq('id', user.id)

          if (profileError) {
            console.error(`    ❌ Failed to update profile for user ${user.id} (${userEmail}):`, profileError)
            continue
          }

          console.log(`    ✅ Created new org "${newOrgName}" for user ${userEmail}`)
        }
      }
    } else {
      console.log('\n✅ No organization conflicts found')
    }

    console.log('\n🎉 Organization assignment check and fix completed!')

  } catch (error) {
    console.error('\n❌ Error fixing organization assignments:', error.message)
  }
}

// Run the script
fixOrganizationAssignments()
