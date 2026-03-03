/**
 * Nano Banana Media Module
 * 
 * Image generation via Gemini Flash and Mermaid diagram exports
 * 
 * @example
 * ```typescript
 * import { 
 *   generateImage, 
 *   renderMermaidToPng,
 *   uploadAsset,
 *   ImageGenerator 
 * } from '@/features/media';
 * 
 * // Generate an image
 * const result = await generateImage({ 
 *   prompt: 'A banana shaped like a rocket' 
 * });
 * 
 * // Export Mermaid diagram
 * const png = await renderMermaidToPng(`
 *   graph TD
 *     A[Start] --> B[End]
 * `);
 * ```
 */

// Types
export type {
  MediaAssetType,
  GeneratedMediaAsset,
  ImageGenerationOptions,
  MermaidExportOptions,
  ImageGenerationResult,
  MermaidRenderResult,
  MediaUploadResult,
  MediaGalleryFilters,
  MediaGalleryItem,
  GenerationProgress,
  GenerateImageRequest,
  GenerateImageResponse,
  MermaidExportRequest,
  MermaidExportResponse,
  GeminiImageRequest,
  GeminiImageResponse,
} from './types';

// Services
export { generateImage, isImageGenerationAvailable } from './services/gemini-image';
export { renderMermaidToPng, renderMermaidToSvg, isMermaidRenderingAvailable } from './services/mermaid-renderer';
export {
  uploadAsset,
  getPublicUrl,
  createAssetRecord,
  deleteAsset,
  listAssets,
  getAssetById,
} from './services/media-storage';

// Components
export { ImageGenerator } from './components/image-generator';
export { MermaidExportButton } from './components/mermaid-export-button';
export { MediaGallery } from './components/media-gallery';
