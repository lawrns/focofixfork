/**
 * Server-side heartbeat — starts background intervals for:
 * 1. Delegation tick (every 30s)
 * 2. Project health scanner (every 5min)
 *
 * Call ensureHeartbeat() from a frequently-hit server route
 * (e.g. /api/empire/health) to guarantee startup.
 */

let started = false

const PORT = process.env.PORT ?? '3000'
const INTERNAL_TOKEN = process.env.DELEGATION_INTERNAL_TOKEN ?? ''
const CRON_SECRET = process.env.CRON_SECRET ?? ''

export function ensureHeartbeat() {
  if (started || typeof window !== 'undefined') return
  started = true

  console.log('[Heartbeat] Starting autonomous heartbeat intervals')

  // Delegation tick — every 30 seconds
  setInterval(async () => {
    try {
      await fetch(`http://127.0.0.1:${PORT}/api/delegation/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${INTERNAL_TOKEN}`,
        },
        signal: AbortSignal.timeout(15000),
      })
    } catch (err) {
      // Silently ignore — delegation endpoint logs its own errors
    }
  }, 30_000)

  // Project health scanner — every 5 minutes
  setInterval(async () => {
    try {
      await fetch(`http://127.0.0.1:${PORT}/api/cron/project-health`, {
        headers: { 'x-cron-secret': CRON_SECRET },
        signal: AbortSignal.timeout(30000),
      })
    } catch {
      // Silently ignore
    }
  }, 300_000)
}
