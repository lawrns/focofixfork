import { NextRequest, NextResponse } from 'next/server'
import { ReminderService } from '@/features/tasks/services/reminder-service'

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
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check and send pending reminders
    const result = await ReminderService.checkAndSendReminders()

    return NextResponse.json({
      success: true,
      data: {
        checked: result.checked,
        sent: result.sent,
        failed: result.failed,
        errors: result.errors,
      },
    })
  } catch (error: any) {
    console.error('Reminder check error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to check reminders',
      },
      { status: 500 }
    )
  }
}

/**
 * Alternative POST endpoint for external cron services
 */
export async function POST(request: NextRequest) {
  return GET(request)
}
