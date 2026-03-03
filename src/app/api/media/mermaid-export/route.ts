/**
 * POST /api/media/mermaid-export
 * 
 * Export Mermaid diagram to PNG/SVG/PDF
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper';
import { 
  successResponse, 
  authRequiredResponse,
  validationFailedResponse,
  internalErrorResponse,
} from '@/lib/api/response-helpers';
import { ErrorCode } from '@/lib/api/response-envelope';
import { rateLimiter, RATE_LIMITS, getClientIP } from '@/lib/rate-limiter';
import { 
  renderMermaidToPng, 
  renderMermaidToSvg, 
  renderMermaidToPdf,
  isMermaidRenderingAvailable,
} from '@/features/media/services/mermaid-renderer';
import { 
  uploadAsset, 
  createAssetRecord, 
  generateStoragePath,
  getPublicUrl,
} from '@/features/media/services/media-storage';
import type { MermaidExportRequest } from '@/features/media/types';

export const dynamic = 'force-dynamic';

// Rate limit config for exports
const RATE_LIMIT_CONFIG = {
  ...RATE_LIMITS.EXPORT,
  maxRequests: 10,
};

export async function POST(request: NextRequest) {
  // Check rate limit
  const clientIP = getClientIP(request);
  const rateLimitKey = `mermaid-export:${clientIP}`;
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

  // Check if mermaid rendering is available
  if (!isMermaidRenderingAvailable()) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: ErrorCode.SERVICE_UNAVAILABLE,
          message: 'Mermaid rendering is not available. Puppeteer may not be installed or this environment does not support it.',
        },
      },
      { status: 503 }
    );
  }

  try {
    // Parse request body
    let body: MermaidExportRequest;
    try {
      body = await request.json();
    } catch {
      return validationFailedResponse('Invalid JSON in request body');
    }

    // Validate required fields
    if (!body.mermaidCode || body.mermaidCode.trim().length === 0) {
      return validationFailedResponse('Mermaid code is required');
    }

    if (!body.format || !['png', 'svg', 'pdf'].includes(body.format)) {
      return validationFailedResponse('Format must be png, svg, or pdf');
    }

    // Render based on format
    let renderResult;
    const renderOptions = {
      width: body.width,
      height: body.height,
      diagramName: body.diagramName,
    };

    switch (body.format) {
      case 'png':
        renderResult = await renderMermaidToPng(body.mermaidCode, renderOptions);
        break;
      case 'svg':
        renderResult = await renderMermaidToSvg(body.mermaidCode, { theme: 'default' });
        break;
      case 'pdf':
        renderResult = await renderMermaidToPdf(body.mermaidCode, renderOptions);
        break;
      default:
        return validationFailedResponse('Invalid format');
    }

    if (!renderResult.success || !renderResult.data) {
      return internalErrorResponse(renderResult.error || 'Rendering failed');
    }

    // Convert data to buffer
    let buffer: Buffer;
    let contentType: string;
    let extension: string;

    if (typeof renderResult.data === 'string') {
      // SVG string
      buffer = Buffer.from(renderResult.data, 'utf-8');
      contentType = 'image/svg+xml';
      extension = 'svg';
    } else {
      // Buffer (PNG/PDF)
      buffer = renderResult.data;
      contentType = body.format === 'pdf' ? 'application/pdf' : 'image/png';
      extension = body.format;
    }

    // Upload to storage
    const storagePath = generateStoragePath(user.id, 'mermaid_png', body.diagramName);
    const uploadResult = await uploadAsset(
      buffer,
      `${storagePath}.${extension}`,
      'media-assets',
      contentType
    );

    if (!uploadResult.success) {
      // If upload fails, we can still return the data directly for download
      // But for large diagrams, this isn't ideal
      console.warn('Storage upload failed, returning direct data:', uploadResult.error);
      
      // Create a data URL for immediate download
      const base64 = buffer.toString('base64');
      const dataUrl = `data:${contentType};base64,${base64}`;
      
      return mergeAuthResponse(
        successResponse({
          downloadUrl: dataUrl,
          format: body.format,
          warning: 'Storage upload failed. Download link is temporary.',
        }),
        authResponse
      );
    }

    // Create database record
    const recordResult = await createAssetRecord({
      project_id: body.projectId,
      type: 'mermaid_png',
      prompt: body.diagramName || `Mermaid diagram (${body.format.toUpperCase()})`,
      storage_path: `${storagePath}.${extension}`,
      storage_bucket: 'media-assets',
      public_url: uploadResult.publicUrl,
      gemini_model: undefined,
      tokens_used: 0,
      cost_usd: 0, // Mermaid exports are free (server compute only)
      metadata: {
        format: body.format,
        width: body.width,
        height: body.height,
        sourceCode: body.mermaidCode.slice(0, 1000), // Store truncated source
      },
      created_by: user.id,
    });

    if (!recordResult.success) {
      console.warn('Failed to create asset record:', recordResult.error);
      // Don't fail the request, just warn
    }

    // Return success response
    return mergeAuthResponse(
      successResponse({
        asset: recordResult.asset,
        downloadUrl: uploadResult.publicUrl,
        format: body.format,
      }),
      authResponse
    );

  } catch (error) {
    console.error('Mermaid export API error:', error);
    return mergeAuthResponse(
      internalErrorResponse(
        error instanceof Error ? error.message : 'Unknown error during export'
      ),
      authResponse
    );
  }
}

/**
 * GET /api/media/mermaid-export/status
 * Check if mermaid export is available
 */
export async function GET() {
  return successResponse({
    available: isMermaidRenderingAvailable(),
    formats: ['png', 'svg', 'pdf'],
    requiresPuppeteer: true,
  });
}
