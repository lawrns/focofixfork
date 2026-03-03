/**
 * Media Storage Service
 * 
 * Handles upload, retrieval, and deletion of media assets in Supabase Storage
 */

import { supabaseAdmin } from '@/lib/supabase-server';
import type { 
  GeneratedMediaAsset, 
  MediaUploadResult, 
  MediaAssetType,
  MediaGalleryFilters 
} from '../types';

const DEFAULT_BUCKET = 'media-assets';

/**
 * Generate a unique storage path for an asset
 */
export function generateStoragePath(
  userId: string, 
  type: MediaAssetType, 
  filename?: string
): string {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 10);
  const extension = type === 'mermaid_png' || type === 'generated_image' ? 'png' : 
                    type === 'thumbnail' ? 'jpg' : 'png';
  const name = filename || `${type}_${timestamp}_${randomId}`;
  
  return `${userId}/${type}/${name}.${extension}`;
}

/**
 * Upload asset to Supabase Storage
 */
export async function uploadAsset(
  buffer: Buffer,
  path: string,
  bucket: string = DEFAULT_BUCKET,
  contentType: string = 'image/png'
): Promise<MediaUploadResult> {
  if (!supabaseAdmin) {
    return {
      success: false,
      error: 'Supabase admin client not available. Check server environment configuration.',
    };
  }

  try {
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(path, buffer, {
        contentType,
        upsert: false,
      });

    if (error) {
      console.error('Storage upload error:', error);
      return {
        success: false,
        error: `Failed to upload asset: ${error.message}`,
      };
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(path);

    return {
      success: true,
      path: data.path,
      publicUrl,
    };

  } catch (error) {
    console.error('Error uploading asset:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during upload',
    };
  }
}

/**
 * Get public URL for an asset
 */
export function getPublicUrl(
  path: string,
  bucket: string = DEFAULT_BUCKET
): string {
  if (!supabaseAdmin) {
    // Fallback for browser environment
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    return `${url}/storage/v1/object/public/${bucket}/${path}`;
  }

  const { data: { publicUrl } } = supabaseAdmin.storage
    .from(bucket)
    .getPublicUrl(path);

  return publicUrl;
}

/**
 * Create database record for a media asset
 */
export async function createAssetRecord(
  assetData: Omit<GeneratedMediaAsset, 'id' | 'created_at'>
): Promise<{ success: boolean; asset?: GeneratedMediaAsset; error?: string }> {
  if (!supabaseAdmin) {
    return {
      success: false,
      error: 'Supabase admin client not available',
    };
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('generated_media_assets')
      .insert({
        ...assetData,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating asset record:', error);
      return {
        success: false,
        error: `Failed to create asset record: ${error.message}`,
      };
    }

    return {
      success: true,
      asset: data as GeneratedMediaAsset,
    };

  } catch (error) {
    console.error('Error creating asset record:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get asset by ID
 */
export async function getAssetById(
  id: string
): Promise<{ success: boolean; asset?: GeneratedMediaAsset; error?: string }> {
  if (!supabaseAdmin) {
    return {
      success: false,
      error: 'Supabase admin client not available',
    };
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('generated_media_assets')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return {
        success: false,
        error: `Failed to fetch asset: ${error.message}`,
      };
    }

    if (!data) {
      return {
        success: false,
        error: 'Asset not found',
      };
    }

    return {
      success: true,
      asset: data as GeneratedMediaAsset,
    };

  } catch (error) {
    console.error('Error fetching asset:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * List assets with filters and pagination
 */
export async function listAssets(
  filters: MediaGalleryFilters = {},
  options: { limit?: number; offset?: number; orderBy?: 'created_at' | 'type' } = {}
): Promise<{ 
  success: boolean; 
  assets?: GeneratedMediaAsset[]; 
  total?: number;
  error?: string 
}> {
  if (!supabaseAdmin) {
    return {
      success: false,
      error: 'Supabase admin client not available',
    };
  }

  const { limit = 20, offset = 0, orderBy = 'created_at' } = options;

  try {
    let query = supabaseAdmin
      .from('generated_media_assets')
      .select('*', { count: 'exact' });

    // Apply filters
    if (filters.type) {
      query = query.eq('type', filters.type);
    }
    if (filters.projectId) {
      query = query.eq('project_id', filters.projectId);
    }
    if (filters.createdAfter) {
      query = query.gte('created_at', filters.createdAfter);
    }
    if (filters.createdBefore) {
      query = query.lte('created_at', filters.createdBefore);
    }

    // Apply ordering and pagination
    query = query
      .order(orderBy, { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error listing assets:', error);
      return {
        success: false,
        error: `Failed to list assets: ${error.message}`,
      };
    }

    return {
      success: true,
      assets: (data || []) as GeneratedMediaAsset[],
      total: count || 0,
    };

  } catch (error) {
    console.error('Error listing assets:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Delete asset from storage and database
 */
export async function deleteAsset(
  id: string,
  userId?: string
): Promise<{ success: boolean; error?: string }> {
  if (!supabaseAdmin) {
    return {
      success: false,
      error: 'Supabase admin client not available',
    };
  }

  try {
    // First get the asset to find storage path
    const { data: asset, error: fetchError } = await supabaseAdmin
      .from('generated_media_assets')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !asset) {
      return {
        success: false,
        error: 'Asset not found',
      };
    }

    // Check ownership if userId provided
    if (userId && asset.created_by !== userId) {
      // Check if user is project owner
      const { data: project } = await supabaseAdmin
        .from('foco_projects')
        .select('owner_id')
        .eq('id', asset.project_id)
        .single();

      if (!project || project.owner_id !== userId) {
        return {
          success: false,
          error: 'Not authorized to delete this asset',
        };
      }
    }

    // Delete from storage
    const { error: storageError } = await supabaseAdmin.storage
      .from(asset.storage_bucket)
      .remove([asset.storage_path]);

    if (storageError) {
      console.warn('Error deleting from storage:', storageError);
      // Continue to delete DB record even if storage delete fails
    }

    // Delete from database
    const { error: deleteError } = await supabaseAdmin
      .from('generated_media_assets')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting asset record:', deleteError);
      return {
        success: false,
        error: `Failed to delete asset record: ${deleteError.message}`,
      };
    }

    return { success: true };

  } catch (error) {
    console.error('Error deleting asset:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Update asset metadata
 */
export async function updateAssetMetadata(
  id: string,
  metadata: Record<string, unknown>,
  userId?: string
): Promise<{ success: boolean; asset?: GeneratedMediaAsset; error?: string }> {
  if (!supabaseAdmin) {
    return {
      success: false,
      error: 'Supabase admin client not available',
    };
  }

  try {
    // Verify ownership
    if (userId) {
      const { data: existing } = await supabaseAdmin
        .from('generated_media_assets')
        .select('created_by')
        .eq('id', id)
        .single();

      if (!existing || existing.created_by !== userId) {
        return {
          success: false,
          error: 'Not authorized to update this asset',
        };
      }
    }

    const { data, error } = await supabaseAdmin
      .from('generated_media_assets')
      .update({ metadata })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: `Failed to update asset: ${error.message}`,
      };
    }

    return {
      success: true,
      asset: data as GeneratedMediaAsset,
    };

  } catch (error) {
    console.error('Error updating asset:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get storage usage statistics for a user
 */
export async function getUserStorageStats(
  userId: string
): Promise<{ 
  success: boolean; 
  stats?: { 
    totalAssets: number; 
    totalSize?: number;
    byType: Record<string, number>;
  }; 
  error?: string 
}> {
  if (!supabaseAdmin) {
    return {
      success: false,
      error: 'Supabase admin client not available',
    };
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('generated_media_assets')
      .select('type')
      .eq('created_by', userId);

    if (error) {
      return {
        success: false,
        error: `Failed to get stats: ${error.message}`,
      };
    }

    const byType: Record<string, number> = {};
    data?.forEach((asset: { type: string }) => {
      byType[asset.type] = (byType[asset.type] || 0) + 1;
    });

    return {
      success: true,
      stats: {
        totalAssets: data?.length || 0,
        byType,
      },
    };

  } catch (error) {
    console.error('Error getting storage stats:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
