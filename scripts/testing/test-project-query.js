require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function testProjectQuery() {
  console.log('🔍 Testing Project Query Fixes...\n');

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

    // Test different query approaches
    console.log('\n📋 Test 1: Simple query for projects created by user...');
    const { data: createdByUser, error: createdError } = await supabase
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
      console.log('❌ Created by user query error:', createdError.message);
    } else {
      console.log(`✅ Found ${createdByUser?.length || 0} projects created by user`);
      if (createdByUser && createdByUser.length > 0) {
        createdByUser.forEach(project => {
          console.log(`  - ${project.name} (${project.id})`);
        });
      }
    }

    // Test 2: Get team assignments first, then projects
    console.log('\n📋 Test 2: Get projects via team assignments...');
    const { data: teamProjects, error: teamError } = await supabase
      .from('project_team_assignments')
      .select(`
        project_id,
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
      console.log('❌ Team projects query error:', teamError.message);
    } else {
      console.log(`✅ Found ${teamProjects?.length || 0} projects via team assignments`);
      if (teamProjects && teamProjects.length > 0) {
        teamProjects.forEach(item => {
          if (item.projects) {
            console.log(`  - ${item.projects.name} (${item.projects.id})`);
          }
        });
      }
    }

    // Test 3: Combined query using union approach
    console.log('\n📋 Test 3: Combined query approach...');
    const [createdResult, teamResult] = await Promise.all([
      supabase
        .from('projects')
        .select(`
          *,
          organizations (
            name
          )
        `)
        .eq('created_by', devUser.id),
      supabase
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
        .eq('is_active', true)
    ]);

    const allProjects = new Map();

    // Add projects created by user
    if (createdResult.data) {
      createdResult.data.forEach(project => {
        allProjects.set(project.id, project);
      });
    }

    // Add projects from team assignments
    if (teamResult.data) {
      teamResult.data.forEach(item => {
        if (item.projects) {
          allProjects.set(item.projects.id, item.projects);
        }
      });
    }

    const uniqueProjects = Array.from(allProjects.values());
    console.log(`✅ Combined approach found ${uniqueProjects.length} unique projects`);
    uniqueProjects.forEach(project => {
      console.log(`  - ${project.name} (${project.id}) - Org: ${project.organizations?.name || 'None'}`);
    });

    // Test 4: Check valid roles for team assignments
    console.log('\n📋 Test 4: Check existing team assignment roles...');
    const { data: allRoles, error: rolesError } = await supabase
      .from('project_team_assignments')
      .select('role')
      .limit(10);

    if (rolesError) {
      console.log('❌ Roles query error:', rolesError.message);
    } else {
      const uniqueRoles = [...new Set(allRoles.map(r => r.role))];
      console.log('✅ Existing roles:', uniqueRoles);
    }

    // Test 5: Try creating team assignment with valid role
    console.log('\n📋 Test 5: Create team assignment with valid role...');
    // First get a project ID
    const projectId = uniqueProjects[0]?.id;
    if (projectId) {
      // Try different role values
      const rolesToTry = ['owner', 'admin', 'member', 'lead', 'developer'];

      for (const role of rolesToTry) {
        try {
          const { error: testError } = await supabase
            .from('project_team_assignments')
            .insert({
              project_id: projectId,
              user_id: devUser.id,
              role: role,
              assigned_by: devUser.id,
              is_active: true,
            });

          if (!testError) {
            console.log(`✅ Role '${role}' worked!`);
            break;
          } else {
            console.log(`❌ Role '${role}' failed:`, testError.message);
          }
        } catch (e) {
          console.log(`❌ Role '${role}' exception:`, e.message);
        }
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testProjectQuery().catch(console.error);
