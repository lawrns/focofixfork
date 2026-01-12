import { NextRequest, NextResponse } from 'next/server';
import { EmailDigestScheduler } from '@/lib/services/email-digest-scheduler';

/**
 * Cron endpoint for sending email digests
 * This should be called periodically (e.g., every minute) by a cron service like:
 * - GitHub Actions (scheduled)
 * - Vercel Crons
 * - External service like cron-job.org
 *
 * Request: GET /api/cron/send-digests
 * Authorization: Bearer token in CRON_SECRET environment variable
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authorization
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || !authHeader || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Process digests
    await EmailDigestScheduler.processDailyAndWeeklyDigests();

    return NextResponse.json({
      success: true,
      message: 'Email digests processed successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in digest cron job:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
