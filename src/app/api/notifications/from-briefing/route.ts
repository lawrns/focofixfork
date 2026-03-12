import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'

export async function POST(request: NextRequest) {
  const { user, supabase, response } = await getAuthUser(request)
  if (!user) {
    return mergeAuthResponse(NextResponse.json({ error: 'Auth required' }, { status: 401 }), response)
  }

  try {
    const body = await request.json()
    const { briefing, workspaceId: requestedWorkspaceId } = body

    if (!briefing) {
      return mergeAuthResponse(NextResponse.json({ error: 'Missing briefing data' }, { status: 400 }), response)
    }

    const notifications: Array<{
      user_id: string
      type: string
      title: string
      body: string
      metadata: Record<string, unknown>
      is_read: boolean
    }> = []

    // Generate notifications from briefing recommendations
    const recommendations = briefing.sections?.recommendations ?? []
    for (const rec of recommendations.slice(0, 3)) {
      notifications.push({
        user_id: user.id,
        type: 'ai_flag',
        title: `Briefing: ${typeof rec === 'string' ? rec.slice(0, 80) : 'New recommendation'}`,
        body: typeof rec === 'string' ? rec : JSON.stringify(rec),
        metadata: { source: 'briefing', date: briefing.date },
        is_read: false,
      })
    }

    // Generate notifications from top repos if any have high scores
    const topRepos = briefing.sections?.top_repos ?? []
    for (const repo of topRepos.filter((r: { score?: number }) => (r.score ?? 0) >= 8).slice(0, 2)) {
      notifications.push({
        user_id: user.id,
        type: 'ai_flag',
        title: `High-signal repo: ${repo.name}`,
        body: repo.description || repo.verdict || 'Scored highly in intelligence scan',
        metadata: { source: 'briefing', repo: repo.name, score: repo.score, date: briefing.date },
        is_read: false,
      })
    }

    // Generate notification from social intelligence if present
    const social = briefing.social_intelligence
    if (social && social.top_insights?.length > 0) {
      const topInsight = social.top_insights[0]
      if (topInsight.relevance >= 0.7) {
        notifications.push({
          user_id: user.id,
          type: 'ai_flag',
          title: `Intelligence: ${topInsight.summary?.slice(0, 80) ?? 'High relevance signal'}`,
          body: topInsight.summary ?? '',
          metadata: { source: 'social_intelligence', platform: topInsight.platform, relevance: topInsight.relevance, date: briefing.date },
          is_read: false,
        })
      }
    }

    if (notifications.length === 0) {
      return mergeAuthResponse(NextResponse.json({ ok: true, created: 0 }), response)
    }

    // Check for duplicates (same title + same date)
    const { data: existing } = await supabase
      .from('inbox_items')
      .select('title, metadata')
      .eq('user_id', user.id)
      .eq('type', 'ai_flag')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    const existingTitles = new Set((existing ?? []).map((n: { title: string }) => n.title))
    const newNotifications = notifications.filter((n) => !existingTitles.has(n.title))

    if (newNotifications.length === 0) {
      return mergeAuthResponse(NextResponse.json({ ok: true, created: 0, skipped: notifications.length }), response)
    }

    const workspaceId = await resolveWorkspaceId(supabase, user.id, requestedWorkspaceId)
    if (!workspaceId) {
      return mergeAuthResponse(
        NextResponse.json({ ok: true, created: 0, skipped: newNotifications.length, reason: 'no_workspace' }),
        response
      )
    }

    const { error } = await supabase.from('inbox_items').insert(
      newNotifications.map((n) => ({
        ...n,
        workspace_id: workspaceId,
      }))
    )

    if (error) {
      console.error('[notifications/from-briefing] insert error:', error)
      return mergeAuthResponse(NextResponse.json({ ok: false, error: error.message }, { status: 500 }), response)
    }

    return mergeAuthResponse(NextResponse.json({ ok: true, created: newNotifications.length }), response)
  } catch (err) {
    console.error('[notifications/from-briefing] error:', err)
    return mergeAuthResponse(NextResponse.json({ error: 'Internal error' }, { status: 500 }), response)
  }
}

async function resolveWorkspaceId(
  supabase: { from: (table: string) => any },
  userId: string,
  requestedWorkspaceId?: string | null
): Promise<string | null> {
  const query = supabase
    .from('foco_workspace_members')
    .select('workspace_id')
    .eq('user_id', userId)

  const membershipQuery = requestedWorkspaceId
    ? query.eq('workspace_id', requestedWorkspaceId)
    : query.limit(1)

  const { data, error } = await membershipQuery.maybeSingle()
  if (error) {
    console.error('[notifications/from-briefing] workspace lookup error:', error)
    return null
  }

  return data?.workspace_id ?? null
}
