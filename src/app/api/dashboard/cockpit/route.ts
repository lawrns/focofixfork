import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { authRequiredResponse } from '@/lib/api/response-helpers'

export const dynamic = 'force-dynamic'

function cookieHeaders(req: NextRequest): HeadersInit {
  const headers: Record<string, string> = {}
  const cookie = req.headers.get('cookie')
  if (cookie) headers.cookie = cookie
  if (process.env.FOCO_LOCAL_TOKEN) headers['x-foco-local-token'] = process.env.FOCO_LOCAL_TOKEN
  return headers
}

async function fetchJson(req: NextRequest, path: string) {
  const res = await fetch(new URL(path, req.nextUrl.origin), {
    headers: cookieHeaders(req),
    cache: 'no-store',
  })

  const json = await res.json().catch(() => null)
  return { ok: res.ok, status: res.status, json }
}

export async function GET(req: NextRequest) {
  const { user, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  const [runtimeRes, runsRes, fleetRes, ledgerRes, projectsRes, agentsRes, workRes, proposalsRes, statsRes, decisionsRes, cronsRes, sessionsRes] = await Promise.all([
    fetchJson(req, '/api/openclaw/runtime'),
    fetchJson(req, '/api/runs?include=stream'),
    fetchJson(req, '/api/policies/fleet-status'),
    fetchJson(req, '/api/ledger?limit=18'),
    fetchJson(req, '/api/projects?limit=50'),
    fetchJson(req, '/api/command-center/agents'),
    fetchJson(req, '/api/my-work/assigned?limit=8'),
    fetchJson(req, '/api/proposals?limit=8'),
    fetchJson(req, '/api/dashboard/autonomous-stats'),
    fetchJson(req, '/api/command-center/decisions'),
    fetchJson(req, '/api/crons'),
    fetchJson(req, '/api/autonomy/sessions?limit=1'),
  ])

  const cronsData = Array.isArray(cronsRes.json?.data) ? cronsRes.json.data : []
  const activeLoops = cronsData.filter((job: { enabled?: boolean }) => job.enabled !== false).length

  const sessions = sessionsRes.json?.data?.sessions ?? sessionsRes.json?.sessions ?? []

  return mergeAuthResponse(NextResponse.json({
    data: {
      relayReachable: runtimeRes.ok ? runtimeRes.json?.data?.relayReachable ?? false : false,
      tokenValid: runtimeRes.ok ? runtimeRes.json?.data?.tokenConfigured ?? false : false,
      attachedTabs: runtimeRes.ok ? runtimeRes.json?.data?.attachedTabs ?? 0 : 0,
      openclawRuntime: runtimeRes.ok ? runtimeRes.json?.data ?? null : null,
      allRuns: runsRes.ok ? runsRes.json?.data ?? [] : [],
      fleetPaused: fleetRes.ok ? Boolean(fleetRes.json?.paused) : false,
      recentEvents: ledgerRes.ok ? ledgerRes.json?.data ?? ledgerRes.json?.events ?? [] : [],
      autonomousStats: statsRes.ok
        ? {
            improvementsWeek: statsRes.json?.improvementsWeek ?? 0,
            handbookEntries: statsRes.json?.improvementsMonth ?? 0,
          }
        : { improvementsWeek: 0, handbookEntries: 0 },
      projectOptions: projectsRes.ok ? projectsRes.json?.data?.projects ?? [] : [],
      agents: agentsRes.ok ? agentsRes.json?.agents ?? [] : [],
      workItems: workRes.ok ? workRes.json?.data?.tasks ?? [] : [],
      workSummary: workRes.ok
        ? {
            total: workRes.json?.data?.summary?.total ?? 0,
            urgent: workRes.json?.data?.summary?.urgent ?? 0,
            blocked: workRes.json?.data?.summary?.blocked ?? 0,
          }
        : { total: 0, urgent: 0, blocked: 0 },
      proposals: proposalsRes.ok ? proposalsRes.json?.data ?? [] : [],
      autonomy: {
        activeLoops,
        pendingDecisions: decisionsRes.ok ? decisionsRes.json?.decisions?.length ?? 0 : 0,
        latestSession: Array.isArray(sessions) ? sessions[0] ?? null : null,
      },
    },
  }), authResponse)
}
