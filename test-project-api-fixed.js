require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function testProjectAPIFixed() {
  console.log('🔍 Testing Fixed Project API...\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing environment variables');
    return;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    // Get the main dev user
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    const devUser = users.users.find(u => u.email === 'dev@focolin.com');

    console.log(`👤 Testing as user: ${devUser.email} (${devUser.id})`);

    // Test the new query approach that should work
    console.log('\n📋 Test 1: Projects created by user...');
    const { data: createdProjects, error: createdError } = await supabase
      .from('projects')
      .select(`
        *,
        organizations (
          name
        )
      `)
      .eq('created_by', devUser.id)
      .order('created_at', { ascending: false });

    if (createdError) {
      console.log('❌ Created projects error:', createdError.message);
    } else {
      console.log(`✅ Found ${createdProjects?.length || 0} projects created by user`);
      if (createdProjects && createdProjects.length > 0) {
        createdProjects.forEach(project => {
          console.log(`  - ${project.name} (${project.id})`);
          console.log(`    Organization: ${project.organizations?.name || 'None'}`);
        });
      }
    }

    console.log('\n📋 Test 2: Projects via team assignments...');
    const { data: teamProjects, error: teamError } = await supabase
      .from('project_team_assignments')
      .select(`
        projects (
          *,
          organizations (
            name
          )
        )
      `)
      .eq('user_id', devUser.id)
      .eq('is_active', true);

    if (teamError) {
      console.log('❌ Team projects error:', teamError.message);
    } else {
      console.log(`✅ Found ${teamProjects?.length || 0} projects via team assignments`);
      if (teamProjects && teamProjects.length > 0) {
        teamProjects.forEach(item => {
          if (item.projects) {
            console.log(`  - ${item.projects.name} (${item.projects.id})`);
            console.log(`    Organization: ${item.projects.organizations?.name || 'None'}`);
          }
        });
      }
    }

    // Test combined unique projects (like the service does)
    const projectsMap = new Map();

    if (createdProjects) {
      createdProjects.forEach(project => {
        projectsMap.set(project.id, project);
      });
    }

    if (teamProjects) {
      teamProjects.forEach(item => {
        if (item.projects) {
          projectsMap.set(item.projects.id, item.projects);
        }
      });
    }

    const uniqueProjects = Array.from(projectsMap.values());
    console.log(`\n📋 Combined result: ${uniqueProjects.length} unique projects`);
    uniqueProjects.forEach(project => {
      console.log(`  - ${project.name} (${project.id}) - Org: ${project.organizations?.name || 'Personal'}`);
    });

    // Test 3: Create a new project to verify the flow works
    console.log('\n📋 Test 3: Creating a new project with proper team assignment...');

    // Get user's organizations
    const { data: userOrgs, error: orgsError } = await supabase
      .from('organization_members')
      .select(`
        organization_id,
        organizations (
          id,
          name
        )
      `)
      .eq('user_id', devUser.id);

    const testOrg = userOrgs?.[0];
    console.log(`Using organization: ${testOrg?.organizations?.name || 'Personal'}`);

    const newProjectData = {
      name: 'API Test Project',
      description: 'Created via fixed API test',
      organization_id: testOrg?.organization_id || null,
      status: 'planning',
      priority: 'medium',
      created_by: devUser.id,
    };

    const { data: newProject, error: createError } = await supabase
      .from('projects')
      .insert(newProjectData)
      .select()
      .single();

    if (createError) {
      console.log('❌ Project creation error:', createError.message);
    } else {
      console.log('✅ Project created:', newProject.name);

      // Add creator as team member
      const { error: teamAddError } = await supabase
        .from('project_team_assignments')
        .insert({
          project_id: newProject.id,
          user_id: devUser.id,
          role: 'owner',
          assigned_by: devUser.id,
          is_active: true,
        });

      if (teamAddError) {
        console.log('❌ Team assignment error:', teamAddError.message);
      } else {
        console.log('✅ Creator added to project team as owner');
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testProjectAPIFixed().catch(console.error);
