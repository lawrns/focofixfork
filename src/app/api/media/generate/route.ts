/**
 * POST /api/media/generate
 * 
 * Generate an image using Gemini Flash and save to storage
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper';
import { 
  successResponse, 
  errorResponse, 
  authRequiredResponse,
  validationFailedResponse,
  internalErrorResponse,
} from '@/lib/api/response-helpers';
import { ErrorCode } from '@/lib/api/response-envelope';
import { rateLimiter, RATE_LIMITS, getClientIP } from '@/lib/rate-limiter';
import { generateImage, generatePlaceholderImage } from '@/features/media/services/gemini-image';
import { uploadAsset, createAssetRecord, generateStoragePath } from '@/features/media/services/media-storage';
import type { GenerateImageRequest } from '@/features/media/types';

export const dynamic = 'force-dynamic';

// Rate limit config for image generation
const RATE_LIMIT_CONFIG = {
  ...RATE_LIMITS.AI,
  maxRequests: 5, // More restrictive for image generation
};

export async function POST(request: NextRequest) {
  // Check rate limit
  const clientIP = getClientIP(request);
  const rateLimitKey = `image-gen:${clientIP}`;
  const { allowed, info } = rateLimiter.checkLimit(rateLimitKey, RATE_LIMIT_CONFIG);

  if (!allowed) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: ErrorCode.RATE_LIMIT_EXCEEDED,
          message: `Rate limit exceeded. Try again in ${info.retryAfter} seconds.`,
          retryAfter: info.retryAfter,
        },
      },
      { 
        status: 429,
        headers: {
          'X-RateLimit-Limit': info.limit.toString(),
          'X-RateLimit-Remaining': info.remaining.toString(),
          'Retry-After': info.retryAfter?.toString() || '60',
        },
      }
    );
  }

  // Authenticate user
  const { user, error: authError, response: authResponse } = await getAuthUser(request);
  if (authError || !user) {
    return mergeAuthResponse(authRequiredResponse(), authResponse);
  }

  try {
    // Parse request body
    let body: GenerateImageRequest;
    try {
      body = await request.json();
    } catch {
      return validationFailedResponse('Invalid JSON in request body');
    }

    // Validate prompt
    if (!body.prompt || body.prompt.trim().length === 0) {
      return validationFailedResponse('Prompt is required');
    }

    if (body.prompt.length > 4000) {
      return validationFailedResponse('Prompt must be less than 4000 characters');
    }

    // Generate image
    const generationResult = await generateImage({
      prompt: body.prompt,
      aspectRatio: body.aspectRatio,
    }, user.id);

    // Handle generation failure
    if (!generationResult.success) {
      // If Gemini is not configured, generate a placeholder
      if (generationResult.error?.includes('not configured')) {
        console.log('Gemini not configured, generating placeholder');
        const placeholderBuffer = await generatePlaceholderImage({
          prompt: body.prompt,
          aspectRatio: body.aspectRatio,
        });

        // Upload placeholder
        const storagePath = generateStoragePath(user.id, 'generated_image');
        const uploadResult = await uploadAsset(
          placeholderBuffer,
          storagePath,
          'media-assets',
          'image/png'
        );

        if (!uploadResult.success) {
          return internalErrorResponse('Failed to upload placeholder');
        }

        // Create DB record
        const recordResult = await createAssetRecord({
          project_id: body.projectId,
          type: 'generated_image',
          prompt: body.prompt,
          storage_path: storagePath,
          storage_bucket: 'media-assets',
          public_url: uploadResult.publicUrl,
          gemini_model: 'placeholder',
          tokens_used: 0,
          cost_usd: 0,
          metadata: {
            placeholder: true,
            aspectRatio: body.aspectRatio || '1:1',
          },
          created_by: user.id,
        });

        if (!recordResult.success) {
          return internalErrorResponse('Failed to create asset record');
        }

        return mergeAuthResponse(
          successResponse({
            asset: recordResult.asset,
            warning: 'Using placeholder image. Set GEMINI_API_KEY for real generation.',
          }),
          authResponse
        );
      }

      // Real generation error
      return internalErrorResponse(generationResult.error || 'Image generation failed');
    }

    // Get the buffer from generation result
    const generationWithBuffer = generationResult as typeof generationResult & { _buffer?: Buffer };
    const imageBuffer = generationWithBuffer._buffer;

    if (!imageBuffer) {
      return internalErrorResponse('No image data received from generator');
    }

    // Upload to storage
    const storagePath = generateStoragePath(user.id, 'generated_image');
    const uploadResult = await uploadAsset(
      imageBuffer,
      storagePath,
      'media-assets',
      'image/png'
    );

    if (!uploadResult.success) {
      return internalErrorResponse(uploadResult.error || 'Failed to upload image');
    }

    // Create database record
    const recordResult = await createAssetRecord({
      project_id: body.projectId,
      type: 'generated_image',
      prompt: body.prompt,
      storage_path: storagePath,
      storage_bucket: 'media-assets',
      public_url: uploadResult.publicUrl,
      gemini_model: generationResult.asset?.gemini_model,
      tokens_used: generationResult.asset?.tokens_used,
      cost_usd: generationResult.costEstimate || 0.03,
      metadata: generationResult.asset?.metadata || {},
      created_by: user.id,
    });

    if (!recordResult.success) {
      return internalErrorResponse(recordResult.error || 'Failed to create asset record');
    }

    // Return success response
    return mergeAuthResponse(
      successResponse({
        asset: recordResult.asset,
        cost: generationResult.costEstimate || 0.03,
      }),
      authResponse
    );

  } catch (error) {
    console.error('Image generation API error:', error);
    return mergeAuthResponse(
      internalErrorResponse(
        error instanceof Error ? error.message : 'Unknown error during image generation'
      ),
      authResponse
    );
  }
}

/**
 * GET /api/media/generate/status
 * Check if image generation is available
 */
export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY;
  
  return successResponse({
    available: !!apiKey,
    model: apiKey ? 'gemini-2.0-flash-preview-image-generation' : null,
    estimatedCost: 0.03,
  });
}
