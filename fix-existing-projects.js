require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function fixExistingProjects() {
  console.log('🔧 Fixing Existing Projects - Adding Team Assignments...\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing environment variables');
    return;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    // Get all projects that don't have team assignments
    console.log('📋 Finding projects without team assignments...');
    const { data: allProjects, error: projectsError } = await supabase
      .from('projects')
      .select('id, name, created_by')
      .not('created_by', 'is', null);

    if (projectsError) {
      console.log('❌ Error fetching projects:', projectsError.message);
      return;
    }

    console.log(`Found ${allProjects?.length || 0} projects total`);

    // Get existing team assignments
    const { data: existingAssignments, error: assignmentsError } = await supabase
      .from('project_team_assignments')
      .select('project_id');

    if (assignmentsError) {
      console.log('❌ Error fetching assignments:', assignmentsError.message);
      return;
    }

    const assignedProjectIds = new Set(existingAssignments?.map(a => a.project_id) || []);
    console.log(`Found ${assignedProjectIds.size} projects with team assignments`);

    // Find projects that need team assignments
    const projectsNeedingAssignment = allProjects?.filter(p => !assignedProjectIds.has(p.id)) || [];
    console.log(`Found ${projectsNeedingAssignment.length} projects needing team assignments`);

    if (projectsNeedingAssignment.length === 0) {
      console.log('✅ All projects already have team assignments');
      return;
    }

    // Add team assignments for projects created by users
    console.log('\n📋 Adding team assignments...');
    const assignmentsToCreate = projectsNeedingAssignment.map(project => ({
      project_id: project.id,
      user_id: project.created_by,
      role: 'owner',
      assigned_by: project.created_by,
      is_active: true,
    }));

    const { data: createdAssignments, error: createError } = await supabase
      .from('project_team_assignments')
      .insert(assignmentsToCreate)
      .select();

    if (createError) {
      console.log('❌ Error creating assignments:', createError.message);
    } else {
      console.log(`✅ Created ${createdAssignments?.length || 0} team assignments`);
      createdAssignments?.forEach(assignment => {
        const project = projectsNeedingAssignment.find(p => p.id === assignment.project_id);
        console.log(`  - ${project?.name} → ${assignment.role} role for creator`);
      });
    }

    // Verify the fix
    console.log('\n📋 Verifying fix...');
    const { data: verifyUsers, error: verifyError } = await supabase.auth.admin.listUsers();

    if (verifyError) {
      console.log('❌ Error verifying users');
      return;
    }

    for (const user of verifyUsers.users.slice(0, 3)) { // Test first 3 users
      const createdQuery = supabase
        .from('projects')
        .select('id, name')
        .eq('created_by', user.id);

      const teamQuery = supabase
        .from('project_team_assignments')
        .select('projects(id, name)')
        .eq('user_id', user.id)
        .eq('is_active', true);

      const [createdResult, teamResult] = await Promise.all([createdQuery, teamQuery]);

      const projectsMap = new Map();
      if (createdResult.data) {
        createdResult.data.forEach(p => projectsMap.set(p.id, p));
      }
      if (teamResult.data) {
        teamResult.data.forEach(item => {
          if (item.projects) projectsMap.set(item.projects.id, item.projects);
        });
      }

      const totalProjects = Array.from(projectsMap.values()).length;
      if (totalProjects > 0) {
        console.log(`✅ ${user.email}: ${totalProjects} projects accessible`);
      }
    }

  } catch (error) {
    console.error('❌ Fix failed:', error.message);
  }
}

fixExistingProjects().catch(console.error);
