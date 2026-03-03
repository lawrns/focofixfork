/**
 * GET /api/cron/project-health
 *
 * Scans active projects and calculates health metrics:
 * velocity, quality, staleness, overdue ratio, autonomous improvement counts.
 * Generates CRICO suggestions for critical thresholds.
 *
 * Protected by CRON_SECRET. Optionally accepts ?project_id= for single-project recalc.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

const CRON_SECRET = process.env.CRON_SECRET

export async function GET(req: NextRequest) {
  const cronHeader = req.headers.get('x-cron-secret')
  if (CRON_SECRET && cronHeader !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'DB not available' }, { status: 500 })
  }

  try {
    const targetProjectId = req.nextUrl.searchParams.get('project_id')

    // Fetch active projects
    let projectQuery = supabaseAdmin
      .from('foco_projects')
      .select('id, name, slug')
      .or('status.eq.active,status.is.null')

    if (targetProjectId) {
      projectQuery = projectQuery.eq('id', targetProjectId)
    }

    const { data: projects, error: projectsError } = await projectQuery.limit(50)

    if (projectsError || !projects) {
      return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
    }

    const now = new Date()
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const results = []

    for (const project of projects) {
      // Tasks completed this week vs last week (velocity)
      const [thisWeekRes, lastWeekRes] = await Promise.all([
        supabaseAdmin
          .from('work_items')
          .select('id', { count: 'exact', head: true })
          .eq('project_id', project.id)
          .eq('delegation_status', 'completed')
          .gte('updated_at', oneWeekAgo.toISOString()),
        supabaseAdmin
          .from('work_items')
          .select('id', { count: 'exact', head: true })
          .eq('project_id', project.id)
          .eq('delegation_status', 'completed')
          .gte('updated_at', twoWeeksAgo.toISOString())
          .lt('updated_at', oneWeekAgo.toISOString()),
      ])

      const thisWeekCount = thisWeekRes.count ?? 0
      const lastWeekCount = lastWeekRes.count ?? 0
      const velocityDelta = lastWeekCount > 0
        ? ((thisWeekCount - lastWeekCount) / lastWeekCount) * 100
        : 0

      // Quality: % of pipeline reviews that passed
      const { count: totalReviews } = await supabaseAdmin
        .from('pipeline_runs')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', project.id)
        .eq('status', 'complete')
        .gte('created_at', oneWeekAgo.toISOString())

      const { count: passedReviews } = await supabaseAdmin
        .from('pipeline_runs')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', project.id)
        .eq('status', 'complete')
        .eq('review_result->>verdict', 'pass')
        .gte('created_at', oneWeekAgo.toISOString())

      const qualityPct = (totalReviews ?? 0) > 0
        ? Math.round(((passedReviews ?? 0) / (totalReviews ?? 1)) * 100)
        : 100

      // Staleness: days since last activity
      const { data: lastActivity } = await supabaseAdmin
        .from('work_items')
        .select('updated_at')
        .eq('project_id', project.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      const stalenessDays = lastActivity?.updated_at
        ? Math.floor((now.getTime() - new Date(lastActivity.updated_at).getTime()) / (24 * 60 * 60 * 1000))
        : 999

      // Overdue ratio
      const { count: totalOpen } = await supabaseAdmin
        .from('work_items')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', project.id)
        .neq('delegation_status', 'completed')

      const { count: overdueCount } = await supabaseAdmin
        .from('work_items')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', project.id)
        .neq('delegation_status', 'completed')
        .lt('due_date', now.toISOString())

      const overdueRatio = (totalOpen ?? 0) > 0
        ? Math.round(((overdueCount ?? 0) / (totalOpen ?? 1)) * 100)
        : 0

      // Autonomous improvements (D2)
      const [weekImprovements, monthImprovements] = await Promise.all([
        supabaseAdmin
          .from('work_items')
          .select('id', { count: 'exact', head: true })
          .eq('project_id', project.id)
          .eq('delegation_status', 'completed')
          .eq('source', 'crico_auto')
          .gte('updated_at', oneWeekAgo.toISOString()),
        supabaseAdmin
          .from('work_items')
          .select('id', { count: 'exact', head: true })
          .eq('project_id', project.id)
          .eq('delegation_status', 'completed')
          .eq('source', 'crico_auto')
          .gte('updated_at', oneMonthAgo.toISOString()),
      ])

      // Upsert health record
      const healthRecord = {
        project_id: project.id,
        velocity_this_week: thisWeekCount,
        velocity_last_week: lastWeekCount,
        velocity_delta_pct: velocityDelta,
        quality_pct: qualityPct,
        staleness_days: stalenessDays,
        overdue_ratio_pct: overdueRatio,
        autonomous_improvements_week: weekImprovements.count ?? 0,
        autonomous_improvements_month: monthImprovements.count ?? 0,
        calculated_at: now.toISOString(),
      }

      await supabaseAdmin
        .from('crico_project_health')
        .upsert(healthRecord, { onConflict: 'project_id' })

      // Generate suggestions for critical thresholds
      const suggestions = []

      if (stalenessDays > 7) {
        suggestions.push({
          project_id: project.id,
          category: 'staleness',
          title: `Project "${project.name}" has been inactive for ${stalenessDays} days`,
          severity: stalenessDays > 14 ? 'critical' : 'high',
          confidence: 0.9,
          dismissed: false,
        })
      }

      if (overdueRatio > 50) {
        suggestions.push({
          project_id: project.id,
          category: 'overdue',
          title: `${overdueRatio}% of tasks in "${project.name}" are overdue`,
          severity: overdueRatio > 75 ? 'critical' : 'high',
          confidence: 0.95,
          dismissed: false,
        })
      }

      if (qualityPct < 60 && (totalReviews ?? 0) > 2) {
        suggestions.push({
          project_id: project.id,
          category: 'quality',
          title: `Review pass rate for "${project.name}" is only ${qualityPct}%`,
          severity: 'high',
          confidence: 0.85,
          dismissed: false,
        })
      }

      if (suggestions.length > 0) {
        await supabaseAdmin.from('crico_project_suggestions').insert(suggestions)
      }

      results.push({ projectId: project.id, ...healthRecord, suggestionsGenerated: suggestions.length })
    }

    return NextResponse.json({ ok: true, projects: results.length, results })
  } catch (err) {
    console.error('[cron/project-health] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
