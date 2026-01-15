/**
 * Test Production Fixes
 * Verify all the fixes are working correctly
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ouvqnyfqipgnrjnuqsqq.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFixes() {
  console.log('🧪 Testing Production Fixes\n');

  // 1. Test project lookup by slug
  console.log('1. Testing project lookup by slug...');
  try {
    const { data: projects, error } = await supabase
      .from('foco_projects')
      .select('slug')
      .limit(1);
    
    if (error) throw error;
    
    if (projects && projects.length > 0) {
      const slug = projects[0].slug;
      console.log(`   Using slug: ${slug}`);
      
      // Test the problematic query
      const { data: project, error: projectError } = await supabase
        .from('foco_projects')
        .select('*')
        .eq('slug', slug);
      
      if (projectError) throw projectError;
      
      if (project && project.length === 1) {
        console.log('   ✅ Project lookup by slug works');
      } else if (project && project.length > 1) {
        console.log('   ⚠️ Multiple projects found with same slug');
      } else {
        console.log('   ❌ No project found');
      }
    } else {
      console.log('   ⚠️ No projects to test');
    }
  } catch (error: any) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  // 2. Test project lookup by ID (for API)
  console.log('\n2. Testing project lookup by ID...');
  try {
    const { data: projects, error } = await supabase
      .from('foco_projects')
      .select('id')
      .limit(1);
    
    if (error) throw error;
    
    if (projects && projects.length > 0) {
      const id = projects[0].id;
      console.log(`   Using ID: ${id}`);
      
      const { data: project, error: projectError } = await supabase
        .from('foco_projects')
        .select('*')
        .eq('id', id)
        .single();
      
      if (projectError) {
        if (projectError.code === 'PGRST116') {
          console.log('   ❌ Project not found');
        } else {
          console.log(`   ❌ Error: ${projectError.message}`);
        }
      } else {
        console.log('   ✅ Project lookup by ID works');
      }
    }
  } catch (error: any) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  // 3. Test UUID as slug (should return empty)
  console.log('\n3. Testing UUID as slug (error case)...');
  const testUUID = '33d467da-fff5-4fb8-a1da-64c4c23da265';
  try {
    const { data, error } = await supabase
      .from('foco_projects')
      .select('*')
      .eq('slug', testUUID);
    
    if (error) throw error;
    
    if (data && data.length === 0) {
      console.log('   ✅ UUID as slug returns no results (expected)');
    } else {
      console.log(`   ⚠️ Found ${data?.length || 0} results for UUID slug`);
    }
  } catch (error: any) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  // 4. Check for data integrity issues
  console.log('\n4. Checking data integrity...');
  
  // Check for UUIDs in slug field
  try {
    const { data: uuidSlugs, error } = await supabase
      .from('foco_projects')
      .select('id, slug')
      .like('slug', '%-%-%-%-%');
    
    if (error) throw error;
    
    if (uuidSlugs && uuidSlugs.length > 0) {
      console.log(`   ⚠️ Found ${uuidSlugs.length} projects with UUID-like slugs`);
      uuidSlugs.forEach(p => {
        console.log(`      - ID: ${p.id}, Slug: ${p.slug}`);
      });
    } else {
      console.log('   ✅ No UUID-like slugs found');
    }
  } catch (error: any) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  // Check for null workspace_ids
  try {
    const { data: nullWorkspaces, error } = await supabase
      .from('foco_projects')
      .select('id, name')
      .is('workspace_id', null);
    
    if (error) throw error;
    
    if (nullWorkspaces && nullWorkspaces.length > 0) {
      console.log(`   ⚠️ Found ${nullWorkspaces.length} projects with null workspace_id`);
    } else {
      console.log('   ✅ All projects have workspace_id');
    }
  } catch (error: any) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  // 5. Test API endpoints
  console.log('\n5. Testing API endpoints...');
  
  const testAPI = async (url: string, description: string) => {
    try {
      const response = await fetch(`http://localhost:3000${url}`);
      console.log(`   ${description}: ${response.status}`);
      if (!response.ok) {
        const text = await response.text();
        console.log(`      Error: ${text.substring(0, 100)}...`);
      }
    } catch (error: any) {
      console.log(`   ${description}: ❌ Failed - ${error.message}`);
    }
  };

  await testAPI('/api/workspaces', 'Workspaces API');
  await testAPI('/api/projects', 'Projects API (no params)');
  
  // Get workspace ID for projects test
  try {
    const { data: workspaces } = await supabase
      .from('workspaces')
      .select('id')
      .limit(1);
    
    if (workspaces && workspaces.length > 0) {
      await testAPI(`/api/projects?workspace_id=${workspaces[0].id}`, 'Projects API (with workspace_id)');
    }
  } catch (error: any) {
    console.log(`   Could not test projects with workspace_id: ${error.message}`);
  }

  console.log('\n✅ Testing complete!');
  console.log('\nRecommendations:');
  console.log('- Fix any remaining navigation that uses project.id instead of project.slug');
  console.log('- Ensure all API calls include proper headers');
  console.log('- Add error boundaries for better error handling');
  console.log('- Consider adding slug uniqueness constraints');
}

testFixes().catch(console.error);
