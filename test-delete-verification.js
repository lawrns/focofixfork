require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function testDeleteVerification() {
  console.log('🔍 Testing Delete Operation Verification...\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    console.error('❌ Missing env vars');
    return;
  }

  const supabase = createClient(supabaseUrl, anonKey);

  try {
    // Get a test user
    const { data: users } = await supabase.auth.admin.listUsers();
    const testUser = users.users.find(u => u.email);
    if (!testUser) {
      console.error('❌ No test user found');
      return;
    }

    const userId = testUser.id;
    console.log(`👤 Using test user: ${testUser.email} (${userId})\n`);

    // Check current projects
    console.log('📋 Current projects before any operations:');
    const { data: projectsBefore, error: fetchError } = await supabase
      .from('projects')
      .select('id, name, created_by')
      .eq('created_by', userId);

    if (fetchError) {
      console.error('❌ Error fetching projects:', fetchError);
      return;
    }

    console.log(`Found ${projectsBefore.length} projects:`);
    projectsBefore.forEach(p => console.log(`  - ${p.id}: ${p.name}`));
    console.log();

    if (projectsBefore.length === 0) {
      console.log('❌ No projects to test delete on. Create a project first.');
      return;
    }

    // Test delete on first project
    const projectToDelete = projectsBefore[0];
    console.log(`🗑️  Attempting to delete project: ${projectToDelete.name} (${projectToDelete.id})`);

    // Direct database delete (simulating what the service does)
    const { error: deleteError } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectToDelete.id);

    if (deleteError) {
      console.error('❌ Delete operation failed:', deleteError);
      return;
    }

    console.log('✅ Delete operation completed successfully');

    // Verify deletion
    console.log('🔍 Verifying deletion...');
    const { data: projectsAfter, error: verifyError } = await supabase
      .from('projects')
      .select('id, name')
      .eq('id', projectToDelete.id);

    if (verifyError) {
      console.error('❌ Error during verification:', verifyError);
      return;
    }

    if (projectsAfter && projectsAfter.length > 0) {
      console.log('❌ PROJECT STILL EXISTS IN DATABASE!');
      console.log('Found:', projectsAfter);
    } else {
      console.log('✅ Project successfully deleted from database');
    }

    // Check all remaining projects
    console.log('\n📋 Remaining projects after delete:');
    const { data: allProjectsAfter } = await supabase
      .from('projects')
      .select('id, name, created_by')
      .eq('created_by', userId);

    console.log(`Found ${allProjectsAfter.length} projects:`);
    allProjectsAfter.forEach(p => console.log(`  - ${p.id}: ${p.name}`));

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testDeleteVerification();
