import { createClawdCron, getClawdCrons } from '@/lib/clawdbot/crons-client'

const EMAIL_DIGEST_CRON_NAME = 'email-digest-dispatcher'
const EMAIL_DIGEST_CRON_HANDLER = 'api/cron/send-digests'
const EMAIL_DIGEST_CRON_SCHEDULE = '* * * * *'

/**
 * Email digests are user-specific preferences evaluated at runtime.
 * We only need one global dispatcher cron that runs every minute and
 * lets the scheduler decide which users are due right now.
 */
export async function ensureEmailDigestCron(): Promise<void> {
  try {
    const { crons } = await getClawdCrons()
    const exists = crons.some(
      (cron) =>
        cron.name === EMAIL_DIGEST_CRON_NAME ||
        cron.handler === EMAIL_DIGEST_CRON_HANDLER,
    )

    if (exists) return

    await createClawdCron({
      name: EMAIL_DIGEST_CRON_NAME,
      schedule: EMAIL_DIGEST_CRON_SCHEDULE,
      handler: EMAIL_DIGEST_CRON_HANDLER,
      description:
        'Dispatches daily and weekly email digests according to saved user preferences.',
      enabled: true,
    })

    console.log('[email-digest-cron] Created email digest dispatcher cron in ClawdBot')
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.warn('[email-digest-cron] ensureEmailDigestCron failed (non-fatal):', message)
  }
}
