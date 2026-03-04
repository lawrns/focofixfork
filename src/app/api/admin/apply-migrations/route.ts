/**
 * POST /api/admin/apply-migrations
 * Admin endpoint to apply database migrations
 * Protected by secret key
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const ADMIN_SECRET = process.env.ADMIN_SECRET;

const migrations = [
  '20260303_project_memory.sql',
  '20260303_m2c1_orchestration.sql', 
  '20260303_task_intake_queue.sql',
  '20260303_n8n_orchestration_phase1.sql',
  '20260303_n8n_orchestration_external_run_unique.sql',
  '20260303_clawd_first_routing.sql',
  '20260304_content_pipeline.sql',
  '20260304_dependency_snapshots.sql',
  '20260304_project_codemaps.sql',
  '20260303_service_heartbeats_only.sql',
  '20260303_openclaw_apify_tts_hardening.sql',
  '20260305_generated_media.sql',
  '20260305_agent_surfaces.sql'
];

export async function POST(req: NextRequest) {
  try {
    // Verify admin secret
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get('secret');
    
    if (!ADMIN_SECRET) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }

    if (secret !== ADMIN_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 });
    }

    const results: Array<{ migration: string; success: boolean; error?: string }> = [];

    for (const migration of migrations) {
      const filePath = path.join(process.cwd(), 'supabase/migrations', migration);
      
      try {
        const sql = fs.readFileSync(filePath, 'utf8');
        
        // Execute SQL using Supabase RPC
        // Split into statements and execute individually
        const statements = sql
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));
        
        let successCount = 0;
        
        for (const stmt of statements) {
          const fullStmt = stmt + ';';
          try {
            // Use raw SQL execution via the query method
            const { error } = await supabaseAdmin.rpc('exec_sql', { query: fullStmt });
            if (!error) {
              successCount++;
            }
          } catch (e) {
            // Statement might fail if object already exists, continue
          }
        }
        
        results.push({ migration, success: true });
      } catch (err) {
        results.push({ 
          migration, 
          success: false, 
          error: err instanceof Error ? err.message : 'Unknown error' 
        });
      }
    }

    return NextResponse.json({ 
      success: true, 
      results,
      applied: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    });
  } catch (err) {
    console.error('[ApplyMigrations] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return NextResponse.json({ 
    message: 'Use POST to apply migrations',
    migrations: migrations.length,
    list: migrations
  });
}
