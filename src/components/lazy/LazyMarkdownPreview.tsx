'use client';

import dynamic from 'next/dynamic';
import { ComponentProps } from 'react';

const MarkdownPreview = dynamic(
  () => import('@/components/markdown-preview/markdown-preview').then(mod => mod.MarkdownPreview),
  {
    loading: () => (
      <div className="flex items-center justify-center h-32 border rounded-md bg-muted/10">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto" />
          <p className="text-xs text-muted-foreground">Loading preview...</p>
        </div>
      </div>
    ),
    ssr: false,
  }
);

export type LazyMarkdownPreviewProps = ComponentProps<typeof MarkdownPreview>;

export default MarkdownPreview;
