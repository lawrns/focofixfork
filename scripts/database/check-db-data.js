require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function checkData() {
  console.log('🔍 Checking database state...\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing environment variables');
    return;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    // Check organizations
    console.log('📋 Checking organizations...');
    const { data: orgs, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .limit(5);

    if (orgError) {
      console.log('❌ Organizations error:', orgError.message);
    } else {
      console.log(`✅ Found ${orgs?.length || 0} organizations`);
      if (orgs && orgs.length > 0) {
        orgs.forEach(org => console.log(`  - ${org.name} (${org.id})`));
      }
    }

    // Check projects
    console.log('\n📋 Checking projects...');
    const { data: projects, error: projError } = await supabase
      .from('projects')
      .select(`
        *,
        organizations (
          name
        )
      `)
      .limit(10);

    if (projError) {
      console.log('❌ Projects error:', projError.message);
    } else {
      console.log(`✅ Found ${projects?.length || 0} projects`);
      if (projects && projects.length > 0) {
        projects.forEach(project => {
          console.log(`  - ${project.name} (${project.id})`);
          console.log(`    Organization: ${project.organizations?.name || 'None'}`);
          console.log(`    Status: ${project.status}, Priority: ${project.priority}`);
        });
      }
    }

    // Check project team assignments
    console.log('\n📋 Checking project team assignments...');
    const { data: assignments, error: assignError } = await supabase
      .from('project_team_assignments')
      .select('*')
      .limit(5);

    if (assignError) {
      console.log('❌ Team assignments error:', assignError.message);
    } else {
      console.log(`✅ Found ${assignments?.length || 0} team assignments`);
    }

    // Check users
    console.log('\n📋 Checking users...');
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) {
      console.log('❌ Users error:', usersError.message);
    } else {
      console.log(`✅ Found ${users?.users?.length || 0} users`);
      if (users?.users && users.users.length > 0) {
        users.users.forEach(user => console.log(`  - ${user.email} (${user.id})`));
      }
    }

  } catch (error) {
    console.error('❌ Database check failed:', error.message);
  }
}

checkData().catch(console.error);