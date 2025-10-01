require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function testProjectAPI() {
  console.log('🔍 Testing Project API...\n');

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
    if (usersError || !users?.users?.length) {
      console.error('❌ Could not get users');
      return;
    }

    const devUser = users.users.find(u => u.email === 'dev@focolin.com');
    if (!devUser) {
      console.error('❌ Could not find dev user');
      return;
    }

    console.log(`👤 Testing as user: ${devUser.email} (${devUser.id})`);

    // Test 1: Direct query like ProjectsService.getUserProjects does
    console.log('\n📋 Test 1: Direct query for user projects...');
    const { data: userProjects, error: userProjError } = await supabase
      .from('projects')
      .select(`
        *,
        organizations (
          name
        ),
        project_team_assignments!left(user_id)
      `)
      .or(`created_by.eq.${devUser.id},project_team_assignments.user_id.eq.${devUser.id}`)
      .order('created_at', { ascending: false })
      .limit(10);

    if (userProjError) {
      console.log('❌ User projects query error:', userProjError.message);
    } else {
      console.log(`✅ Found ${userProjects?.length || 0} projects for user`);
      if (userProjects && userProjects.length > 0) {
        userProjects.forEach(project => {
          console.log(`  - ${project.name} (${project.id})`);
          console.log(`    Created by: ${project.created_by}`);
          console.log(`    Organization: ${project.organizations?.name || 'None'}`);
        });
      }
    }

    // Test 2: Check what projects the user created
    console.log('\n📋 Test 2: Projects created by user...');
    const { data: createdProjects, error: createdError } = await supabase
      .from('projects')
      .select('*')
      .eq('created_by', devUser.id);

    if (createdError) {
      console.log('❌ Created projects query error:', createdError.message);
    } else {
      console.log(`✅ User created ${createdProjects?.length || 0} projects`);
    }

    // Test 3: Check team assignments for user
    console.log('\n📋 Test 3: Team assignments for user...');
    const { data: teamAssignments, error: teamError } = await supabase
      .from('project_team_assignments')
      .select('*')
      .eq('user_id', devUser.id);

    if (teamError) {
      console.log('❌ Team assignments query error:', teamError.message);
    } else {
      console.log(`✅ User has ${teamAssignments?.length || 0} team assignments`);
    }

    // Test 4: Check organizations the user belongs to
    console.log('\n📋 Test 4: Organizations for user...');
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

    if (orgsError) {
      console.log('❌ User organizations query error:', orgsError.message);
    } else {
      console.log(`✅ User belongs to ${userOrgs?.length || 0} organizations`);
      if (userOrgs && userOrgs.length > 0) {
        userOrgs.forEach(org => {
          console.log(`  - ${org.organizations?.name} (${org.organizations?.id})`);
        });
      }
    }

    // Test 5: Try to create a project properly
    console.log('\n📋 Test 5: Creating a test project...');
    const testOrg = userOrgs?.[0]; // Use first organization if available
    const projectData = {
      name: 'Test Project From API',
      description: 'Created via API test',
      organization_id: testOrg?.organization_id || null,
      status: 'planning',
      priority: 'medium',
      created_by: devUser.id,
    };

    const { data: newProject, error: createError } = await supabase
      .from('projects')
      .insert(projectData)
      .select()
      .single();

    if (createError) {
      console.log('❌ Project creation error:', createError.message);
    } else {
      console.log('✅ Project created:', newProject.name, newProject.id);

      // Add creator as team member
      const { error: teamAddError } = await supabase
        .from('project_team_assignments')
        .insert({
          project_id: newProject.id,
          user_id: devUser.id,
          role: 'admin',
          assigned_by: devUser.id,
          is_active: true,
        });

      if (teamAddError) {
        console.log('❌ Team assignment error:', teamAddError.message);
      } else {
        console.log('✅ Creator added to project team');
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testProjectAPI().catch(console.error);
