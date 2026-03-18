import { NextRequest, NextResponse } from 'next/server';
import { successResponse, databaseErrorResponse, authRequiredResponse, forbiddenResponse, validationFailedResponse, missingFieldResponse } from '@/lib/api/response-helpers';
import { ContentAnalyzer } from '@/features/content-pipeline/services/content-analyzer';
import { logger } from '@/lib/logger';
import { authorizeAgentCallback } from '@/lib/security/agent-callback-auth'

export const dynamic = 'force-dynamic';

// Secret for validating callback requests
const CALLBACK_SECRET = process.env.CONTENT_PIPELINE_CALLBACK_SECRET;

/**
 * POST /api/content-pipeline/analysis-callback
 * Callback endpoint for ClawdBot to return analysis results
 * 
 * Expected payload:
 * {
 *   taskId: string,  // Contains content item ID in format "content-analysis-{itemId}"
 *   result: {
 *     summary: string,
 *     tags: string[],
 *     relevanceScore: number
 *   },
 *   secret?: string  // Optional validation
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()
    const bearerAuthorized = authorizeAgentCallback(req, rawBody)

    // Validate secret if configured for compatibility with older callers.
    if (!bearerAuthorized && CALLBACK_SECRET) {
      const secret = req.headers.get('x-callback-secret')
      if (secret !== CALLBACK_SECRET) {
        return forbiddenResponse('Invalid callback secret')
      }
    }

    if (!bearerAuthorized && !CALLBACK_SECRET) {
      return forbiddenResponse('Unauthorized callback')
    }

    const body = rawBody ? JSON.parse(rawBody) : {};

    // Extract item ID from task ID
    const taskId = body.task_id || body.taskId;
    if (!taskId) {
      return missingFieldResponse('taskId');
    }

    const itemIdMatch = taskId.match(/content-analysis-(.+)/);
    if (!itemIdMatch) {
      return validationFailedResponse('Invalid taskId format');
    }

    const itemId = itemIdMatch[1];

    // Parse analysis result
    let analysis;
    
    // Handle different response formats from ClawdBot
    if (body.output) {
      // Try to parse JSON from output
      try {
        analysis = typeof body.output === 'string' ? JSON.parse(body.output) : body.output;
      } catch {
        // If not valid JSON, treat as plain summary
        analysis = {
          summary: body.output,
          tags: [],
          relevanceScore: 0.5,
        };
      }
    } else if (body.result) {
      analysis = body.result;
    } else if (body.analysis) {
      analysis = body.analysis;
    } else {
      // Try to parse the whole body
      analysis = body;
    }

    // Validate analysis structure
    if (!analysis.summary && !body.output) {
      return validationFailedResponse('Missing summary in analysis result');
    }

    // Process the analysis result
    const success = await ContentAnalyzer.processAnalysisResult(itemId, {
      summary: analysis.summary || body.output || 'No summary available',
      tags: analysis.tags || analysis.Tags || [],
      themes: analysis.themes || analysis.Themes || [],
      relevanceScore: typeof analysis.relevanceScore === 'number' 
        ? analysis.relevanceScore 
        : typeof analysis.relevance_score === 'number'
          ? analysis.relevance_score
          : 0.5,
      signalType: analysis.signalType || analysis.signal_type,
      confidence: typeof analysis.confidence === 'number'
        ? analysis.confidence
        : typeof analysis.signal_confidence === 'number'
          ? analysis.signal_confidence
          : undefined,
      urgency: analysis.urgency || analysis.signal_urgency,
      affectedArea: analysis.affectedArea || analysis.affected_area,
      upgradeImplication: analysis.upgradeImplication || analysis.upgrade_implication,
      evidenceExcerpt: analysis.evidenceExcerpt || analysis.evidence_excerpt,
    });

    if (!success) {
      return databaseErrorResponse('Failed to save analysis result');
    }

    logger.info(`Analysis callback processed for item ${itemId}`);

    return successResponse({
      itemId,
      processed: true,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Error processing analysis callback:', message);
    return databaseErrorResponse('Failed to process analysis callback', message);
  }
}

/**
 * GET /api/content-pipeline/analysis-callback
 * Health check endpoint
 */
export async function GET() {
  return successResponse({
    status: 'healthy',
    endpoint: 'analysis-callback',
  });
}
