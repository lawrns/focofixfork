/**
 * GET /api/memory - List memory segments for a project
 * POST /api/memory - Add manual segment or run hygiene action
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { pruneStaleSegments, deduplicateSegments, getMemoryStats, generateHygieneReport } from '@/features/memory';
import type { MemorySegment, MemoryTopic, MemorySource } from '@/features/memory/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    const topic = searchParams.get('topic') as MemoryTopic | null;
    const limit = parseInt(searchParams.get('limit') || '100');

    if (!projectId) {
      return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 });
    }

    let query = supabaseAdmin
      .from('project_memory_segments')
      .select('*')
      .eq('project_id', projectId)
      .order('relevance_score', { ascending: false })
      .limit(limit);

    if (topic) {
      query = query.eq('topic', topic);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[Memory:GET] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ segments: data as MemorySegment[] });
  } catch (err) {
    console.error('[Memory:GET] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    if (action === 'prune') {
      const projectId = searchParams.get('projectId');
      if (!projectId) {
        return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
      }
      const result = await pruneStaleSegments(projectId, false);
      return NextResponse.json({ success: true, removed: result.removed });
    }

    if (action === 'dedupe') {
      const projectId = searchParams.get('projectId');
      if (!projectId) {
        return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
      }
      const result = await deduplicateSegments(projectId, false);
      return NextResponse.json({ success: true, removed: result.removed });
    }

    // Add manual segment
    const body = await req.json();
    const { project_id, topic, content, source = 'manual', relevance_score = 0.5 } = body;

    if (!project_id || !topic || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: project_id, topic, content' },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 });
    }

    // Estimate tokens
    const tokenCount = Math.ceil(content.length / 4);

    const { data, error } = await supabaseAdmin
      .from('project_memory_segments')
      .insert({
        project_id,
        topic: topic as MemoryTopic,
        content,
        token_count: tokenCount,
        source: source as MemorySource,
        relevance_score,
      })
      .select()
      .single();

    if (error) {
      console.error('[Memory:POST] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ segment: data as MemorySegment }, { status: 201 });
  } catch (err) {
    console.error('[Memory:POST] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
