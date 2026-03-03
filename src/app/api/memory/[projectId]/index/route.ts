/**
 * GET /api/memory/[projectId]/index - Get memory index summary
 * POST /api/memory/[projectId]/index - Trigger re-indexing
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { 
  indexFromHandbook, 
  getMemoryStats, 
  generateHygieneReport, 
  generateMemoryIndex 
} from '@/features/memory';

export const dynamic = 'force-dynamic';

interface Params {
  params: Promise<{ projectId: string }>;
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { projectId } = await params;
    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format');

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 });
    }

    // Return markdown if requested
    if (format === 'markdown') {
      const markdown = await generateMemoryIndex(projectId);
      return new NextResponse(markdown, {
        headers: {
          'Content-Type': 'text/markdown',
          'Content-Disposition': `attachment; filename="AI_MEMORY_INDEX_${projectId.slice(0, 8)}.md"`,
        },
      });
    }

    // Get stats and report
    const [stats, report] = await Promise.all([
      getMemoryStats(projectId),
      generateHygieneReport(projectId),
    ]);

    return NextResponse.json({ stats, report });
  } catch (err) {
    console.error('[Memory:Index:GET] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { projectId } = await params;

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 });
    }

    // Get project slug
    const { data: project, error: projectError } = await supabaseAdmin
      .from('foco_projects')
      .select('slug')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Index from handbook
    const result = await indexFromHandbook(projectId, project.slug);

    // Get updated stats
    const stats = await getMemoryStats(projectId);

    return NextResponse.json({
      success: true,
      segmentsCreated: result.segmentsCreated,
      tokensIndexed: result.tokensIndexed,
      stats,
    });
  } catch (err) {
    console.error('[Memory:Index:POST] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
