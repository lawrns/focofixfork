import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkProjects() {
  console.log('=== Checking Projects ===\n')

  const userId = '60c44927-9d61-40e2-8c41-7e44cf7f7981'

  // Check projects directly (without joins to avoid FK errors)
  const { data: projects, error: projectsError } = await supabase
    .from('foco_projects')
    .select(`
      id,
      name,
      workspace_id,
      organization_id,
      archived_at
    `)
    .is('archived_at', null)

  // Manually get workspace/org names
  if (projects) {
    for (const project of projects) {
      if (project.workspace_id) {
        const { data: workspace } = await supabase
          .from('workspaces')
          .select('name')
          .eq('id', project.workspace_id)
          .single()
        ;(project as any).workspace_name = workspace?.name
      }
      if (project.organization_id) {
        const { data: org } = await supabase
          .from('foco_organizations')
          .select('name')
          .eq('id', project.organization_id)
          .single()
        ;(project as any).org_name = org?.name
      }
    }
  }

  if (projectsError) {
    console.error('Error fetching projects:', projectsError)
  } else {
    console.log(`Found ${projects?.length} projects:`)
    projects?.forEach(p => {
      console.log(`  - ${p.name}`)
      console.log(`    Workspace: ${(p as any).workspace_name || 'N/A'}`)
      console.log(`    Organization: ${(p as any).org_name || 'N/A'}`)
      console.log(`    IDs: workspace=${p.workspace_id}, org=${p.organization_id}`)
    })
  }

  console.log('\n=== Checking Project Members ===\n')

  // Check project members
  const { data: members, error: membersError } = await supabase
    .from('foco_project_members')
    .select(`
      project_id,
      user_id,
      role,
      foco_projects (
        name
      )
    `)
    .eq('user_id', userId)

  if (membersError) {
    console.error('Error fetching project members:', membersError)
  } else {
    console.log(`User is member of ${members?.length} projects:`)
    members?.forEach(m => {
      console.log(`  - ${(m as any).foco_projects?.name} (role: ${m.role})`)
    })
  }

  console.log('\n=== Checking Workspaces ===\n')

  // Check all workspaces
  const { data: workspaces, error: workspacesError } = await supabase
    .from('workspaces')
    .select('*')

  if (workspacesError) {
    console.error('Error fetching workspaces:', workspacesError)
  } else {
    console.log(`Found ${workspaces?.length} workspaces:`)
    workspaces?.forEach(w => {
      console.log(`  - ${w.name} (${w.id})`)
    })
  }
}

checkProjects().then(() => process.exit(0)).catch(err => {
  console.error(err)
  process.exit(1)
})
