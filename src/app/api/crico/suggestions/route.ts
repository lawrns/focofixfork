/**
 * CRICO Suggestions API
 * Retrieve and manage proactive improvement suggestions
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import {
  getSuggestions,
  getPendingSuggestionsForUser,
  getSuggestionsByPriority,
  markSuggestionViewed,
  acceptSuggestion,
  dismissSuggestion,
  disagreeSuggestion,
  getSuggestionStats,
} from '@/lib/crico/suggestions/suggestion-engine';
import { recordSuggestionAction } from '@/lib/crico/audit/trust-calibration';

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
    const view = searchParams.get('view') || 'pending';

    switch (view) {
      case 'pending': {
        const suggestions = await getPendingSuggestionsForUser(userId);
        return NextResponse.json({ success: true, data: { suggestions } });
      }

      case 'byPriority': {
        const grouped = await getSuggestionsByPriority(userId);
        return NextResponse.json({ success: true, data: { grouped } });
      }

      case 'stats': {
        const stats = await getSuggestionStats(userId);
        return NextResponse.json({ success: true, data: { stats } });
      }

      case 'all': {
        const status = searchParams.get('status')?.split(',') as any;
        const category = searchParams.get('category')?.split(',') as any;
        const priority = searchParams.get('priority')?.split(',') as any;
        const limit = parseInt(searchParams.get('limit') || '50');

        const suggestions = await getSuggestions({
          userId,
          status,
          category,
          priority,
          limit,
        });
        return NextResponse.json({ success: true, data: { suggestions } });
      }

      default:
        return NextResponse.json({ error: `Unknown view: ${view}` }, { status: 400 });
    }
  } catch {
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
    const { action, suggestionId, feedback, dismissType, reason } = body;

    if (!suggestionId) {
      return NextResponse.json({ error: 'suggestionId is required' }, { status: 400 });
    }

    // Get suggestion to find category for trust calibration
    const { data: suggestion } = await (supabaseAdmin as any)
      .from('crico_suggestions')
      .select('category')
      .eq('id', suggestionId)
      .single();

    switch (action) {
      case 'view': {
        await markSuggestionViewed(suggestionId);
        return NextResponse.json({ success: true });
      }

      case 'accept': {
        await acceptSuggestion(suggestionId, feedback);
        if (suggestion?.category) {
          await recordSuggestionAction(userId, 'accepted', suggestion.category);
        }
        return NextResponse.json({ success: true });
      }

      case 'dismiss': {
        await dismissSuggestion(suggestionId, dismissType || 'instance', feedback);
        if (suggestion?.category) {
          await recordSuggestionAction(userId, 'dismissed', suggestion.category);
        }
        return NextResponse.json({ success: true });
      }

      case 'disagree': {
        if (!reason) {
          return NextResponse.json({ error: 'Reason is required for disagreement' }, { status: 400 });
        }
        await disagreeSuggestion(suggestionId, reason);
        if (suggestion?.category) {
          await recordSuggestionAction(userId, 'disagreed', suggestion.category);
        }
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
