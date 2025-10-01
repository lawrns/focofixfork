require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function testDatabaseUpdate() {
  console.log('🔍 Testing Database Update Persistence...\n');

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
      .select('id, name, status, priority, updated_at')
      .eq('created_by', userId);

    if (fetchError) {
      console.error('❌ Error fetching projects:', fetchError);
      process.exit(1);
    }

    console.log(`Found ${projectsBefore.length} projects:`);
    projectsBefore.forEach(p => console.log(`  - ${p.id}: "${p.name}" (${p.status}, ${p.priority}) - updated: ${p.updated_at}`));
    console.log();

    if (projectsBefore.length === 0) {
      console.log('❌ No projects to test update on. Create a project first.');
      process.exit(1);
    }

    // Test update on first project
    const projectToUpdate = projectsBefore[0];
    const originalName = projectToUpdate.name;
    const newName = `${originalName} - UPDATED ${Date.now()}`;

    console.log(`✏️  Updating project: "${originalName}" → "${newName}"`);
    console.log(`Project ID: ${projectToUpdate.id}`);

    // Direct database update (simulating what the service does)
    const { data: updateResult, error: updateError } = await supabase
      .from('projects')
      .update({
        name: newName,
        status: 'completed',
        priority: 'urgent'
      })
      .eq('id', projectToUpdate.id)
      .select('id, name, status, priority, updated_at')
      .single();

    if (updateError) {
      console.error('❌ Update operation failed:', updateError);
      process.exit(1);
    }

    console.log('✅ Update operation completed successfully');
    console.log('Updated result:', updateResult);

    // Immediate verification
    console.log('\n🔍 Immediate verification after update:');
    const { data: projectsAfterImmediate, error: verifyError1 } = await supabase
      .from('projects')
      .select('id, name, status, priority, updated_at')
      .eq('id', projectToUpdate.id)
      .single();

    if (verifyError1) {
      console.error('❌ Error during immediate verification:', verifyError1);
    } else {
      console.log('Project after update:', projectsAfterImmediate);
      if (projectsAfterImmediate.name === newName) {
        console.log('✅ Name updated correctly in database');
      } else {
        console.log('❌ Name NOT updated in database!');
        console.log(`Expected: "${newName}"`);
        console.log(`Actual: "${projectsAfterImmediate.name}"`);
      }
    }

    // Wait and verify again
    console.log('\n⏳ Waiting 3 seconds and verifying again...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    const { data: projectsAfterDelay, error: verifyError2 } = await supabase
      .from('projects')
      .select('id, name, status, priority, updated_at')
      .eq('id', projectToUpdate.id)
      .single();

    if (verifyError2) {
      console.error('❌ Error during delayed verification:', verifyError2);
    } else {
      console.log('Project after delay:', projectsAfterDelay);
      if (projectsAfterDelay.name === newName) {
        console.log('✅ Name persists after delay - update committed to database');
      } else {
        console.log('❌ Name reverted after delay - UPDATE NOT PERSISTED!');
        console.log(`Expected: "${newName}"`);
        console.log(`Actual: "${projectsAfterDelay.name}"`);
      }
    }

    // Test API endpoint directly
    console.log('\n🌐 Testing API endpoint directly...');
    try {
      const apiResponse = await fetch(`http://localhost:3000/api/projects`, {
        headers: {
          'x-user-id': userId,
        },
      });

      if (!apiResponse.ok) {
        console.log('❌ API call failed:', apiResponse.status);
      } else {
        const apiData = await apiResponse.json();
        console.log(`API returned ${apiData.data?.length || 0} projects`);
        const apiProject = apiData.data?.find(p => p.id === projectToUpdate.id);
        if (apiProject) {
          console.log('API project data:', {
            id: apiProject.id,
            name: apiProject.name,
            status: apiProject.status,
            priority: apiProject.priority
          });
          if (apiProject.name === newName) {
            console.log('✅ API returns updated data');
          } else {
            console.log('❌ API returns OLD data!');
            console.log(`API name: "${apiProject.name}"`);
            console.log(`Expected: "${newName}"`);
          }
        } else {
          console.log('❌ Project not found in API response');
        }
      }
    } catch (apiError) {
      console.log('❌ API test failed:', apiError.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testDatabaseUpdate();
