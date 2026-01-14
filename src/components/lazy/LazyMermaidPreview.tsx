'use client';

import dynamic from 'next/dynamic';
import { ComponentProps } from 'react';

const MermaidPreview = dynamic(
  () => import('@/features/mermaid/components/MermaidPreview').then(mod => mod.MermaidPreview),
  {
    loading: () => (
      <div className="flex items-center justify-center h-64 border rounded-md bg-muted/10">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Rendering diagram...</p>
        </div>
      </div>
    ),
    ssr: false,
  }
);

export type LazyMermaidPreviewProps = ComponentProps<typeof MermaidPreview>;

export default MermaidPreview;
