import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyVisibility() {
  console.log('--- Project Visibility Verification ---');
  
  // 1. Get Doctor.mx project
  const { data: project, error: projectError } = await supabase
    .from('foco_projects')
    .select('id, name, workspace_id, owner_id')
    .ilike('name', 'Doctor.mx')
    .single();
    
  if (projectError || !project) {
    console.error('❌ Could not find Doctor.mx project:', projectError?.message);
    return;
  }
  
  console.log(`✅ Found project: ${project.name} (${project.id})`);
  console.log(`   Workspace: ${project.workspace_id}`);
  
  // 2. Identify Laurence and Isaac
  // Laurence (Owner of project): 60c44927-9d61-40e2-8c41-7e44cf7f7981
  // Isaac (Colleague): 38166d48-18e3-4677-80f0-c83750058e19
  
  const users = [
    { id: '60c44927-9d61-40e2-8c41-7e44cf7f7981', name: 'Laurence' },
    { id: '38166d48-18e3-4677-80f0-c83750058e19', name: 'Isaac' }
  ];
  
  for (const user of users) {
    console.log(`\nChecking visibility for ${user.name} (${user.id})...`);
    
    // Check workspace membership
    const { data: membership, error: memError } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', project.workspace_id)
      .eq('user_id', user.id)
      .maybeSingle();
      
    if (memError) {
      console.error(`   ❌ Error checking membership:`, memError.message);
    } else if (!membership) {
      console.error(`   ❌ NOT a member of the project's workspace!`);
      
      // Fix: Add to workspace if missing
      console.log(`   Attempting to add ${user.name} to workspace...`);
      const { error: addError } = await supabase
        .from('workspace_members')
        .insert({
          workspace_id: project.workspace_id,
          user_id: user.id,
          role: user.name === 'Laurence' ? 'owner' : 'member'
        });
        
      if (addError) {
        console.error(`   ❌ Failed to add to workspace:`, addError.message);
      } else {
        console.log(`   ✅ Successfully added to workspace.`);
      }
    } else {
      console.log(`   ✅ Is workspace member with role: ${membership.role}`);
    }
    
    // Check project membership (optional but good for explicit visibility)
    const { data: projectMember, error: pmError } = await supabase
      .from('foco_project_members')
      .select('role')
      .eq('project_id', project.id)
      .eq('user_id', user.id)
      .maybeSingle();
      
    if (pmError) {
      console.error(`   ❌ Error checking project membership:`, pmError.message);
    } else if (!projectMember) {
      console.log(`   ⚠️ Not an explicit project member. Attempting to add...`);
      const { error: addPmError } = await supabase
        .from('foco_project_members')
        .insert({
          project_id: project.id,
          user_id: user.id,
          role: user.name === 'Laurence' ? 'admin' : 'member'
        });
        
      if (addPmError) {
        console.error(`   ❌ Failed to add to project:`, addPmError.message);
      } else {
        console.log(`   ✅ Successfully added as project member.`);
      }
    } else {
      console.log(`   ✅ Is project member with role: ${projectMember.role}`);
    }
    
    // Final check: Simulate RLS check
    const { data: visibleProjects, error: rlsError } = await supabase
      .rpc('user_has_workspace_access', { ws_id: project.workspace_id });
      
    console.log(`   RLS access function check: ${visibleProjects ? 'PASS' : 'FAIL'}`);
  }
}

verifyVisibility();
