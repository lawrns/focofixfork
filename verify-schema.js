require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function verifySchema() {
  console.log('🔍 Verifying database schema...\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  console.log('Environment variables check:');
  console.log(`- NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? '✅ Set' : '❌ Missing'}`);
  console.log(`- SUPABASE_SERVICE_ROLE_KEY: ${serviceRoleKey ? '✅ Set' : '❌ Missing'}`);
  console.log(`- NEXT_PUBLIC_SUPABASE_ANON_KEY: ${anonKey ? '✅ Set' : '❌ Missing'}`);

  if (!supabaseUrl || !anonKey) {
    console.error('❌ Missing required environment variables');
    return;
  }

  const supabase = createClient(supabaseUrl, anonKey);

  try {
    // Check if projects table exists
    console.log('📋 Checking projects table...');
    const { data: projectsData, error: directError } = await supabase
      .from('projects')
      .select('*')
      .limit(1);

    if (directError) {
      console.log('❌ Projects table does not exist or is not accessible');
      console.log('Error:', directError.message);
    } else {
      console.log('✅ Projects table exists and is accessible');
      console.log('Sample data:', projectsData);

      // Get column info using a different approach
      const { data: columnData, error: columnError } = await supabase
        .rpc('get_table_columns', { table_name: 'projects' });

      if (columnError) {
        console.log('Could not get column details via RPC');
      } else {
        console.log('Column details:', columnData);
      }
    }

    // Check project_team_assignments table
    console.log('\n📋 Checking project_team_assignments table...');
    const { data: teamData, error: teamError } = await supabase
      .from('project_team_assignments')
      .select('*')
      .limit(1);

    if (teamError) {
      console.log('❌ project_team_assignments table does not exist or is not accessible');
      console.log('Error:', teamError.message);
    } else {
      console.log('✅ project_team_assignments table exists and is accessible');
      console.log('Sample data:', teamData);
    }

  } catch (error) {
    console.error('Schema verification failed:', error);
  }
}

verifySchema();
