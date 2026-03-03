/**
 * /api/media/[id]
 * 
 * GET - Get asset metadata and public URL
 * DELETE - Delete asset from storage and database
 * PATCH - Update asset metadata
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper';
import { 
  successResponse, 
  authRequiredResponse,
  notFoundResponse,
  forbiddenResponse,
  internalErrorResponse,
} from '@/lib/api/response-helpers';
import { getAssetById, deleteAsset, updateAssetMetadata } from '@/features/media/services/media-storage';

export const dynamic = 'force-dynamic';

/**
 * GET /api/media/[id]
 * Get asset metadata and public URL
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error: authError, response: authResponse } = await getAuthUser(request);
  if (authError || !user) {
    return mergeAuthResponse(authRequiredResponse(), authResponse);
  }

  try {
    const { id } = await params;

    if (!id) {
      return mergeAuthResponse(
        notFoundResponse('Media asset', 'unknown'),
        authResponse
      );
    }

    const result = await getAssetById(id);

    if (!result.success) {
      if (result.error?.includes('not found')) {
        return mergeAuthResponse(
          notFoundResponse('Media asset', id),
          authResponse
        );
      }
      return mergeAuthResponse(
        internalErrorResponse(result.error || 'Failed to fetch asset'),
        authResponse
      );
    }

    return mergeAuthResponse(
      successResponse({ asset: result.asset }),
      authResponse
    );

  } catch (error) {
    console.error('Get asset error:', error);
    return mergeAuthResponse(
      internalErrorResponse(
        error instanceof Error ? error.message : 'Unknown error'
      ),
      authResponse
    );
  }
}

/**
 * DELETE /api/media/[id]
 * Delete asset from storage and database
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error: authError, response: authResponse } = await getAuthUser(request);
  if (authError || !user) {
    return mergeAuthResponse(authRequiredResponse(), authResponse);
  }

  try {
    const { id } = await params;

    if (!id) {
      return mergeAuthResponse(
        notFoundResponse('Media asset', 'unknown'),
        authResponse
      );
    }

    // First get the asset to check ownership
    const assetResult = await getAssetById(id);
    
    if (!assetResult.success) {
      if (assetResult.error?.includes('not found')) {
        return mergeAuthResponse(
          notFoundResponse('Media asset', id),
          authResponse
        );
      }
      return mergeAuthResponse(
        internalErrorResponse(assetResult.error || 'Failed to fetch asset'),
        authResponse
      );
    }

    const asset = assetResult.asset!;

    // Check ownership - creator or project owner can delete
    const canDelete = 
      asset.created_by === user.id ||
      await checkProjectOwnership(asset.project_id, user.id);

    if (!canDelete) {
      return mergeAuthResponse(
        forbiddenResponse('You can only delete your own assets or assets in projects you own'),
        authResponse
      );
    }

    // Delete the asset
    const deleteResult = await deleteAsset(id, user.id);

    if (!deleteResult.success) {
      return mergeAuthResponse(
        internalErrorResponse(deleteResult.error || 'Failed to delete asset'),
        authResponse
      );
    }

    return mergeAuthResponse(
      successResponse({ deleted: true, id }),
      authResponse
    );

  } catch (error) {
    console.error('Delete asset error:', error);
    return mergeAuthResponse(
      internalErrorResponse(
        error instanceof Error ? error.message : 'Unknown error'
      ),
      authResponse
    );
  }
}

/**
 * PATCH /api/media/[id]
 * Update asset metadata
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error: authError, response: authResponse } = await getAuthUser(request);
  if (authError || !user) {
    return mergeAuthResponse(authRequiredResponse(), authResponse);
  }

  try {
    const { id } = await params;

    if (!id) {
      return mergeAuthResponse(
        notFoundResponse('Media asset', 'unknown'),
        authResponse
      );
    }

    // Get the asset to check ownership
    const assetResult = await getAssetById(id);
    
    if (!assetResult.success) {
      if (assetResult.error?.includes('not found')) {
        return mergeAuthResponse(
          notFoundResponse('Media asset', id),
          authResponse
        );
      }
      return mergeAuthResponse(
        internalErrorResponse(assetResult.error || 'Failed to fetch asset'),
        authResponse
      );
    }

    const asset = assetResult.asset!;

    // Only creator can update metadata
    if (asset.created_by !== user.id) {
      return mergeAuthResponse(
        forbiddenResponse('You can only update your own assets'),
        authResponse
      );
    }

    // Parse request body
    let body: { metadata?: Record<string, unknown> };
    try {
      body = await request.json();
    } catch {
      return mergeAuthResponse(
        NextResponse.json(
          { success: false, error: 'Invalid JSON in request body' },
          { status: 400 }
        ),
        authResponse
      );
    }

    if (!body.metadata || typeof body.metadata !== 'object') {
      return mergeAuthResponse(
        NextResponse.json(
          { success: false, error: 'Metadata object is required' },
          { status: 400 }
        ),
        authResponse
      );
    }

    // Update metadata
    const updateResult = await updateAssetMetadata(id, body.metadata, user.id);

    if (!updateResult.success) {
      return mergeAuthResponse(
        internalErrorResponse(updateResult.error || 'Failed to update asset'),
        authResponse
      );
    }

    return mergeAuthResponse(
      successResponse({ asset: updateResult.asset }),
      authResponse
    );

  } catch (error) {
    console.error('Update asset error:', error);
    return mergeAuthResponse(
      internalErrorResponse(
        error instanceof Error ? error.message : 'Unknown error'
      ),
      authResponse
    );
  }
}

/**
 * Helper to check if user owns the project
 */
async function checkProjectOwnership(projectId: string | undefined | null, userId: string): Promise<boolean> {
  if (!projectId) return false;
  
  // Import supabase admin here to avoid circular dependencies
  const { supabaseAdmin } = await import('@/lib/supabase-server');
  if (!supabaseAdmin) return false;

  const { data, error } = await supabaseAdmin
    .from('foco_projects')
    .select('owner_id')
    .eq('id', projectId)
    .single();

  if (error || !data) return false;
  return data.owner_id === userId;
}
