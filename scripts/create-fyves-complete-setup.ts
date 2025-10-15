import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://czijxfbkihrauyjwcgfn.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6aWp4ZmJraWhyYXV5andjZ2ZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjE3NTk4MywiZXhwIjoyMDY3NzUxOTgzfQ._JnBgXZLk23daPdnCUksfvooIJk2r9mEyclO8MnvfQ8'

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const TEAM_MEMBERS = [
  { email: 'laurence@fyves.com', role: 'owner', name: 'Laurence Fyves' },
  { email: 'isaac@fyves.com', role: 'admin', name: 'Isaac Fyves' },
  { email: 'jose@fyves.com', role: 'admin', name: 'Jose Fyves' },
  { email: 'paul@fyves.com', role: 'admin', name: 'Paul Fyves' },
  { email: 'oscar@fyves.com', role: 'admin', name: 'Oscar Fyves' },
  { email: 'cesar@fyves.com', role: 'admin', name: 'Cesar Fyves' }
]

const PASSWORD = 'hennie12'

async function createFyvesCompleteSetup() {
  console.log('🚀 Complete Fyves Setup - Create Users + Organization\n')
  console.log('=' .repeat(60))

  try {
    // Step 1: Create/verify all users exist with correct password
    console.log('👤 Step 1: Creating users...\n')

    const userIds: { [email: string]: string } = {}

    for (const member of TEAM_MEMBERS) {
      // Check if user already exists
      const { data: existingUsers } = await supabase.auth.admin.listUsers()
      const existingUser = existingUsers?.users.find(u => u.email === member.email)

      if (existingUser) {
        console.log(`✅ User exists: ${member.email}`)
        userIds[member.email] = existingUser.id

        // Update password to ensure it's correct
        const { error: updateError } = await supabase.auth.admin.updateUserById(
          existingUser.id,
          { password: PASSWORD }
        )

        if (!updateError) {
          console.log(`   🔐 Password set to '${PASSWORD}'`)
        }
      } else {
        // Create new user
        console.log(`➕ Creating user: ${member.email}`)

        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email: member.email,
          password: PASSWORD,
          email_confirm: true,
          user_metadata: {
            full_name: member.name,
            display_name: member.name
          }
        })

        if (createError) {
          console.log(`   ❌ Error: ${createError.message}`)
          continue
        }

        if (newUser?.user) {
          console.log(`   ✅ Created with password '${PASSWORD}'`)
          userIds[member.email] = newUser.user.id

          // Create user profile
          await supabase
            .from('user_profiles')
            .upsert({
              id: newUser.user.id,
              user_id: newUser.user.id,
              display_name: member.name,
              email_notifications: true,
              theme_preference: 'light'
            })
            .select()

          console.log(`   👤 Profile created`)
        }
      }
      console.log()
    }

    // Step 2: Create or get Fyves organization
    console.log('🏢 Step 2: Setting up Fyves organization...\n')

    const laurenceId = userIds['laurence@fyves.com']
    if (!laurenceId) {
      console.error('❌ Cannot create organization - laurence@fyves.com not found')
      return
    }

    let orgId: string

    const { data: existingOrg } = await supabase
      .from('organizations')
      .select('id, name, slug')
      .eq('slug', 'fyves')
      .single()

    if (existingOrg) {
      console.log('✅ Fyves organization exists')
      console.log(`   ID: ${existingOrg.id}`)
      orgId = existingOrg.id
    } else {
      const { data: newOrg, error: createError } = await supabase
        .from('organizations')
        .insert({
          name: 'Fyves',
          slug: 'fyves',
          description: 'Fyves Organization',
          created_by: laurenceId,
          is_active: true
        })
        .select()
        .single()

      if (createError || !newOrg) {
        console.error('❌ Error creating organization:', createError?.message)
        return
      }

      console.log('✅ Created Fyves organization')
      console.log(`   ID: ${newOrg.id}`)
      orgId = newOrg.id
    }

    // Step 3: Add all team members to organization
    console.log('\n👥 Step 3: Adding members to organization...\n')

    for (const member of TEAM_MEMBERS) {
      const userId = userIds[member.email]
      if (!userId) {
        console.log(`⚠️  Skipping ${member.email} - no user ID`)
        continue
      }

      const { error } = await supabase
        .from('organization_members')
        .upsert({
          organization_id: orgId,
          user_id: userId,
          role: member.role,
          joined_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'organization_id,user_id'
        })

      if (error) {
        console.log(`❌ ${member.email}: ${error.message}`)
      } else {
        console.log(`✅ ${member.email} added as ${member.role}`)
      }
    }

    // Step 4: Assign all laurence's projects to Fyves
    console.log('\n📁 Step 4: Assigning projects to Fyves...\n')

    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .update({
        organization_id: orgId,
        updated_at: new Date().toISOString()
      })
      .eq('created_by', laurenceId)
      .select()

    if (projectsError) {
      console.error('❌ Error:', projectsError.message)
    } else {
      console.log(`✅ Assigned ${projects?.length || 0} projects to Fyves`)
    }

    // Step 5: Grant all members access to all projects
    console.log('\n🔑 Step 5: Granting project access...\n')

    const { data: fyvesProjects } = await supabase
      .from('projects')
      .select('id, name')
      .eq('organization_id', orgId)

    if (fyvesProjects && fyvesProjects.length > 0) {
      for (const project of fyvesProjects) {
        for (const member of TEAM_MEMBERS) {
          const userId = userIds[member.email]
          if (!userId) continue

          await supabase
            .from('project_members')
            .upsert({
              project_id: project.id,
              user_id: userId,
              role: 'admin',
              joined_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'project_id,user_id'
            })
        }
      }
      console.log(`✅ Granted access to ${fyvesProjects.length} projects for ${Object.keys(userIds).length} members`)
    }

    // Final verification
    console.log('\n' + '='.repeat(60))
    console.log('✨ SETUP COMPLETE!')
    console.log('='.repeat(60))

    const { data: orgMembers } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', orgId)

    console.log('\n📊 Summary:')
    console.log(`   - Users created/verified: ${Object.keys(userIds).length}`)
    console.log(`   - Organization members: ${orgMembers?.length || 0}`)
    console.log(`   - Projects assigned: ${fyvesProjects?.length || 0}`)
    console.log(`   - Password for all users: ${PASSWORD}`)

    console.log('\n👥 Team Members:')
    TEAM_MEMBERS.forEach(member => {
      const status = userIds[member.email] ? '✅' : '❌'
      console.log(`   ${status} ${member.email} (${member.role})`)
    })

    console.log('\n🔐 Login Information:')
    console.log(`   - URL: https://foco.mx/login`)
    console.log(`   - Password: ${PASSWORD}`)
    console.log(`   - All users can now login!`)
    console.log()

  } catch (error) {
    console.error('\n❌ Fatal error:', error)
  }
}

createFyvesCompleteSetup()
