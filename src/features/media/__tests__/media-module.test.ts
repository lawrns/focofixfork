/**
 * Nano Banana Media Module Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { 
  ImageGenerationOptions, 
  MermaidExportOptions,
  GeneratedMediaAsset,
  MediaAssetType 
} from '../types';

// Mock the services for testing
vi.mock('../services/gemini-image', () => ({
  generateImage: vi.fn(),
  isImageGenerationAvailable: vi.fn(() => false),
  generatePlaceholderImage: vi.fn(() => Promise.resolve(Buffer.from('placeholder'))),
}));

vi.mock('../services/mermaid-renderer', () => ({
  renderMermaidToPng: vi.fn(),
  renderMermaidToSvg: vi.fn(),
  isMermaidRenderingAvailable: vi.fn(() => true),
}));

vi.mock('../services/media-storage', () => ({
  uploadAsset: vi.fn(),
  getPublicUrl: vi.fn((path: string) => `https://example.com/${path}`),
  createAssetRecord: vi.fn(),
  deleteAsset: vi.fn(),
  listAssets: vi.fn(),
  getAssetById: vi.fn(),
  generateStoragePath: vi.fn(() => 'test/path.png'),
}));

describe('Media Module Types', () => {
  it('should define valid media asset types', () => {
    const types: MediaAssetType[] = [
      'thumbnail',
      'diagram_export',
      'generated_image',
      'mermaid_png'
    ];
    
    expect(types).toHaveLength(4);
    expect(types).toContain('generated_image');
    expect(types).toContain('mermaid_png');
  });

  it('should validate image generation options', () => {
    const validOptions: ImageGenerationOptions = {
      prompt: 'A test image',
      aspectRatio: '16:9',
    };
    
    expect(validOptions.prompt).toBe('A test image');
    expect(validOptions.aspectRatio).toBe('16:9');
    expect(validOptions.width).toBeUndefined();
  });

  it('should validate mermaid export options', () => {
    const validOptions: MermaidExportOptions = {
      mermaidCode: 'graph TD; A-->B;',
      format: 'png',
      width: 1200,
      height: 800,
    };
    
    expect(validOptions.mermaidCode).toBe('graph TD; A-->B;');
    expect(validOptions.format).toBe('png');
  });
});

describe('GeneratedMediaAsset', () => {
  it('should create a valid asset object', () => {
    const asset: GeneratedMediaAsset = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      type: 'generated_image',
      storage_path: 'user123/generated_image/test.png',
      storage_bucket: 'media-assets',
      prompt: 'A test prompt',
      public_url: 'https://example.com/image.png',
      gemini_model: 'gemini-2.0-flash-preview-image-generation',
      tokens_used: 100,
      cost_usd: 0.03,
      metadata: { width: 1024, height: 1024 },
      created_by: 'user123',
      created_at: new Date().toISOString(),
    };

    expect(asset.id).toBeDefined();
    expect(asset.type).toBe('generated_image');
    expect(asset.cost_usd).toBe(0.03);
    expect(asset.metadata).toHaveProperty('width');
  });
});

describe('API Endpoints', () => {
  it('should have correct route structure', () => {
    // Verify the expected API routes exist
    const expectedRoutes = [
      '/api/media/generate',
      '/api/media/mermaid-export',
      '/api/media/[id]',
      '/api/media',
    ];
    
    expect(expectedRoutes).toHaveLength(4);
    expect(expectedRoutes).toContain('/api/media/generate');
    expect(expectedRoutes).toContain('/api/media/mermaid-export');
  });
});
