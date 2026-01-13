/**
 * CRICO Audit API
 * Access audit trail and integrity verification
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import {
  getAuditEntries,
  getActionAuditTrail,
  getAuditStats,
  runIntegrityCheck,
  exportAuditLog,
  getRecentSafetyViolations,
} from '@/lib/crico/audit/audit-service';
import { getTrustStats } from '@/lib/crico/audit/trust-calibration';

async function getAuthenticatedUser(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !supabaseAdmin) return null;
  
  const token = authHeader.replace('Bearer ', '');
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  return user?.id || null;
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view') || 'recent';

    switch (view) {
      case 'recent': {
        const limit = parseInt(searchParams.get('limit') || '50');
        const eventType = searchParams.get('eventType')?.split(',') as any;
        
        const entries = await getAuditEntries({
          userId,
          eventType,
          limit,
        });
        return NextResponse.json({ success: true, data: { entries } });
      }

      case 'action': {
        const actionId = searchParams.get('actionId');
        if (!actionId) {
          return NextResponse.json({ error: 'actionId is required' }, { status: 400 });
        }
        const trail = await getActionAuditTrail(actionId);
        return NextResponse.json({ success: true, data: { trail } });
      }

      case 'stats': {
        const stats = await getAuditStats(userId);
        return NextResponse.json({ success: true, data: { stats } });
      }

      case 'trust': {
        const trustStats = await getTrustStats(userId);
        return NextResponse.json({ success: true, data: { trustStats } });
      }

      case 'violations': {
        const limit = parseInt(searchParams.get('limit') || '50');
        const violations = await getRecentSafetyViolations(limit);
        return NextResponse.json({ success: true, data: { violations } });
      }

      default:
        return NextResponse.json({ error: `Unknown view: ${view}` }, { status: 400 });
    }
  } catch (error) {
    console.error('Audit API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'verifyIntegrity': {
        const limit = body.limit || 1000;
        const result = await runIntegrityCheck(userId, limit);
        return NextResponse.json({ success: true, data: { result } });
      }

      case 'export': {
        const { startDate, endDate } = body;
        
        if (!startDate || !endDate) {
          return NextResponse.json(
            { error: 'startDate and endDate are required' },
            { status: 400 }
          );
        }

        const exportData = await exportAuditLog(
          userId,
          new Date(startDate),
          new Date(endDate)
        );

        return NextResponse.json({ success: true, data: { export: exportData } });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    console.error('Audit API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
