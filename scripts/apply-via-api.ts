// Use the Supabase platform API to execute SQL
import fs from 'fs';
import path from 'path';

const projectRef = process.env.SUPABASE_PROJECT_REF;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
  if (!projectRef || !serviceRoleKey) {
    throw new Error('Missing SUPABASE_PROJECT_REF or SUPABASE_SERVICE_ROLE_KEY');
  }

  for (const migration of migrations) {
    const filePath = path.join('supabase/migrations', migration);
    console.log('Applying:', migration);
    
    try {
      const sql = fs.readFileSync(filePath, 'utf8');
      
      // Use the Supabase Management API SQL endpoint
      const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({ query: sql })
      });
      
      if (!response.ok) {
        const error = await response.json();
        console.error('  Error:', error.message || JSON.stringify(error).slice(0, 200));
      } else {
        const result = await response.json();
        console.log('  ✓ Applied');
      }
    } catch (err) {
      console.error('  Failed:', (err as Error).message);
    }
  }
}

applyMigrations();
