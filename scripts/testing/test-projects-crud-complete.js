/**
 * Comprehensive Projects CRUD Test Script
 * Tests all CRUD operations end-to-end
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function testProjectsCRUD() {
  console.log('🧪 Starting Comprehensive Projects CRUD Tests...\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  console.log('Environment check:');
  console.log(`- SUPABASE_URL: ${supabaseUrl ? '✅' : '❌ Missing'}`);
  console.log(`- ANON_KEY: ${anonKey ? '✅' : '❌ Missing'}\n`);

  if (!supabaseUrl || !anonKey) {
    console.error('❌ Environment variables missing. Cannot run tests.');
    return;
  }

  const supabase = createClient(supabaseUrl, anonKey);

  try {
    // Get a test user
    console.log('🔍 Getting test user...');
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError || !users?.users?.length) {
      console.error('❌ Could not get users:', usersError?.message);
      return;
    }

    const testUser = users.users.find(u => u.email);
    if (!testUser) {
      console.error('❌ No users found in database');
      return;
    }

    const userId = testUser.id;
    console.log(`✅ Using test user: ${testUser.email} (${userId})\n`);

    let createdProjectId = null;

    // Test 1: CREATE Project
    console.log('📝 Test 1: CREATE Project');
    try {
      const createData = {
        name: 'CRUD Test Project',
        description: 'Testing comprehensive CRUD operations',
        organization_id: null,
        status: 'planning',
        priority: 'medium',
        start_date: null,
        due_date: null,
        progress_percentage: 0
      };

      const response = await fetch('http://localhost:3000/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify(createData)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${result.error}`);
      }

      if (!result.success || !result.data?.id) {
        throw new Error('Invalid response format');
      }

      createdProjectId = result.data.id;
      console.log(`✅ Project created: ${result.data.name} (ID: ${createdProjectId})`);
    } catch (error) {
      console.error(`❌ CREATE failed: ${error.message}`);
      return;
    }

    // Test 2: READ Project (by ID)
    console.log('\n📖 Test 2: READ Project by ID');
    try {
      const response = await fetch(`http://localhost:3000/api/projects/${createdProjectId}`, {
        headers: { 'x-user-id': userId }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${result.error}`);
      }

      if (!result.success || result.data?.id !== createdProjectId) {
        throw new Error('Invalid response or wrong project returned');
      }

      console.log(`✅ Project retrieved: ${result.data.name}`);
    } catch (error) {
      console.error(`❌ READ failed: ${error.message}`);
      return;
    }

    // Test 3: LIST Projects
    console.log('\n📋 Test 3: LIST Projects');
    try {
      const response = await fetch('http://localhost:3000/api/projects', {
        headers: { 'x-user-id': userId }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${result.error}`);
      }

      if (!result.success || !Array.isArray(result.data)) {
        throw new Error('Invalid response format');
      }

      const foundProject = result.data.find(p => p.id === createdProjectId);
      if (!foundProject) {
        throw new Error('Created project not found in list');
      }

      console.log(`✅ Projects listed: ${result.data.length} total, found our project`);
    } catch (error) {
      console.error(`❌ LIST failed: ${error.message}`);
      return;
    }

    // Test 4: UPDATE Project
    console.log('\n✏️  Test 4: UPDATE Project');
    try {
      const updateData = {
        name: 'CRUD Test Project - Updated',
        status: 'active',
        progress_percentage: 25,
        description: 'Updated during CRUD testing'
      };

      const response = await fetch(`http://localhost:3000/api/projects/${createdProjectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify(updateData)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${result.error}`);
      }

      if (!result.success || result.data?.name !== updateData.name) {
        throw new Error('Invalid response or update failed');
      }

      console.log(`✅ Project updated: ${result.data.name} (${result.data.status}, ${result.data.progress_percentage}%)`);
    } catch (error) {
      console.error(`❌ UPDATE failed: ${error.message}`);
      return;
    }

    // Test 5: DELETE Project
    console.log('\n🗑️  Test 5: DELETE Project');
    try {
      const response = await fetch(`http://localhost:3000/api/projects/${createdProjectId}`, {
        method: 'DELETE',
        headers: { 'x-user-id': userId }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${result.error}`);
      }

      if (!result.success) {
        throw new Error('Delete operation failed');
      }

      console.log('✅ Project deleted successfully');
    } catch (error) {
      console.error(`❌ DELETE failed: ${error.message}`);
      return;
    }

    // Test 6: VERIFY Deletion
    console.log('\n🔍 Test 6: VERIFY Deletion');
    try {
      const response = await fetch(`http://localhost:3000/api/projects/${createdProjectId}`, {
        headers: { 'x-user-id': userId }
      });

      if (response.status !== 404) {
        throw new Error(`Expected 404, got ${response.status}`);
      }

      const result = await response.json();
      if (!result.error || !result.error.includes('not found')) {
        throw new Error('Project still exists or wrong error message');
      }

      console.log('✅ Project deletion verified - 404 as expected');
    } catch (error) {
      console.error(`❌ VERIFICATION failed: ${error.message}`);
      return;
    }

    // Final verification - list should not include deleted project
    console.log('\n📋 Test 7: FINAL LIST Verification');
    try {
      const response = await fetch('http://localhost:3000/api/projects', {
        headers: { 'x-user-id': userId }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${result.error}`);
      }

      const deletedProject = result.data.find(p => p.id === createdProjectId);
      if (deletedProject) {
        throw new Error('Deleted project still appears in list');
      }

      console.log(`✅ Final verification passed: ${result.data.length} projects, deleted project not found`);
    } catch (error) {
      console.error(`❌ FINAL VERIFICATION failed: ${error.message}`);
      return;
    }

    console.log('\n🎉 ALL TESTS PASSED! Projects CRUD is working correctly.');
    console.log('\n✅ CREATE - Working');
    console.log('✅ READ - Working');
    console.log('✅ LIST - Working');
    console.log('✅ UPDATE - Working');
    console.log('✅ DELETE - Working');
    console.log('✅ VERIFICATION - Working');

  } catch (error) {
    console.error('\n💥 Test suite failed:', error);
  }
}

// Run the tests
testProjectsCRUD();

