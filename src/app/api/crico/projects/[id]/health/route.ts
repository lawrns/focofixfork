/**
 * CRICO Project Health API
 * Calculates and returns health scores for a project based on task data.
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

function calculateHealthScores(metrics: HealthMetrics) {
  const { total_tasks, done_tasks, stagnant, completion_rate } = metrics;

  // velocity_score
  const velocity_score = total_tasks > 0
    ? Math.round((done_tasks / total_tasks) * 100)
    : 50;

  // time_score
  const time_score = stagnant ? 30 : 70;

  // quality_score
  let quality_score: number;
  if (total_tasks === 0) {
    quality_score = 50;
  } else if (completion_rate > 0.7) {
    quality_score = 80;
  } else if (completion_rate > 0.5) {
    quality_score = 60;
  } else if (completion_rate > 0.3) {
    quality_score = 40;
  } else {
    quality_score = 20;
  }

  // team_score
  let team_score: number;
  if (total_tasks > 10) {
    team_score = 80;
  } else if (total_tasks > 5) {
    team_score = 65;
  } else if (total_tasks > 0) {
    team_score = 50;
  } else {
    team_score = 30;
  }

  // overall_score: weighted average
  const overall_score = Math.round(
    velocity_score * 0.35 +
    quality_score * 0.25 +
    team_score * 0.20 +
    time_score * 0.20
  );

  // status
  let status: 'healthy' | 'at_risk' | 'critical';
  if (overall_score >= 70) {
    status = 'healthy';
  } else if (overall_score >= 45) {
    status = 'at_risk';
  } else {
    status = 'critical';
  }

  return { velocity_score, quality_score, team_score, time_score, overall_score, status };
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

    // Fetch project
    const { data: project, error: projectError } = await supabaseAdmin
      .from('foco_projects')
      .select('id, name, status, created_at, updated_at, workspace_id')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      // Return unknown health for missing project
      return NextResponse.json({
        success: true,
        data: {
          project_id: projectId,
          overall_score: 0,
          velocity_score: 0,
          quality_score: 0,
          team_score: 0,
          time_score: 0,
          status: 'unknown',
          metrics: {},
          calculated_at: new Date().toISOString(),
        },
      });
    }

    // Fetch tasks
    const { data: tasks } = await supabaseAdmin
      .from('work_items')
      .select('status, created_at, updated_at, due_date')
      .eq('project_id', projectId);

    const allTasks = tasks || [];
    const total_tasks = allTasks.length;
    const done_tasks = allTasks.filter(
      (t: any) => t.status === 'done' || t.status === 'completed'
    ).length;

    const completion_rate = total_tasks > 0 ? done_tasks / total_tasks : 0;

    // Stagnancy: no tasks updated in 7+ days
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

    const metrics: HealthMetrics = {
      total_tasks,
      done_tasks,
      stagnant,
      completion_rate,
      days_since_update,
    };

    const scores = calculateHealthScores(metrics);

    const healthRecord = {
      project_id: projectId,
      overall_score: scores.overall_score,
      velocity_score: scores.velocity_score,
      quality_score: scores.quality_score,
      team_score: scores.team_score,
      time_score: scores.time_score,
      status: scores.status,
      metrics,
      calculated_at: now.toISOString(),
    };

    // Insert new health record (keeps history)
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('crico_project_health')
      .insert(healthRecord)
      .select()
      .single();

    if (insertError) {
      console.error('[CRICO health] insert error:', insertError);
    }

    return NextResponse.json({ success: true, data: inserted || healthRecord });
  } catch (err) {
    console.error('[CRICO health] unexpected error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
