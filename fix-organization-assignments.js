// Script to surgically fix organization assignments for users
require('dotenv').config({ path: '.env.local' })

async function fixOrganizationAssignments() {
  try {
    console.log('🔧 Surgically fixing organization assignments...\n')

    // Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing required environment variables')
    }

    const { createClient } = require('@supabase/supabase-js')
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // Get all auth users first
    console.log('👥 Fetching auth users...')
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    if (authError) {
      console.error('Error fetching auth users:', authError)
      return
    }
    console.log(`Found ${authUsers.users.length} auth users`)

    // Create email to user ID map
    const emailToUserId = {}
    const userIdToEmail = {}
    authUsers.users.forEach(user => {
      emailToUserId[user.email] = user.id
      userIdToEmail[user.id] = user.email
    })

    // Get all organizations
    console.log('🏢 Fetching organizations...')
    const { data: organizations, error: orgsError } = await supabase
      .from('organizations')
      .select('id, name, created_by')

    if (orgsError) {
      console.error('Error fetching organizations:', orgsError)
      return
    }
    console.log(`Found ${organizations.length} organizations`)

    // Step 1: Sync auth users to users table
    console.log('\n👥 Step 1: Syncing auth users to users table...')
    for (const authUser of authUsers.users) {
      const { error: userError } = await supabase
        .from('users')
        .upsert({
          id: authUser.id,
          email: authUser.email,
          full_name: authUser.user_metadata?.full_name || authUser.email.split('@')[0],
          avatar_url: authUser.user_metadata?.avatar_url || null,
          is_active: true,
          role: 'user'
        }, { onConflict: 'id' })

      if (userError) {
        console.error(`    ❌ Failed to sync user ${authUser.email}:`, userError)
      } else {
        console.log(`    ✅ Synced user ${authUser.email}`)
      }
    }

    // Get all user profiles
    console.log('👤 Fetching user profiles...')
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('id, user_id, organization_id')

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
      return
    }
    console.log(`Found ${profiles.length} user profiles`)

    // Step 2: Create organizations for users who don't have profiles yet
    console.log('\n📝 Step 2: Creating missing user profiles...')
    const usersWithoutProfiles = authUsers.users.filter(authUser => {
      return !profiles.find(profile => profile.user_id === authUser.id)
    })

    for (const authUser of usersWithoutProfiles) {
      console.log(`  Creating profile for: ${authUser.email}`)

      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          user_id: authUser.id,
          id: authUser.id // Use same ID for profile
        })

      if (profileError) {
        console.error(`    ❌ Failed to create profile for ${authUser.email}:`, profileError)
      } else {
        console.log(`    ✅ Created profile for ${authUser.email}`)
        // Add to our profiles array
        profiles.push({
          id: authUser.id,
          user_id: authUser.id,
          organization_id: null
        })
      }
    }

    // Step 3: Ensure each user has their own organization
    console.log('\n🏗️  Step 3: Ensuring each user has their own organization...')

    for (const profile of profiles) {
      const userEmail = userIdToEmail[profile.user_id || profile.id]

      if (!profile.organization_id) {
        // User doesn't have an organization - create one
        const userName = userEmail.split('@')[0] || 'User'
        const orgName = `${userName}'s Organization`

        console.log(`  Creating organization for ${userEmail}: "${orgName}"`)

        const { data: newOrg, error: createError } = await supabase
          .from('organizations')
          .insert({
            name: orgName,
            slug: orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
            created_by: profile.user_id || profile.id
          })
          .select()
          .single()

        if (createError) {
          console.error(`    ❌ Failed to create organization for ${userEmail}:`, createError)
          continue
        }

        // Add user to organization members
        const { error: memberError } = await supabase
          .from('organization_members')
          .insert({
            organization_id: newOrg.id,
            user_id: profile.user_id || profile.id,
            role: 'owner', // User owns their organization
            joined_at: new Date().toISOString()
          })

        if (memberError) {
          console.error(`    ❌ Failed to add ${userEmail} to organization members:`, memberError)
          continue
        }

        // Update user profile
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({ organization_id: newOrg.id })
          .eq('id', profile.id)

        if (updateError) {
          console.error(`    ❌ Failed to update profile for ${userEmail}:`, updateError)
          continue
        }

        console.log(`    ✅ Created and assigned "${orgName}" to ${userEmail}`)
      } else {
        // User has an organization - verify they own it
        const org = organizations.find(o => o.id === profile.organization_id)
        if (!org) {
          console.log(`    ⚠️  Organization ${profile.organization_id} not found for ${userEmail}`)
          continue
        }

        if (org.created_by !== (profile.user_id || profile.id)) {
          console.log(`    🔄 Organization "${org.name}" owned by ${userIdToEmail[org.created_by] || 'unknown'} but assigned to ${userEmail}`)

          // Create new organization for this user
          const userName = userEmail.split('@')[0] || 'User'
          const newOrgName = `${userName}'s Organization`

          const { data: newOrg, error: createError } = await supabase
            .from('organizations')
            .insert({
              name: newOrgName,
              slug: newOrgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
              created_by: profile.user_id || profile.id
            })
            .select()
            .single()

          if (createError) {
            console.error(`    ❌ Failed to create new organization for ${userEmail}:`, createError)
            continue
          }

          // Add to organization members
          const { error: memberError } = await supabase
            .from('organization_members')
            .insert({
              organization_id: newOrg.id,
              user_id: profile.user_id || profile.id,
              role: 'owner', // User owns their organization
              joined_at: new Date().toISOString()
            })

          if (memberError) {
            console.error(`    ❌ Failed to add ${userEmail} to new organization:`, memberError)
            continue
          }

          // Update profile
          const { error: updateError } = await supabase
            .from('user_profiles')
            .update({ organization_id: newOrg.id })
            .eq('id', profile.id)

          if (updateError) {
            console.error(`    ❌ Failed to reassign ${userEmail} to new organization:`, updateError)
            continue
          }

          console.log(`    ✅ Reassigned ${userEmail} to their own organization "${newOrgName}"`)
        } else {
          console.log(`    ✅ ${userEmail} correctly owns "${org.name}"`)
        }
      }
    }

    // Step 4: Verify final state
    console.log('\n🔍 Step 4: Verifying final organization assignments...')

    const { data: finalProfiles, error: finalError } = await supabase
      .from('user_profiles')
      .select(`
        id,
        user_id,
        organization_id,
        organizations (
          id,
          name,
          created_by
        )
      `)

    if (finalError) {
      console.error('Error verifying final state:', finalError)
    } else {
      console.log('\n📊 Final organization assignments:')
      finalProfiles.forEach(profile => {
        const userEmail = userIdToEmail[profile.user_id || profile.id] || 'unknown'
        const orgName = profile.organizations?.name || 'No organization'
        const orgOwner = userIdToEmail[profile.organizations?.created_by] || 'unknown'

        if (profile.organizations?.created_by === (profile.user_id || profile.id)) {
          console.log(`  ✅ ${userEmail} → "${orgName}" (correctly owned)`)
        } else {
          console.log(`  ❌ ${userEmail} → "${orgName}" (owned by ${orgOwner})`)
        }
      })
    }

    console.log('\n🎉 Organization assignment fix completed!')
    console.log('Each user should now have their own correctly assigned organization.')

  } catch (error) {
    console.error('\n❌ Error fixing organization assignments:', error.message)
  }
}

// Run the script
fixOrganizationAssignments()
