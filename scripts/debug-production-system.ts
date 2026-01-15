/**
 * Comprehensive Production System Debugging
 * Tests all critical paths: API endpoints, database queries, authentication, RLS policies
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

const supabaseUrl = 'https://ouvqnyfqipgnrjnuqsqq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91dnFueWZxaXBncm5qbnVxc3FxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQxMzI0MDAsImV4cCI6MjA0OTcwODQwMH0.Sj0kj81RrM9yA3Yj8z0qJj0qBz1fQ8wQ8wQ8wQ8wQ8w';

// Test with service role key for admin access
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91dnFueWZxaXBncm5qbnVxc3FxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDEzMjQwMCwiZXhwIjoyMDQ5NzA4NDAwfQ.somekey';

const supabase = createClient(supabaseUrl, serviceRoleKey);

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  error?: string;
  details?: any;
  duration: number;
}

const results: TestResult[] = [];

async function runTest(name: string, test: () => Promise<void>): Promise<void> {
  const start = Date.now();
  try {
    await test();
    results.push({ name, status: 'PASS', duration: Date.now() - start });
    console.log(`✅ ${name}`);
  } catch (error: any) {
    results.push({ 
      name, 
      status: 'FAIL', 
      error: error.message || String(error),
      duration: Date.now() - start 
    });
    console.error(`❌ ${name}: ${error.message || error}`);
  }
}

// 1. Test Database Connection and Schema
async function testDatabaseConnection() {
  const { data, error } = await supabase.from('foco_projects').select('count', { count: 'exact' });
  if (error) throw error;
  console.log(`   Projects in DB: ${data?.[0]?.count || 0}`);
}

// 2. Test Workspaces
async function testWorkspaces() {
  const { data, error } = await supabase
    .from('workspaces')
    .select('*')
    .limit(5);
  
  if (error) throw error;
  console.log(`   Workspaces found: ${data?.length || 0}`);
  if (data && data.length > 0) {
    console.log(`   First workspace: ${data[0].name} (${data[0].id})`);
  }
}

// 3. Test Projects with workspace_id
async function testProjects() {
  const { data, error } = await supabase
    .from('foco_projects')
    .select('*')
    .limit(5);
  
  if (error) throw error;
  console.log(`   Projects found: ${data?.length || 0}`);
  if (data && data.length > 0) {
    data.forEach(p => {
      console.log(`   - ${p.name} (slug: ${p.slug}, workspace_id: ${p.workspace_id})`);
    });
  }
}

// 4. Test Project by Slug (the error case)
async function testProjectBySlug() {
  // First get a valid slug
  const { data: projects } = await supabase
    .from('foco_projects')
    .select('slug')
    .limit(1);
  
  if (!projects || projects.length === 0) {
    console.log('   ⚠️ No projects found to test slug lookup');
    return;
  }
  
  const validSlug = projects[0].slug;
  console.log(`   Testing slug lookup: ${validSlug}`);
  
  const { data, error } = await supabase
    .from('foco_projects')
    .select('*')
    .eq('slug', validSlug)
    .single();
  
  if (error) throw error;
  console.log(`   ✅ Found project by slug: ${data.name}`);
}

// 5. Test the problematic UUID-as-slug query
async function testUUIDAsSlug() {
  const uuid = '33d467da-fff5-4fb8-a1da-64c4c23da265';
  console.log(`   Testing UUID as slug: ${uuid}`);
  
  const { data, error } = await supabase
    .from('foco_projects')
    .select('*')
    .eq('slug', uuid);
  
  if (error) {
    console.log(`   ❌ Error (expected): ${error.message}`);
  } else {
    console.log(`   ⚠️ Query returned ${data?.length || 0} results`);
  }
}

// 6. Test API Endpoints
async function testAPIEndpoints() {
  const baseUrl = 'http://localhost:3000';
  
  // Test workspaces API
  console.log('   Testing /api/workspaces...');
  try {
    const response = await fetch(`${baseUrl}/api/workspaces`);
    console.log(`   Status: ${response.status}`);
    if (!response.ok) {
      const text = await response.text();
      console.log(`   Error: ${text}`);
    }
  } catch (err: any) {
    console.log(`   ❌ Failed: ${err.message}`);
  }
  
  // Test projects API with workspace_id
  console.log('   Testing /api/projects without workspace_id...');
  try {
    const response = await fetch(`${baseUrl}/api/projects`);
    console.log(`   Status: ${response.status}`);
    if (!response.ok) {
      const text = await response.text();
      console.log(`   Error: ${text}`);
    }
  } catch (err: any) {
    console.log(`   ❌ Failed: ${err.message}`);
  }
  
  // Get workspace ID first
  const { data: workspaces } = await supabase
    .from('workspaces')
    .select('id')
    .limit(1);
  
  if (workspaces && workspaces.length > 0) {
    const workspaceId = workspaces[0].id;
    console.log(`   Testing /api/projects?workspace_id=${workspaceId}...`);
    try {
      const response = await fetch(`${baseUrl}/api/projects?workspace_id=${workspaceId}`);
      console.log(`   Status: ${response.status}`);
      if (response.ok) {
        const data = await response.json();
        console.log(`   ✅ Returned ${data.data?.length || 0} projects`);
      } else {
        const text = await response.text();
        console.log(`   Error: ${text}`);
      }
    } catch (err: any) {
      console.log(`   ❌ Failed: ${err.message}`);
    }
  }
}

// 7. Test RLS Policies
async function testRLSPolicies() {
  // Test with anon key (should fail for protected data)
  const anonClient = createClient(supabaseUrl, supabaseKey);
  
  console.log('   Testing RLS with anon key...');
  const { data, error } = await anonClient
    .from('foco_projects')
    .select('*');
  
  if (error) {
    console.log(`   ✅ RLS blocked anon access: ${error.message}`);
  } else {
    console.log(`   ⚠️ RLS allowed anon access (should be protected)`);
  }
}

// 8. Check for Invalid Data
async function testDataIntegrity() {
  console.log('   Checking for invalid slugs...');
  
  // Check for UUIDs in slug field
  const { data: uuidSlugs, error: uuidError } = await supabase
    .from('foco_projects')
    .select('id, slug')
    .like('slug', '%-%-%-%-%');
  
  if (uuidError) throw uuidError;
  
  if (uuidSlugs && uuidSlugs.length > 0) {
    console.log(`   ⚠️ Found ${uuidSlugs.length} projects with UUID-like slugs:`);
    uuidSlugs.forEach(p => {
      console.log(`     - ID: ${p.id}, Slug: ${p.slug}`);
    });
  } else {
    console.log('   ✅ No UUID-like slugs found');
  }
  
  // Check for null workspace_ids
  const { data: nullWorkspaces, error: nullError } = await supabase
    .from('foco_projects')
    .select('id, name, workspace_id')
    .is('workspace_id', null);
  
  if (nullError) throw nullError;
  
  if (nullWorkspaces && nullWorkspaces.length > 0) {
    console.log(`   ⚠️ Found ${nullWorkspaces.length} projects with null workspace_id:`);
    nullWorkspaces.forEach(p => {
      console.log(`     - ${p.name} (ID: ${p.id})`);
    });
  } else {
    console.log('   ✅ All projects have workspace_id');
  }
}

// 9. Test Project Routes
async function testProjectRoutes() {
  const { data: projects } = await supabase
    .from('foco_projects')
    .select('slug')
    .limit(3);
  
  if (!projects || projects.length === 0) {
    console.log('   No projects to test routes');
    return;
  }
  
  const baseUrl = 'http://localhost:3000';
  
  for (const project of projects) {
    console.log(`   Testing /projects/${project.slug}...`);
    try {
      const response = await fetch(`${baseUrl}/projects/${project.slug}`);
      console.log(`   Status: ${response.status}`);
    } catch (err: any) {
      console.log(`   ❌ Failed: ${err.message}`);
    }
  }
}

// Main execution
async function main() {
  console.log('🔍 Starting Comprehensive Production System Debug\n');
  
  await runTest('Database Connection', testDatabaseConnection);
  await runTest('Workspaces Query', testWorkspaces);
  await runTest('Projects Query', testProjects);
  await runTest('Project by Slug', testProjectBySlug);
  await runTest('UUID as Slug (Error Case)', testUUIDAsSlug);
  await runTest('API Endpoints', testAPIEndpoints);
  await runTest('RLS Policies', testRLSPolicies);
  await runTest('Data Integrity', testDataIntegrity);
  await runTest('Project Routes', testProjectRoutes);
  
  // Summary
  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const total = results.length;
  
  console.log(`Total Tests: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  
  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`   - ${r.name}: ${r.error}`);
    });
  }
  
  console.log('\n🔧 Recommendations:');
  if (results.some(r => r.name.includes('UUID as Slug'))) {
    console.log('   - Fix code passing project ID as slug parameter');
  }
  if (results.some(r => r.name.includes('API Endpoints') && r.status === 'FAIL')) {
    console.log('   - Check API routes for proper error handling');
  }
  if (results.some(r => r.name.includes('RLS') && r.status === 'WARN')) {
    console.log('   - Review RLS policies to ensure proper access control');
  }
}

main().catch(console.error);
