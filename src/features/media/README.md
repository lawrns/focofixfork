# Nano Banana Media Module

AI-powered image generation and Mermaid diagram export for Foco.

## Features

- **AI Image Generation**: Generate images using Google's Gemini Flash
- **Mermaid Diagram Export**: Export diagrams as PNG, SVG, or PDF
- **Supabase Storage Integration**: Automatic asset storage and retrieval
- **Cost Tracking**: Track estimated costs per generation (~$0.03/image)
- **Gallery Management**: Browse, download, and delete generated assets

## Setup

### Environment Variables

```bash
# Required for AI image generation
GEMINI_API_KEY=your_gemini_api_key

# Supabase (should already be configured)
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### Database Migration

Run the migration to create the storage bucket and media assets table:

```bash
supabase db push
# Or apply manually:
# supabase/migrations/20260305_generated_media.sql
```

## Usage

### Image Generation Component

```tsx
import { ImageGenerator } from '@/features/media';

function MyComponent() {
  return (
    <ImageGenerator 
      projectId="optional-project-id"
      onAssetCreated={(asset) => console.log('Created:', asset)}
    />
  );
}
```

### Mermaid Export Button

```tsx
import { MermaidExportButton } from '@/features/media';

function DiagramComponent({ mermaidCode }) {
  return (
    <MermaidExportButton
      mermaidCode={mermaidCode}
      diagramName="my-diagram"
      projectId="optional-project-id"
    />
  );
}
```

### Media Gallery

```tsx
import { MediaGallery } from '@/features/media';

function GalleryPage() {
  return (
    <MediaGallery 
      projectId="optional-project-id"
      onSelect={(asset) => console.log('Selected:', asset)}
      selectable={true}
    />
  );
}
```

### API Usage

#### Generate Image

```bash
POST /api/media/generate
Content-Type: application/json

{
  "prompt": "A minimalist banana logo",
  "aspectRatio": "1:1",
  "projectId": "optional-uuid"
}
```

#### Export Mermaid

```bash
POST /api/media/mermaid-export
Content-Type: application/json

{
  "mermaidCode": "graph TD; A-->B;",
  "format": "png",
  "width": 1200,
  "height": 800
}
```

#### List Assets

```bash
GET /api/media?type=generated_image&limit=20&offset=0
```

## Architecture

```
src/features/media/
├── types/index.ts           # TypeScript definitions
├── services/
│   ├── gemini-image.ts      # Gemini API integration
│   ├── mermaid-renderer.ts  # Puppeteer-based rendering
│   └── media-storage.ts     # Supabase storage operations
├── components/
│   ├── image-generator.tsx  # Image generation UI
│   ├── mermaid-export-button.tsx  # Export button component
│   └── media-gallery.tsx    # Asset gallery grid
└── index.ts                 # Public exports

src/app/api/media/
├── generate/route.ts        # Image generation endpoint
├── mermaid-export/route.ts  # Mermaid export endpoint
├── [id]/route.ts           # Asset CRUD operations
└── route.ts                # List assets endpoint
```

## Cost Tracking

- **Gemini Image Generation**: ~$0.03 per image
- **Mermaid Export**: Free (server-side rendering only)
- Costs are tracked in the `cost_usd` column of `generated_media_assets`

## Rate Limiting

- Image generation: 5 requests per minute per IP
- Mermaid export: 10 requests per minute per IP

## Fallback Behavior

If `GEMINI_API_KEY` is not configured:
- Image generation returns a placeholder SVG
- Placeholders are watermarked "Image generation not configured"
- All functionality still works for testing/demo purposes
