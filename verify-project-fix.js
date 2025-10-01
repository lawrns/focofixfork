require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function verifyProjectFix() {
  console.log('🔍 Verifying Project CRUD Fix...\n');

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

    // Check for any "Focolin testy" projects
    console.log('\n📋 Checking for "Focolin testy" projects...');
    const { data: focolinProjects, error: focolinError } = await supabase
      .from('projects')
      .select('id, name, created_by, created_at')
      .ilike('name', '%focolin%');

    if (focolinError) {
      console.log('❌ Error searching for Focolin projects:', focolinError.message);
    } else {
      console.log(`Found ${focolinProjects?.length || 0} projects with "focolin" in name:`);
      if (focolinProjects && focolinProjects.length > 0) {
        focolinProjects.forEach(project => {
          console.log(`  - ${project.id}: "${project.name}" (created by ${project.created_by})`);
        });

        // Delete any "Focolin testy" projects found
        for (const project of focolinProjects) {
          if (project.name.toLowerCase().includes('focolin testy') || project.name.toLowerCase() === 'focolin testy') {
            console.log(`\n🗑️ Deleting project: ${project.id} - "${project.name}"`);
            const { error: deleteError } = await supabase
              .from('projects')
              .delete()
              .eq('id', project.id);

            if (deleteError) {
              console.log('❌ Delete error:', deleteError.message);
            } else {
              console.log('✅ Project deleted successfully');
            }
          }
        }
      } else {
        console.log('✅ No "Focolin testy" projects found');
      }
    }

    // Test creating and deleting a project to verify CRUD works
    console.log('\n📋 Testing CRUD operations...');

    // Create test project
    const testProjectName = `Test Project ${Date.now()}`;
    console.log(`Creating test project: "${testProjectName}"`);

    const { data: createdProject, error: createError } = await supabase
      .from('projects')
      .insert({
        name: testProjectName,
        description: 'Test project for CRUD verification',
        created_by: userId,
        status: 'planning',
        priority: 'medium'
      })
      .select()
      .single();

    if (createError) {
      console.log('❌ Create error:', createError.message);
      return;
    }

    console.log(`✅ Created project: ${createdProject.id} - "${createdProject.name}"`);

    // Wait a moment for any real-time processing
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify project exists
    const { data: verifyProject, error: verifyError } = await supabase
      .from('projects')
      .select('id, name')
      .eq('id', createdProject.id)
      .single();

    if (verifyError) {
      console.log('❌ Verification error:', verifyError.message);
    } else {
      console.log(`✅ Project verified: ${verifyProject.id} - "${verifyProject.name}"`);
    }

    // Delete test project
    console.log(`Deleting test project: ${createdProject.id}`);
    const { error: deleteError } = await supabase
      .from('projects')
      .delete()
      .eq('id', createdProject.id);

    if (deleteError) {
      console.log('❌ Delete error:', deleteError.message);
    } else {
      console.log('✅ Test project deleted successfully');
    }

    // Verify deletion
    const { data: verifyDeletion, error: verifyDelError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', createdProject.id)
      .single();

    if (verifyDelError?.code === 'PGRST116') {
      console.log('✅ Project deletion verified - project no longer exists');
    } else {
      console.log('❌ Project still exists after deletion!');
    }

    console.log('\n🎉 CRUD verification complete!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

verifyProjectFix().catch(console.error);
