'use client';

import dynamic from 'next/dynamic';
import { ComponentProps } from 'react';

const MermaidEditor = dynamic(
  () => import('@/features/mermaid/components/MermaidEditor').then(mod => mod.MermaidEditor),
  {
    loading: () => (
      <div className="flex items-center justify-center h-[400px] border rounded-md bg-muted/10">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Loading editor...</p>
        </div>
      </div>
    ),
    ssr: false,
  }
);

export type LazyMermaidEditorProps = ComponentProps<typeof MermaidEditor>;

export default MermaidEditor;
