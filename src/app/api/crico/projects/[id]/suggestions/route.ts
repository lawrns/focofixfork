/**
 * CRICO Project Suggestions API
 * Generates and returns rule-based improvement suggestions for a project.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { getAuthUser } from '@/lib/api/auth-helper';

export const dynamic = 'force-dynamic';

interface HealthMetrics {
  total_tasks: number;
  done_tasks: number;
  stagnant: boolean;
  completion_rate: number;
  days_since_update: number;
}

async function computeHealthMetrics(projectId: string): Promise<HealthMetrics | null> {
  if (!supabaseAdmin) return null;

  const { data: project } = await supabaseAdmin
    .from('foco_projects')
    .select('id')
    .eq('id', projectId)
    .single();

  if (!project) return null;

  const { data: tasks } = await supabaseAdmin
    .from('work_items')
    .select('status, created_at, updated_at')
    .eq('project_id', projectId);

  const allTasks = tasks || [];
  const total_tasks = allTasks.length;
  const done_tasks = allTasks.filter(
    (t: any) => t.status === 'done' || t.status === 'completed'
  ).length;

  const completion_rate = total_tasks > 0 ? done_tasks / total_tasks : 0;

  const now = new Date();
  let days_since_update = 0;
  let stagnant = false;

  if (total_tasks > 0) {
    const latestUpdate = allTasks.reduce((latest: Date, t: any) => {
      const d = new Date(t.updated_at || t.created_at);
      return d > latest ? d : latest;
    }, new Date(0));
    days_since_update = Math.floor((now.getTime() - latestUpdate.getTime()) / (1000 * 60 * 60 * 24));
    stagnant = days_since_update >= 7;
  }

  return { total_tasks, done_tasks, stagnant, completion_rate, days_since_update };
}

interface SuggestionInput {
  project_id: string;
  category: string;
  severity: string;
  title: string;
  description: string;
  action_label?: string | null;
  action_url?: string | null;
  metadata?: Record<string, unknown>;
}

function generateSuggestions(projectId: string, metrics: HealthMetrics): SuggestionInput[] {
  const suggestions: SuggestionInput[] = [];
  const { total_tasks, done_tasks, stagnant, completion_rate, days_since_update } = metrics;

  const completionPct = Math.round(completion_rate * 100);

  if (completion_rate < 0.2 && total_tasks > 5) {
    suggestions.push({
      project_id: projectId,
      category: 'velocity',
      severity: 'high',
      title: 'Low task completion velocity',
      description: `Only ${completionPct}% of tasks are done. Consider reviewing and reprioritizing the backlog.`,
      action_label: null,
      action_url: null,
      metadata: { completion_rate, total_tasks, done_tasks },
    });
  }

  if (stagnant && days_since_update > 14) {
    suggestions.push({
      project_id: projectId,
      category: 'velocity',
      severity: 'high',
      title: 'Project appears stagnant',
      description: `No task activity in ${days_since_update} days. Check if the project is on hold or needs attention.`,
      action_label: null,
      action_url: null,
      metadata: { days_since_update },
    });
  }

  if (done_tasks === 0 && total_tasks > 3) {
    suggestions.push({
      project_id: projectId,
      category: 'task_quality',
      severity: 'medium',
      title: 'No tasks completed yet',
      description: 'Consider breaking down tasks into smaller, more actionable items.',
      action_label: null,
      action_url: null,
      metadata: { total_tasks },
    });
  }

  if (total_tasks === 0) {
    suggestions.push({
      project_id: projectId,
      category: 'general',
      severity: 'medium',
      title: 'No tasks found',
      description: 'Add tasks to this project to start tracking progress.',
      action_label: null,
      action_url: null,
      metadata: {},
    });
  }

  return suggestions;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error: authError } = await getAuthUser(request);
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ success: false, error: 'Service unavailable' }, { status: 503 });
    }

    const { id: projectId } = await params;

    const metrics = await computeHealthMetrics(projectId);
    if (!metrics) {
      return NextResponse.json({ success: true, data: [] });
    }

    const newSuggestions = generateSuggestions(projectId, metrics);

    // Delete old undismissed suggestions for this project
    await supabaseAdmin
      .from('crico_project_suggestions')
      .delete()
      .eq('project_id', projectId)
      .is('dismissed_at', null);

    if (newSuggestions.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    // Insert new suggestions
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('crico_project_suggestions')
      .insert(newSuggestions)
      .select();

    if (insertError) {
      console.error('[CRICO suggestions] insert error:', insertError);
      // Return generated suggestions even if DB insert fails
      return NextResponse.json({ success: true, data: newSuggestions });
    }

    return NextResponse.json({ success: true, data: inserted || newSuggestions });
  } catch (err) {
    console.error('[CRICO suggestions] unexpected error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
