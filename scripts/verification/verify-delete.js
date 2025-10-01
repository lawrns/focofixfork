require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function verifyDelete() {
  console.log('🔍 Verifying Delete Operation...\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    console.error('❌ Missing env vars');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, anonKey);

  try {
    // Get a test user
    const { data: users } = await supabase.auth.admin.listUsers();
    const testUser = users.users.find(u => u.email);
    if (!testUser) {
      console.error('❌ No test user found');
      process.exit(1);
    }

    const userId = testUser.id;
    console.log(`👤 Using test user: ${testUser.email} (${userId})\n`);

    // Check current projects
    console.log('📋 Current projects in database:');
    const { data: projectsBefore, error: fetchError } = await supabase
      .from('projects')
      .select('id, name, created_by, status, priority')
      .eq('created_by', userId);

    if (fetchError) {
      console.error('❌ Error fetching projects:', fetchError);
      process.exit(1);
    }

    console.log(`Found ${projectsBefore.length} projects:`);
    projectsBefore.forEach(p => console.log(`  - ${p.id}: "${p.name}" (${p.status}, ${p.priority})`));
    console.log();

    if (projectsBefore.length === 0) {
      console.log('❌ No projects to test delete on. Create a project first.');
      process.exit(1);
    }

    // Test delete on first project
    const projectToDelete = projectsBefore[0];
    console.log(`🗑️  Attempting to delete project: "${projectToDelete.name}" (${projectToDelete.id})`);

    // Direct database delete (simulating what the service does)
    const { error: deleteError } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectToDelete.id);

    if (deleteError) {
      console.error('❌ Delete operation failed:', deleteError);
      process.exit(1);
    }

    console.log('✅ Delete operation completed successfully');

    // Verify deletion immediately
    console.log('🔍 Verifying deletion (immediate check)...');
    const { data: projectsAfterImmediate, error: verifyError1 } = await supabase
      .from('projects')
      .select('id, name')
      .eq('id', projectToDelete.id);

    if (verifyError1) {
      console.error('❌ Error during immediate verification:', verifyError1);
    } else if (projectsAfterImmediate && projectsAfterImmediate.length > 0) {
      console.log('❌ PROJECT STILL EXISTS IN DATABASE (immediate check)!');
      console.log('Found:', projectsAfterImmediate);
    } else {
      console.log('✅ Project successfully deleted from database (immediate check)');
    }

    // Wait a bit and check again
    console.log('⏳ Waiting 2 seconds and checking again...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    const { data: projectsAfterDelay, error: verifyError2 } = await supabase
      .from('projects')
      .select('id, name')
      .eq('id', projectToDelete.id);

    if (verifyError2) {
      console.error('❌ Error during delayed verification:', verifyError2);
    } else if (projectsAfterDelay && projectsAfterDelay.length > 0) {
      console.log('❌ PROJECT STILL EXISTS IN DATABASE (delayed check)!');
      console.log('Found:', projectsAfterDelay);
    } else {
      console.log('✅ Project successfully deleted from database (delayed check)');
    }

    // Check all remaining projects
    console.log('\n📋 Remaining projects after delete:');
    const { data: allProjectsAfter } = await supabase
      .from('projects')
      .select('id, name, status, priority')
      .eq('created_by', userId);

    console.log(`Found ${allProjectsAfter.length} projects:`);
    allProjectsAfter.forEach(p => console.log(`  - ${p.id}: "${p.name}" (${p.status}, ${p.priority})`));

  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  }
}

verifyDelete();

