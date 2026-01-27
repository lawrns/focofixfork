/**
 * FocoBot Cron Job API
 * 
 * Handles scheduled notifications:
 * - Morning summaries
 * - Evening digests
 * - Overdue reminders
 * - Deadline reminders
 * 
 * This endpoint should be called by a scheduler (e.g., Vercel Cron,
 * GitHub Actions, or an external cron service) every minute.
 */

import { NextRequest, NextResponse } from 'next/server';
import { focoBotNotificationService } from '@/lib/focobot/notification-service';

// Cron secret for authentication
const CRON_SECRET = process.env.FOCOBOT_CRON_SECRET;

/**
 * GET handler for cron job
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!CRON_SECRET || token !== CRON_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const results = {
      morningSummaries: 0,
      eveningDigests: 0,
      overdueReminders: 0,
      deadlineReminders: 0,
      errors: [] as string[]
    };

    // 1. Send morning summaries
    try {
      const morningUsers = await focoBotNotificationService.getUsersForMorningSummary();
      for (const user of morningUsers) {
        const success = await focoBotNotificationService.sendMorningSummary(
          user.userId,
          user.phoneNumber
        );
        if (success) {
          results.morningSummaries++;
        }
      }
    } catch (error) {
      results.errors.push(`Morning summaries: ${(error as Error).message}`);
    }

    // 2. Send evening digests
    try {
      const eveningUsers = await focoBotNotificationService.getUsersForEveningDigest();
      for (const user of eveningUsers) {
        const success = await focoBotNotificationService.sendEveningDigest(
          user.userId,
          user.phoneNumber
        );
        if (success) {
          results.eveningDigests++;
        }
      }
    } catch (error) {
      results.errors.push(`Evening digests: ${(error as Error).message}`);
    }

    // 3. Send overdue reminders (run every hour at minute 0)
    const currentMinute = new Date().getMinutes();
    if (currentMinute === 0) {
      try {
        results.overdueReminders = await focoBotNotificationService.sendOverdueReminders();
      } catch (error) {
        results.errors.push(`Overdue reminders: ${(error as Error).message}`);
      }
    }

    // 4. Send deadline reminders (run at 18:00)
    const currentHour = new Date().getHours();
    if (currentHour === 18 && currentMinute === 0) {
      try {
        results.deadlineReminders = await focoBotNotificationService.sendDeadlineReminders();
      } catch (error) {
        results.errors.push(`Deadline reminders: ${(error as Error).message}`);
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results
    });
  } catch (error) {
    console.error('FocoBot cron error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: (error as Error).message
      },
      { status: 500 }
    );
  }
}

/**
 * POST handler for manual trigger (admin only)
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify admin access
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!CRON_SECRET || token !== CRON_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action, userId, phoneNumber } = body;

    switch (action) {
      case 'morning_summary':
        if (!userId || !phoneNumber) {
          return NextResponse.json(
            { error: 'Missing userId or phoneNumber' },
            { status: 400 }
          );
        }
        const morningResult = await focoBotNotificationService.sendMorningSummary(userId, phoneNumber);
        return NextResponse.json({ success: morningResult });

      case 'evening_digest':
        if (!userId || !phoneNumber) {
          return NextResponse.json(
            { error: 'Missing userId or phoneNumber' },
            { status: 400 }
          );
        }
        const eveningResult = await focoBotNotificationService.sendEveningDigest(userId, phoneNumber);
        return NextResponse.json({ success: eveningResult });

      case 'overdue_reminders':
        const count = await focoBotNotificationService.sendOverdueReminders();
        return NextResponse.json({ success: true, count });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('FocoBot cron POST error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: (error as Error).message
      },
      { status: 500 }
    );
  }
}
