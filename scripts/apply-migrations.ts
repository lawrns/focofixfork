import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const migrations = [
  '20260303_project_memory.sql',
  '20260303_m2c1_orchestration.sql', 
  '20260303_task_intake_queue.sql',
  '20260304_content_pipeline.sql',
  '20260304_dependency_snapshots.sql',
  '20260304_project_codemaps.sql',
  '20260305_generated_media.sql',
  '20260305_agent_surfaces.sql'
];

async function applyMigrations() {
  // First create the exec_sql function if it doesn't exist
  console.log('Creating exec_sql function...');
  
  const createFunctionSql = `
CREATE OR REPLACE FUNCTION exec_sql(query text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS \$\$
BEGIN
  EXECUTE query;
END;
\$\$;
`;

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
      },
      body: JSON.stringify({ query: createFunctionSql })
    });
    
    if (!response.ok) {
      console.log('  Function may already exist or error:', await response.text());
    } else {
      console.log('  ✓ Function created');
    }
  } catch (err) {
    console.error('  Failed to create function:', (err as Error).message);
  }

  // Now apply migrations
  for (const migration of migrations) {
    const filePath = path.join('supabase/migrations', migration);
    console.log('Applying:', migration);
    
    try {
      const sql = fs.readFileSync(filePath, 'utf8');
      
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
        },
        body: JSON.stringify({ query: sql })
      });
      
      if (!response.ok) {
        const error = await response.text();
        console.error('  Error:', error.slice(0, 300));
      } else {
        console.log('  ✓ Applied');
      }
    } catch (err) {
      console.error('  Failed:', (err as Error).message);
    }
  }
}

applyMigrations();
