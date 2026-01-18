import { NextRequest } from 'next/server'
import { ReminderService } from '@/features/tasks/services/reminder-service'
import {
  authRequiredResponse,
  successResponse,
  databaseErrorResponse
} from '@/lib/api/response-helpers'

/**
 * Cron job to check and send pending reminders
 * Should be called every minute via external cron service (e.g., GitHub Actions, Vercel Cron)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify the request is from an authorized source
    const authHeader = request.headers.get('authorization')
    const expectedToken = process.env.CRON_SECRET

    if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
      return authRequiredResponse('Invalid or missing cron token')
    }

    // Check and send pending reminders
    const result = await ReminderService.checkAndSendReminders()

    return successResponse({
      checked: result.checked,
      sent: result.sent,
      failed: result.failed,
      errors: result.errors,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return databaseErrorResponse('Failed to check reminders', message)
  }
}

/**
 * Alternative POST endpoint for external cron services
 */
export async function POST(request: NextRequest) {
  return GET(request)
}
