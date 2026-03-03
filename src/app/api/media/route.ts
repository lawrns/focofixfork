/**
 * GET /api/media
 * 
 * List media assets with filtering and pagination
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper';
import { 
  successResponse, 
  authRequiredResponse,
  internalErrorResponse,
} from '@/lib/api/response-helpers';
import { listAssets } from '@/features/media/services/media-storage';
import type { MediaAssetType } from '@/features/media/types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/media
 * Query params:
 * - type: filter by asset type
 * - projectId: filter by project
 * - search: search in prompt
 * - limit: page size (default 20)
 * - offset: pagination offset (default 0)
 * - createdAfter: ISO date string
 * - createdBefore: ISO date string
 */
export async function GET(request: NextRequest) {
  const { user, error: authError, response: authResponse } = await getAuthUser(request);
  if (authError || !user) {
    return mergeAuthResponse(authRequiredResponse(), authResponse);
  }

  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    
    const type = searchParams.get('type') as MediaAssetType | undefined;
    const projectId = searchParams.get('projectId') || undefined;
    const searchQuery = searchParams.get('search') || undefined;
    const createdAfter = searchParams.get('createdAfter') || undefined;
    const createdBefore = searchParams.get('createdBefore') || undefined;
    
    const limit = Math.min(
      parseInt(searchParams.get('limit') || '20', 10),
      100 // Max limit
    );
    const offset = Math.max(
      parseInt(searchParams.get('offset') || '0', 10),
      0
    );

    // Build filters
    const filters = {
      ...(type && { type }),
      ...(projectId && { projectId }),
      ...(searchQuery && { searchQuery }),
      ...(createdAfter && { createdAfter }),
      ...(createdBefore && { createdBefore }),
    };

    // Fetch assets
    const result = await listAssets(filters, { limit, offset });

    if (!result.success) {
      return mergeAuthResponse(
        internalErrorResponse(result.error || 'Failed to fetch assets'),
        authResponse
      );
    }

    return mergeAuthResponse(
      successResponse({
        assets: result.assets,
        pagination: {
          total: result.total,
          limit,
          offset,
          hasMore: (offset + (result.assets?.length || 0)) < (result.total || 0),
        },
      }),
      authResponse
    );

  } catch (error) {
    console.error('List assets error:', error);
    return mergeAuthResponse(
      internalErrorResponse(
        error instanceof Error ? error.message : 'Unknown error'
      ),
      authResponse
    );
  }
}
