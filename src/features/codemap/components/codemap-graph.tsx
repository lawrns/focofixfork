'use client';

import React from 'react';
import { MermaidPreview } from '@/features/mermaid/components/MermaidPreview';

interface CodemapGraphProps {
  mermaidCode: string;
  className?: string;
}

export const CodemapGraph: React.FC<CodemapGraphProps> = ({ 
  mermaidCode,
  className = '' 
}) => {
  return (
    <div className={`border rounded-lg overflow-hidden bg-white dark:bg-gray-900 ${className}`}>
      <div className="p-3 border-b bg-gray-50 dark:bg-gray-800">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200">
          Dependency Graph
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Visual representation of file dependencies
        </p>
      </div>
      <div className="p-4">
        <MermaidPreview 
          code={mermaidCode}
          className="min-h-[400px]"
          showErrors={true}
        />
      </div>
    </div>
  );
};

export default CodemapGraph;
