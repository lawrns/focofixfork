/**
 * GET /api/orchestration - List workflows
 * POST /api/orchestration - Create new workflow
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { createWorkflow } from '@/features/orchestration/services/orchestration-engine';

export const dynamic = 'force-dynamic';

// GET list workflows
export async function GET(req: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database not available' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('project_id');

    let query = supabaseAdmin
      .from('orchestration_workflows')
      .select(`
        *,
        project:foco_projects(id, name, slug)
      `)
      .order('created_at', { ascending: false });

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data: workflows, error } = await query;

    if (error) {
      console.error('[Orchestration:API] Error fetching workflows:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Transform project from array to object
    interface WorkflowWithProject {
      project?: { id: string; name: string; slug: string }[] | null;
      [key: string]: unknown;
    }
    const transformedWorkflows = workflows?.map((w: WorkflowWithProject) => ({
      ...w,
      project: w.project?.[0] || null,
    }));

    return NextResponse.json({ workflows: transformedWorkflows });
  } catch (err) {
    console.error('[Orchestration:API] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unexpected error' },
      { status: 500 }
    );
  }
}

// POST create workflow
export async function POST(req: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database not available' },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { project_id, title, brain_dump } = body;

    if (!project_id || !title?.trim()) {
      return NextResponse.json(
        { error: 'Missing required fields: project_id and title' },
        { status: 400 }
      );
    }

    const result = await createWorkflow({
      project_id,
      title: title.trim(),
      brain_dump: brain_dump?.trim(),
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to create workflow' },
        { status: 500 }
      );
    }

    return NextResponse.json({ workflow: result.workflow }, { status: 201 });
  } catch (err) {
    console.error('[Orchestration:API] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unexpected error' },
      { status: 500 }
    );
  }
}
