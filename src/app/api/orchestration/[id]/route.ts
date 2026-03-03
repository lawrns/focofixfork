/**
 * GET /api/orchestration/[id] - Get workflow details with phases
 * DELETE /api/orchestration/[id] - Delete workflow
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET workflow with phases
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database not available' },
        { status: 500 }
      );
    }

    const { id } = await params;

    // Fetch workflow with phases
    const { data: workflow, error } = await supabaseAdmin
      .from('orchestration_workflows')
      .select(`
        *,
        phases:workflow_phases(*),
        project:foco_projects(id, name, slug)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('[Orchestration:API] Error fetching workflow:', error);
      return NextResponse.json(
        { error: error.message },
        { status: error.code === 'PGRST116' ? 404 : 500 }
      );
    }

    // Transform and sort phases
    const transformedWorkflow = {
      ...workflow,
      project: workflow.project?.[0] || null,
      phases: workflow.phases
        ?.sort((a: { phase_idx: number }, b: { phase_idx: number }) => a.phase_idx - b.phase_idx) || [],
    };

    return NextResponse.json({ workflow: transformedWorkflow });
  } catch (err) {
    console.error('[Orchestration:API] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unexpected error' },
      { status: 500 }
    );
  }
}

// DELETE workflow
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database not available' },
        { status: 500 }
      );
    }

    const { id } = await params;

    // The cascade delete will handle related phases and tasks
    const { error } = await supabaseAdmin
      .from('orchestration_workflows')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[Orchestration:API] Error deleting workflow:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Orchestration:API] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unexpected error' },
      { status: 500 }
    );
  }
}
