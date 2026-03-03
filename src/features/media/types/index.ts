/**
 * Nano Banana Media - Type Definitions
 * 
 * Types for AI-generated images and Mermaid diagram exports
 */

export type MediaAssetType = 'thumbnail' | 'diagram_export' | 'generated_image' | 'mermaid_png';

export interface GeneratedMediaAsset {
  id: string;
  project_id?: string;
  type: MediaAssetType;
  prompt?: string;
  storage_path: string;
  storage_bucket: string;
  public_url?: string;
  gemini_model?: string;
  tokens_used?: number;
  cost_usd?: number;
  metadata: Record<string, unknown>;
  created_by?: string;
  created_at: string;
}

export interface ImageGenerationOptions {
  prompt: string;
  width?: number;
  height?: number;
  aspectRatio?: '1:1' | '4:3' | '16:9' | '9:16';
}

export interface MermaidExportOptions {
  mermaidCode: string;
  format: 'png' | 'svg' | 'pdf';
  width?: number;
  height?: number;
}

export interface ImageGenerationResult {
  success: boolean;
  asset?: GeneratedMediaAsset;
  error?: string;
  costEstimate?: number;
}

export interface MermaidRenderResult {
  success: boolean;
  data?: Buffer | string;
  format: 'png' | 'svg' | 'pdf';
  error?: string;
}

export interface MediaUploadResult {
  success: boolean;
  path?: string;
  publicUrl?: string;
  error?: string;
}

export interface MediaGalleryFilters {
  type?: MediaAssetType;
  projectId?: string;
  createdAfter?: string;
  createdBefore?: string;
  searchQuery?: string;
}

export interface MediaGalleryItem {
  asset: GeneratedMediaAsset;
  thumbnailUrl?: string;
}

export interface GenerationProgress {
  status: 'idle' | 'generating' | 'uploading' | 'complete' | 'error';
  progress: number;
  message?: string;
}

// API Request/Response types
export interface GenerateImageRequest {
  prompt: string;
  projectId?: string;
  aspectRatio?: '1:1' | '4:3' | '16:9' | '9:16';
  metadata?: Record<string, unknown>;
}

export interface GenerateImageResponse {
  success: boolean;
  asset?: GeneratedMediaAsset;
  error?: string;
}

export interface MermaidExportRequest {
  mermaidCode: string;
  format: 'png' | 'svg' | 'pdf';
  width?: number;
  height?: number;
  projectId?: string;
  diagramName?: string;
}

export interface MermaidExportResponse {
  success: boolean;
  asset?: GeneratedMediaAsset;
  downloadUrl?: string;
  error?: string;
}

// Gemini API types
export interface GeminiImageRequest {
  contents: Array<{
    role: string;
    parts: Array<{
      text?: string;
      inlineData?: {
        mimeType: string;
        data: string;
      };
    }>;
  }>;
  generationConfig?: {
    temperature?: number;
    topP?: number;
    topK?: number;
    maxOutputTokens?: number;
    responseModalities?: string[];
  };
}

export interface GeminiImageResponse {
  candidates?: Array<{
    content: {
      parts: Array<{
        text?: string;
        inlineData?: {
          mimeType: string;
          data: string;
        };
      }>;
    };
    finishReason?: string;
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
  error?: {
    code: number;
    message: string;
    status: string;
  };
}
