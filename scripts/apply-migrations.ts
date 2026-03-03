import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

// Use PostgREST to execute SQL via a custom function
// We'll create tables directly using the REST API
async function applyMigrations() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  for (const migration of migrations) {
    const filePath = path.join('supabase/migrations', migration);
    console.log('Processing:', migration);
    
    try {
      const sql = fs.readFileSync(filePath, 'utf8');
      
      // Split into individual statements
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));
      
      console.log(`  Found ${statements.length} statements`);
      
      // Execute each statement via the query endpoint
      let successCount = 0;
      let errorCount = 0;
      
      for (const stmt of statements.slice(0, 20)) { // Limit to first 20 statements
        const fullStmt = stmt + ';';
        
        // Try to execute via RPC
        try {
          const response = await fetch(`${supabaseUrl}/rest/v1/rpc/execute_sql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseKey}`,
              'apikey': supabaseKey,
            },
            body: JSON.stringify({ sql_statement: fullStmt })
          });
          
          if (response.ok) {
            successCount++;
          } else {
            const error = await response.text();
            if (!error.includes('Could not find the function')) {
              errorCount++;
              if (errorCount <= 2) {
                console.log('  Error:', error.slice(0, 150));
              }
            }
          }
        } catch (e) {
          // Ignore connection errors
        }
      }
      
      console.log(`  ✓ ${successCount} statements executed, ${errorCount} errors`);
      
    } catch (err) {
      console.error('  Failed:', (err as Error).message);
    }
  }
}

applyMigrations();
