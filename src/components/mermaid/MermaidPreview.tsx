'use client';

import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

interface MermaidPreviewProps {
  code: string;
  theme?: 'light' | 'dark' | 'forest' | 'neutral';
  className?: string;
  showErrors?: boolean;
}

export const MermaidPreview: React.FC<MermaidPreviewProps> = ({
  code,
  theme = 'light',
  className = '',
  showErrors = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Initialize Mermaid configuration
    mermaid.initialize({
      startOnLoad: false,
      theme: theme === 'dark' ? 'dark' : theme === 'forest' ? 'forest' : theme === 'neutral' ? 'neutral' : 'default',
      securityLevel: 'loose',
      fontFamily: 'monospace',
      fontSize: 16,
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
        curve: 'basis',
      },
    });
  }, [theme]);

  useEffect(() => {
    if (!code || !containerRef.current) return;

    const renderDiagram = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Clear previous content
        containerRef.current.innerHTML = '';

        // Generate unique ID for this render
        const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Validate and render the diagram
        const isValid = await mermaid.parse(code);
        if (!isValid) {
          throw new Error('Invalid Mermaid syntax');
        }

        const { svg } = await mermaid.render(id, code);
        containerRef.current.innerHTML = svg;

        // Make SVG responsive
        const svgElement = containerRef.current.querySelector('svg');
        if (svgElement) {
          svgElement.setAttribute('width', '100%');
          svgElement.setAttribute('height', 'auto');
          svgElement.style.maxWidth = '100%';
          svgElement.style.height = 'auto';
        }
      } catch (err: any) {
        console.error('Mermaid rendering error:', err);
        setError(err.message || 'Failed to render diagram');
      } finally {
        setIsLoading(false);
      }
    };

    renderDiagram();
  }, [code, theme]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
  };

  const handleDownloadSVG = () => {
    if (!containerRef.current) return;
    
    const svgElement = containerRef.current.querySelector('svg');
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'diagram.svg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`mermaid-preview ${className}`}>
      {/* Preview header */}
      <div className="flex items-center justify-between p-3 bg-gray-50 border-b">
        <h3 className="text-sm font-medium text-gray-700">Preview</h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleCopyCode}
            className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            title="Copy code"
          >
            Copy Code
          </button>
          <button
            onClick={handleDownloadSVG}
            className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            title="Download SVG"
          >
            Download SVG
          </button>
        </div>
      </div>

      {/* Preview content */}
      <div className="relative min-h-[400px] bg-white border rounded-b-lg overflow-auto">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-sm text-gray-600">Rendering diagram...</span>
            </div>
          </div>
        )}

        {error && showErrors && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-50">
            <div className="max-w-md p-4 bg-red-100 border border-red-200 rounded-lg">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div>
                  <h4 className="text-sm font-medium text-red-800">Rendering Error</h4>
                  <p className="mt-1 text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {!isLoading && !error && (
          <div 
            ref={containerRef} 
            className="p-4 flex items-center justify-center min-h-[400px]"
          />
        )}

        {!code && !isLoading && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p className="text-sm text-gray-600">Enter Mermaid code to see preview</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
