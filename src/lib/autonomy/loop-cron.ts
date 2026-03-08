import { getClawdCrons, createClawdCron } from '@/lib/clawdbot/crons-client'

const LOOP_TICKER_NAME = 'cofounder-loop-tick'
const LOOP_TICKER_SCHEDULE = '* * * * *'
const LOOP_TICKER_HANDLER = 'loop-tick'

/**
 * Idempotently ensure the per-minute loop-tick cron job exists in ClawdBot.
 * Creates the cron if it doesn't already exist.
 * Called on loop create / resume — errors are swallowed (non-fatal).
 */
export async function ensureLoopTickerCron(): Promise<void> {
  try {
    // Check if cron already exists
    const { crons } = await getClawdCrons()
    const exists = crons.some((c) => c.name === LOOP_TICKER_NAME)
    if (exists) return

    // Create the ticker cron
    await createClawdCron({
      name: LOOP_TICKER_NAME,
      schedule: LOOP_TICKER_SCHEDULE,
      handler: LOOP_TICKER_HANDLER,
      description: 'Co-founder loop tick — fires every minute to dispatch due loop iterations',
      enabled: true,
    })

    console.log('[loop-cron] Created cofounder-loop-tick cron in ClawdBot')
  } catch (error: unknown) {
    // Non-fatal: log and swallow
    const message = error instanceof Error ? error.message : String(error)
    console.warn('[loop-cron] ensureLoopTickerCron failed (non-fatal):', message)
  }
}
