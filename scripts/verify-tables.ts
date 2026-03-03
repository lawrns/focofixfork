import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const expectedTables = [
  'project_memory_segments',
  'orchestration_workflows',
  'workflow_phases',
  'phase_tasks',
  'task_intake_queue',
  'content_sources',
  'content_items',
  'dependency_scans',
  'dependency_snapshots',
  'project_codemaps',
  'generated_media_assets',
  'agent_surfaces',
  'surface_executions'
];

async function verifyTables() {
  console.log('Verifying database tables...\n');
  
  for (const table of expectedTables) {
    const { data, error } = await supabase
      .from(table)
      .select('count', { count: 'exact', head: true });
    
    if (error) {
      console.log(`❌ ${table}: ${error.message}`);
    } else {
      console.log(`✅ ${table}: exists`);
    }
  }
}

verifyTables();
