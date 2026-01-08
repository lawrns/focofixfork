'use client';

import React, { useState, useCallback, useEffect } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';
import { validateMermaidCode } from '@/lib/models/mermaid';

interface MermaidEditorProps {
  value: string;
  onChange: (value: string) => void;
  theme?: 'light' | 'dark';
  readonly?: boolean;
  placeholder?: string;
  className?: string;
}

export const MermaidEditor: React.FC<MermaidEditorProps> = ({
  value,
  onChange,
  theme = 'light',
  readonly = false,
  placeholder = 'Enter your Mermaid diagram code here...',
  className = '',
}) => {
  const [error, setError] = useState<string | null>(null);

  const handleChange = useCallback((val: string) => {
    onChange(val);
    
    // Validate the code
    const validation = validateMermaidCode(val);
    setError(validation.error || null);
  }, [onChange]);

  const extensions = [
    javascript(),
  ];

  const themes = theme === 'dark' ? [oneDark] : [];

  return (
    <div className={`mermaid-editor ${className}`}>
      <div className="relative">
        <CodeMirror
          value={value}
          height="400px"
          theme={themes}
          extensions={extensions}
          onChange={handleChange}
          readOnly={readonly}
          placeholder={placeholder}
          className="border rounded-lg overflow-hidden"
        />
        
        {error && (
          <div className="absolute bottom-2 left-2 right-2 bg-red-50 border border-red-200 rounded-md p-2 text-sm text-red-700">
            <div className="flex items-center">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          </div>
        )}
      </div>
      
      {/* Mermaid syntax help */}
      <div className="mt-2 p-3 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Quick Reference:</h4>
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
          <div><code className="bg-gray-200 px-1 rounded">graph LR</code> - Left to Right</div>
          <div><code className="bg-gray-200 px-1 rounded">graph TD</code> - Top to Down</div>
          <div><code className="bg-gray-200 px-1 rounded">sequenceDiagram</code> - Sequence</div>
          <div><code className="bg-gray-200 px-1 rounded">classDiagram</code> - Class</div>
          <div><code className="bg-gray-200 px-1 rounded">stateDiagram</code> - State</div>
          <div><code className="bg-gray-200 px-1 rounded">gantt</code> - Gantt Chart</div>
        </div>
      </div>
    </div>
  );
};
