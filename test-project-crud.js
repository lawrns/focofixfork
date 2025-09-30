require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function testProjectCRUD() {
  console.log('🔍 Testing Project CRUD Operations...\n');

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
    const userId = devUser.id;

    console.log(`👤 Testing as user: ${devUser.email} (${userId})`);

    // Test 1: GET /api/projects - List projects
    console.log('\n📋 Test 1: GET /api/projects (simulated)...');

    // Simulate the ProjectsService.getUserProjects call
    const createdQuery = supabase
      .from('projects')
      .select(`
        *,
        organizations (
          name
        )
      `)
      .eq('created_by', userId);

    const teamQuery = supabase
      .from('project_team_assignments')
      .select(`
        projects (
          *,
          organizations (
            name
          )
        )
      `)
      .eq('user_id', userId)
      .eq('is_active', true);

    const [createdResult, teamResult] = await Promise.all([
      createdQuery,
      teamQuery
    ]);

    const projectsMap = new Map();
    if (createdResult.data) {
      createdResult.data.forEach(project => {
        projectsMap.set(project.id, project);
      });
    }
    if (teamResult.data) {
      teamResult.data.forEach(item => {
        if (item.projects) {
          projectsMap.set(item.projects.id, item.projects);
        }
      });
    }

    const projects = Array.from(projectsMap.values());
    console.log(`✅ Found ${projects.length} projects via API simulation`);
    projects.forEach(project => {
      console.log(`  - ${project.name} (${project.id}) - ${project.organizations?.name || 'Personal'}`);
    });

    // Test 2: POST /api/projects - Create project
    console.log('\n📋 Test 2: POST /api/projects (simulated)...');

    // Get user's organizations for the test
    const { data: userOrgs } = await supabase
      .from('organization_members')
      .select('organization_id, organizations(name)')
      .eq('user_id', userId);

    const testOrg = userOrgs?.[0];
    const createData = {
      name: 'CRUD Test Project',
      description: 'Created via CRUD test',
      organization_id: testOrg?.organization_id || null,
      status: 'planning',
      priority: 'high',
    };

    // Simulate the service call
    const dataToInsert = {
      ...createData,
      created_by: userId,
    };

    const { data: createdProject, error: createError } = await supabase
      .from('projects')
      .insert(dataToInsert)
      .select()
      .single();

    if (createError) {
      console.log('❌ Create error:', createError.message);
    } else {
      console.log('✅ Project created:', createdProject.name, createdProject.id);

      // Add team assignment
      const { error: teamError } = await supabase
        .from('project_team_assignments')
        .insert({
          project_id: createdProject.id,
          user_id: userId,
          role: 'owner',
          assigned_by: userId,
          is_active: true,
        });

      if (teamError) {
        console.log('❌ Team assignment error:', teamError.message);
      } else {
        console.log('✅ Team assignment created');
      }

      const projectId = createdProject.id;

      // Test 3: PUT /api/projects/[id] - Update project
      console.log('\n📋 Test 3: PUT /api/projects/[id] (simulated)...');
      const updateData = {
        name: 'CRUD Test Project - Updated',
        description: 'Updated via CRUD test',
        status: 'active',
        priority: 'urgent',
      };

      const { data: updatedProject, error: updateError } = await supabase
        .from('projects')
        .update(updateData)
        .eq('id', projectId)
        .select()
        .single();

      if (updateError) {
        console.log('❌ Update error:', updateError.message);
      } else {
        console.log('✅ Project updated:', updatedProject.name);
      }

      // Test 4: DELETE /api/projects/[id] - Delete project
      console.log('\n📋 Test 4: DELETE /api/projects/[id] (simulated)...');
      const { error: deleteError } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (deleteError) {
        console.log('❌ Delete error:', deleteError.message);
      } else {
        console.log('✅ Project deleted successfully');
      }
    }

    // Test 5: Verify final project count
    console.log('\n📋 Test 5: Verify final state...');
    const finalQuery = await supabase
      .from('projects')
      .select('id, name')
      .eq('created_by', userId);

    console.log(`✅ Final project count for user: ${finalQuery.data?.length || 0}`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testProjectCRUD().catch(console.error);
