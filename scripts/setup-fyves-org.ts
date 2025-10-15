import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://czijxfbkihrauyjwcgfn.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6aWp4ZmJraWhyYXV5andjZ2ZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjE3NTk4MywiZXhwIjoyMDY3NzUxOTgzfQ._JnBgXZLk23daPdnCUksfvooIJk2r9mEyclO8MnvfQ8'

const supabase = createClient(supabaseUrl, supabaseKey)

async function setupFyvesOrg() {
  console.log('🚀 Setting up Fyves organization...\n')

  try {
    // Step 1: Get laurence@fyves.com user ID
    const { data: laurenceUser, error: laurenceError } = await supabase
      .from('users')
      .select('id')
      .eq('email', 'laurence@fyves.com')
      .single()

    if (laurenceError || !laurenceUser) {
      // Try auth.users table
      const { data: authUser } = await supabase.auth.admin.listUsers()
      const laurence = authUser?.users.find(u => u.email === 'laurence@fyves.com')

      if (!laurence) {
        console.error('❌ User laurence@fyves.com not found')
        return
      }

      console.log('✅ Found laurence@fyves.com:', laurence.id)
    }

    const laurenceId = laurenceUser?.id

    // Step 2: Create or update Fyves organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .upsert({
        id: 'fyves-org-001',
        name: 'Fyves',
        slug: 'fyves',
        description: 'Fyves Organization',
        created_by: laurenceId,
        is_active: true,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'slug'
      })
      .select()
      .single()

    if (orgError) {
      console.error('❌ Error creating organization:', orgError)
      return
    }

    console.log('✅ Organization created/updated: Fyves\n')

    // Step 3: Add team members
    const teamMembers = [
      { email: 'laurence@fyves.com', role: 'owner' },
      { email: 'isaac@fyves.com', role: 'admin' },
      { email: 'jose@fyves.com', role: 'admin' },
      { email: 'paul@fyves.com', role: 'admin' },
      { email: 'oscar@fyves.com', role: 'admin' },
      { email: 'cesar@fyves.com', role: 'admin' }
    ]

    console.log('👥 Adding team members...')
    for (const member of teamMembers) {
      // Get user from auth.users
      const { data: authUsers } = await supabase.auth.admin.listUsers()
      const user = authUsers?.users.find(u => u.email === member.email)

      if (!user) {
        console.log(`⚠️  User ${member.email} not found, skipping`)
        continue
      }

      const { error: memberError } = await supabase
        .from('organization_members')
        .upsert({
          organization_id: 'fyves-org-001',
          user_id: user.id,
          role: member.role,
          joined_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'organization_id,user_id'
        })

      if (memberError) {
        console.log(`❌ Error adding ${member.email}:`, memberError.message)
      } else {
        console.log(`✅ Added ${member.email} as ${member.role}`)
      }
    }

    // Step 4: Assign all laurence's projects to Fyves
    console.log('\n📁 Assigning projects to Fyves organization...')
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .update({
        organization_id: 'fyves-org-001',
        updated_at: new Date().toISOString()
      })
      .eq('created_by', laurenceId)
      .select()

    if (projectsError) {
      console.error('❌ Error updating projects:', projectsError)
    } else {
      console.log(`✅ Assigned ${projects?.length || 0} projects to Fyves`)
    }

    // Step 5: Add all team members to all projects
    console.log('\n🔑 Granting project access to team members...')
    const { data: fyvesProjects } = await supabase
      .from('projects')
      .select('id')
      .eq('organization_id', 'fyves-org-001')

    if (fyvesProjects) {
      for (const project of fyvesProjects) {
        for (const member of teamMembers) {
          const { data: authUsers } = await supabase.auth.admin.listUsers()
          const user = authUsers?.users.find(u => u.email === member.email)

          if (!user) continue

          await supabase
            .from('project_members')
            .upsert({
              project_id: project.id,
              user_id: user.id,
              role: 'admin',
              joined_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'project_id,user_id'
            })
        }
      }
      console.log(`✅ Granted access to ${fyvesProjects.length} projects`)
    }

    // Verification
    console.log('\n📊 Verification:')
    const { data: orgMembers } = await supabase
      .from('organization_members')
      .select('role, user_id')
      .eq('organization_id', 'fyves-org-001')

    console.log(`   - Organization members: ${orgMembers?.length || 0}`)
    console.log(`   - Projects in Fyves: ${fyvesProjects?.length || 0}`)

    console.log('\n✨ Fyves organization setup complete!\n')

  } catch (error) {
    console.error('❌ Error:', error)
  }
}

setupFyvesOrg()
