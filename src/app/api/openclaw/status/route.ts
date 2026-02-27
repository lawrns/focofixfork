import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const DEFAULT_RELAY = 'http://127.0.0.1:18792'

/**
 * GET /api/openclaw/status
 * Proxies to the local OpenClaw gateway and returns a unified status object.
 * Called by the /openclaw page every 5 s.
 */
export async function GET(req: NextRequest) {
  const relayUrl = process.env.FOCO_OPENCLAW_RELAY ?? DEFAULT_RELAY
  const token = process.env.FOCO_OPENCLAW_TOKEN ?? process.env.OPENCLAW_SERVICE_TOKEN ?? ''

  const result = {
    relay: { reachable: false, url: relayUrl, port: extractPort(relayUrl) },
    token: { configured: !!token, valid: false },
    profiles: [] as Array<{ name: string; active: boolean }>,
    tabs: [] as Array<{ id: string; title: string; url: string; attached: boolean }>,
  }

  try {
    const headers: Record<string, string> = {}
    if (token) headers['Authorization'] = `Bearer ${token}`

    const res = await fetch(`${relayUrl}/health`, {
      headers,
      signal: AbortSignal.timeout(3000),
    })

    if (res.ok) {
      result.relay.reachable = true
      result.token.valid = true

      const body = await res.json().catch(() => ({}))

      // Normalize tab list (gateway may use different shapes)
      const rawTabs: Array<Record<string, unknown>> = body.tabs ?? body.attached_tabs ?? []
      result.tabs = rawTabs.map(t => ({
        id:       String(t.id ?? t.tabId ?? ''),
        title:    String(t.title ?? t.name ?? ''),
        url:      String(t.url ?? ''),
        attached: Boolean(t.attached ?? true),
      }))

      // Normalize profiles
      const rawProfiles: Array<Record<string, unknown>> = body.profiles ?? []
      result.profiles = rawProfiles.map(p => ({
        name:   String(p.name ?? p.profile ?? ''),
        active: Boolean(p.active ?? p.current ?? false),
      }))

      // If no profiles returned but a profile name is present at top level
      if (result.profiles.length === 0 && body.profile) {
        result.profiles = [{ name: String(body.profile), active: true }]
      }
    } else {
      // Token may be wrong
      result.relay.reachable = true
      result.token.valid = false
    }
  } catch {
    // Relay unreachable — result.relay.reachable stays false
  }

  return NextResponse.json(result)
}

function extractPort(url: string): number {
  try {
    return parseInt(new URL(url).port) || 18792
  } catch {
    return 18792
  }
}
