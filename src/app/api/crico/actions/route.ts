/**
 * CRICO Actions API
 * Create, execute, and manage actions with authority controls
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import {
  createAction,
  executeAction,
  approveAction,
  cancelAction,
  checkAuthorityGates,
  type CreateActionInput,
} from '@/lib/crico/actions/action-executor';
import type { Environment, CricoAction } from '@/lib/crico/types';

async function getAuthenticatedUser(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !supabaseAdmin) return null;
  
  const token = authHeader.replace('Bearer ', '');
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  return user?.id || null;
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { operation } = body;

    switch (operation) {
      case 'create': {
        const input: CreateActionInput = {
          source: body.source || 'api',
          intent: body.intent,
          intentParsed: body.intentParsed,
          authorityLevel: body.authorityLevel || 'read',
          scope: body.scope || 'system',
          steps: body.steps || [],
          userId,
          sessionId: request.headers.get('x-session-id') || undefined,
          environment: body.environment || 'development',
          confidence: body.confidence,
          riskScore: body.riskScore,
          reversible: body.reversible,
          rollbackPlan: body.rollbackPlan,
          metadata: body.metadata,
        };

        const action = await createAction(input);
        return NextResponse.json({ success: true, data: { action } });
      }

      case 'execute': {
        if (!body.actionId) {
          return NextResponse.json({ error: 'actionId is required' }, { status: 400 });
        }

        // Get action from database
        const { data: actionData, error } = await (supabaseAdmin as any)
          .from('crico_actions')
          .select('*')
          .eq('id', body.actionId)
          .eq('user_id', userId)
          .single();

        if (error || !actionData) {
          return NextResponse.json({ error: 'Action not found' }, { status: 404 });
        }

        // Map to CricoAction
        const action: CricoAction = mapDbAction(actionData);
        const result = await executeAction(action);
        
        return NextResponse.json({ success: true, data: { result } });
      }

      case 'approve': {
        if (!body.actionId) {
          return NextResponse.json({ error: 'actionId is required' }, { status: 400 });
        }

        const approved = await approveAction(body.actionId, userId);
        return NextResponse.json({ success: true, data: { approved } });
      }

      case 'cancel': {
        if (!body.actionId) {
          return NextResponse.json({ error: 'actionId is required' }, { status: 400 });
        }

        const cancelled = await cancelAction(body.actionId);
        return NextResponse.json({ success: true, data: { cancelled } });
      }

      case 'checkGates': {
        if (!body.actionId) {
          return NextResponse.json({ error: 'actionId is required' }, { status: 400 });
        }

        const { data: actionData, error } = await (supabaseAdmin as any)
          .from('crico_actions')
          .select('*')
          .eq('id', body.actionId)
          .single();

        if (error || !actionData) {
          return NextResponse.json({ error: 'Action not found' }, { status: 404 });
        }

        const action = mapDbAction(actionData);
        const gateResult = await checkAuthorityGates(action);
        
        return NextResponse.json({ success: true, data: { gateResult } });
      }

      default:
        return NextResponse.json({ error: `Unknown operation: ${operation}` }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '20');

    let query = (supabaseAdmin as any)
      .from('crico_actions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: 'Failed to retrieve actions' }, { status: 500 });
    }

    const actions = (data || []).map(mapDbAction);
    return NextResponse.json({ success: true, data: { actions } });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function mapDbAction(row: any): CricoAction {
  return {
    id: row.id,
    source: row.source,
    intent: row.intent,
    intentParsed: row.intent_parsed,
    authorityLevel: row.authority_level,
    scope: row.scope,
    steps: row.steps || [],
    dependencies: row.dependencies || [],
    reversible: row.reversible,
    rollbackPlan: row.rollback_plan,
    requiresApproval: row.requires_approval,
    approvalLevel: row.approval_level,
    confidence: row.confidence,
    riskScore: row.risk_score,
    status: row.status,
    createdAt: new Date(row.created_at),
    approvedAt: row.approved_at ? new Date(row.approved_at) : undefined,
    approvedBy: row.approved_by,
    executedAt: row.executed_at ? new Date(row.executed_at) : undefined,
    completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
    userId: row.user_id,
    sessionId: row.session_id,
    environment: row.environment,
    result: row.result,
    errorMessage: row.error_message,
    metadata: row.metadata || {},
  };
}
