#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ouvqnyfqipgnrjnuqsqq.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('❌ Missing Supabase key. Please set SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function investigateBackendIssues() {
  console.log('🔍 BACKEND INVESTIGATION REPORT\n');
  console.log('='.repeat(80));

  try {
    // 1. Check user_profiles table for laurence@fyves.com
    console.log('\n1️⃣  USER PROFILES - laurence@fyves.com');
    console.log('-'.repeat(80));

    const { data: userProfile, error: userError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', 'laurence@fyves.com')
      .single();

    if (userError) {
      console.error('❌ Error fetching user profile:', userError);
    } else if (!userProfile) {
      console.log('❌ User profile NOT FOUND');
    } else {
      console.log('✅ User profile found:');
      console.log(JSON.stringify(userProfile, null, 2));
    }

    // Also check auth.users table
    const { data: authUser, error: authError } = await supabase.auth.admin.listUsers();
    if (!authError && authUser?.users) {
      const targetUser = authUser.users.find(u => u.email === 'laurence@fyves.com');
      if (targetUser) {
        console.log('\n✅ Auth user found:');
        console.log(`   ID: ${targetUser.id}`);
        console.log(`   Email: ${targetUser.email}`);
        console.log(`   Email Confirmed: ${targetUser.email_confirmed_at ? 'Yes' : 'No'}`);
        console.log(`   Created: ${targetUser.created_at}`);
      } else {
        console.log('\n❌ Auth user NOT FOUND in auth.users');
      }
    }

    // 2. Check projects table for "Website Redesign"
    console.log('\n\n2️⃣  PROJECTS - "Website Redesign"');
    console.log('-'.repeat(80));

    const { data: projects, error: projectsError } = await supabase
      .from('foco_projects')
      .select('*')
      .ilike('name', '%Website Redesign%');

    if (projectsError) {
      console.error('❌ Error fetching projects:', projectsError);
    } else if (!projects || projects.length === 0) {
      console.log('❌ "Website Redesign" project NOT FOUND');

      // Check all projects to see what exists
      const { data: allProjects } = await supabase
        .from('foco_projects')
        .select('id, name, workspace_id, created_by');

      console.log('\n📋 All projects in database:');
      if (allProjects && allProjects.length > 0) {
        allProjects.forEach(p => {
          console.log(`   - ${p.name} (ID: ${p.id}, Workspace: ${p.workspace_id})`);
        });
      } else {
        console.log('   No projects found');
      }
    } else {
      console.log('✅ "Website Redesign" project(s) found:');
      projects.forEach(project => {
        console.log(JSON.stringify(project, null, 2));
      });

      // 3. Check tasks for this project
      console.log('\n\n3️⃣  TASKS - for "Website Redesign" project');
      console.log('-'.repeat(80));

      for (const project of projects) {
        console.log(`\nChecking tasks for project: ${project.name} (ID: ${project.id})`);

        const { data: tasks, error: tasksError } = await supabase
          .from('foco_tasks')
          .select('*')
          .eq('project_id', project.id);

        if (tasksError) {
          console.error('❌ Error fetching tasks:', tasksError);
        } else if (!tasks || tasks.length === 0) {
          console.log('⚠️  No tasks found for this project');
        } else {
          console.log(`✅ Found ${tasks.length} task(s):`);
          tasks.forEach(task => {
            console.log(`   - ${task.title} (Status: ${task.status}, Priority: ${task.priority})`);
            console.log(`     ID: ${task.id}`);
            console.log(`     Assigned to: ${task.assigned_to || 'Unassigned'}`);
          });
        }
      }
    }

    // 4. Check RLS policies
    console.log('\n\n4️⃣  RLS POLICIES');
    console.log('-'.repeat(80));

    const { data: policies, error: policiesError } = await supabase.rpc('pg_policies', {});

    if (policiesError) {
      console.log('⚠️  Cannot fetch RLS policies directly, checking if RLS is enabled...');

      // Try to query system tables
      const { data: rlsStatus } = await supabase
        .from('pg_tables')
        .select('tablename, rowsecurity')
        .in('tablename', ['projects', 'tasks', 'user_profiles', 'organizations']);

      if (rlsStatus) {
        console.log('\nRLS Status:');
        rlsStatus.forEach(table => {
          console.log(`   ${table.tablename}: ${table.rowsecurity ? '✅ Enabled' : '❌ Disabled'}`);
        });
      }
    } else {
      console.log('✅ RLS Policies fetched');
      console.log(JSON.stringify(policies, null, 2));
    }

    // 5. Check workspace assignments
    console.log('\n\n5️⃣  WORKSPACE & TEAM MEMBER ASSOCIATIONS');
    console.log('-'.repeat(80));

    if (userProfile) {
      const { data: workspaceMembers, error: workspaceError } = await supabase
        .from('workspace_members')
        .select('*, workspaces(*)')
        .eq('user_id', userProfile.id);

      if (workspaceError) {
        console.error('❌ Error fetching workspace memberships:', workspaceError);
      } else if (!workspaceMembers || workspaceMembers.length === 0) {
        console.log('❌ User is NOT a member of any workspace');
      } else {
        console.log(`✅ User is member of ${workspaceMembers.length} workspace(s):`);
        workspaceMembers.forEach(member => {
          console.log(`   - ${member.workspaces?.name || 'Unknown'}`);
          console.log(`     Role: ${member.role}`);
          console.log(`     Workspace ID: ${member.workspace_id}`);
        });

        // Check project memberships
        console.log('\n📋 Project Memberships:');
        for (const member of workspaceMembers) {
          const { data: projectMembers } = await supabase
            .from('foco_project_members')
            .select('*, foco_projects(name)')
            .eq('user_id', userProfile.id);

          if (projectMembers && projectMembers.length > 0) {
            projectMembers.forEach(pm => {
              console.log(`   - ${pm.foco_projects?.name || 'Unknown'} (Role: ${pm.role})`);
            });
          } else {
            console.log('   No direct project memberships found');
          }
        }
      }
    }

    // 6. Check for database constraints
    console.log('\n\n6️⃣  DATABASE CONSTRAINTS & TRIGGERS');
    console.log('-'.repeat(80));

    // Check foreign key constraints
    const tables = ['projects', 'tasks', 'user_profiles', 'organizations'];
    for (const table of tables) {
      console.log(`\n${table}:`);

      const { data: columns } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable')
        .eq('table_name', table);

      if (columns) {
        console.log('  Columns:');
        columns.forEach(col => {
          console.log(`    - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
        });
      }
    }

    // 7. Test data retrieval as if from API
    console.log('\n\n7️⃣  API-STYLE DATA RETRIEVAL TEST');
    console.log('-'.repeat(80));

    if (userProfile) {
      console.log('\nAttempting to fetch projects as user would see them...');

      const { data: userProjects, error: userProjectsError } = await supabase
        .from('foco_projects')
        .select(`
          *,
          workspace:workspaces(id, name),
          foco_project_members(user_id, role)
        `)
        .order('created_at', { ascending: false });

      if (userProjectsError) {
        console.error('❌ Error:', userProjectsError);
      } else {
        console.log(`✅ Query successful, found ${userProjects?.length || 0} projects`);
        if (userProjects && userProjects.length > 0) {
          userProjects.forEach(p => {
            console.log(`   - ${p.name} (Workspace: ${p.workspace?.name || 'N/A'})`);
          });
        }
      }
    }

  } catch (error) {
    console.error('\n💥 FATAL ERROR:', error);
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ Investigation complete\n');
}

investigateBackendIssues();
