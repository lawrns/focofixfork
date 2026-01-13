/**
 * CRICO Alignment API
 * Check and monitor UI/API/DB alignment and drift detection
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import {
  checkUIAPIDBAlignment,
  saveAlignmentCheck,
  getRecentAlignmentChecks,
  calculateAlignmentScore,
  extractDatabaseSchema,
} from '@/lib/crico/alignment/alignment-engine';

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
    const view = searchParams.get('view') || 'score';

    switch (view) {
      case 'score': {
        const result = await calculateAlignmentScore();
        return NextResponse.json({ 
          success: true, 
          data: { 
            score: result.score,
            breakdown: result.breakdown,
            totalChecks: result.totalChecks,
            alignedChecks: result.alignedChecks,
          } 
        });
      }

      case 'recent': {
        const scope = searchParams.get('scope') || '';
        const limit = parseInt(searchParams.get('limit') || '10');
        const checks = await getRecentAlignmentChecks(scope, limit);
        return NextResponse.json({ success: true, data: { checks } });
      }

      case 'schema': {
        const table = searchParams.get('table');
        if (!table) {
          return NextResponse.json({ error: 'Table name is required' }, { status: 400 });
        }
        const schema = await extractDatabaseSchema(table);
        return NextResponse.json({ success: true, data: { schema } });
      }

      default:
        return NextResponse.json({ error: `Unknown view: ${view}` }, { status: 400 });
    }
  } catch (error) {
    console.error('Alignment API error:', error);
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
      case 'check': {
        const { entityName, dbTable, apiEndpoint, uiFormFields } = body;
        
        if (!entityName || !dbTable) {
          return NextResponse.json(
            { error: 'entityName and dbTable are required' },
            { status: 400 }
          );
        }

        const result = await checkUIAPIDBAlignment(
          entityName,
          dbTable,
          apiEndpoint,
          uiFormFields
        );

        // Save the check result
        const checkId = await saveAlignmentCheck(
          'ui_api_db',
          entityName,
          result,
          userId
        );

        return NextResponse.json({
          success: true,
          data: {
            checkId,
            aligned: result.aligned,
            severity: result.severity,
            mismatches: result.mismatches,
            recommendations: result.recommendations,
            confidence: result.confidence,
          },
        });
      }

      case 'checkMultiple': {
        const { entities } = body;
        
        if (!entities || !Array.isArray(entities)) {
          return NextResponse.json(
            { error: 'entities array is required' },
            { status: 400 }
          );
        }

        const results = [];
        for (const entity of entities) {
          const result = await checkUIAPIDBAlignment(
            entity.name,
            entity.dbTable,
            entity.apiEndpoint,
            entity.uiFormFields
          );

          await saveAlignmentCheck('ui_api_db', entity.name, result, userId);
          
          results.push({
            entity: entity.name,
            aligned: result.aligned,
            severity: result.severity,
            mismatchCount: result.mismatches.length,
          });
        }

        return NextResponse.json({
          success: true,
          data: { results },
        });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    console.error('Alignment API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
