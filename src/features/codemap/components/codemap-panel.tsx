'use client';

import React, { useState } from 'react';
import type { CodemapNode, CodemapEntryPoint } from '../types';

interface CodemapPanelProps {
  structure: CodemapNode;
  entryPoints: CodemapEntryPoint[];
  className?: string;
}

// File type icons based on extension
const FileIcon: React.FC<{ extension?: string; isEntryPoint?: boolean }> = ({ 
  extension, 
  isEntryPoint 
}) => {
  const getIconColor = () => {
    if (isEntryPoint) return 'text-blue-500';
    switch (extension) {
      case '.ts':
      case '.tsx':
        return 'text-blue-400';
      case '.js':
      case '.jsx':
        return 'text-yellow-400';
      case '.json':
        return 'text-gray-400';
      case '.css':
      case '.scss':
      case '.less':
        return 'text-pink-400';
      case '.md':
      case '.mdx':
        return 'text-gray-300';
      case '.py':
        return 'text-green-400';
      case '.go':
        return 'text-cyan-400';
      case '.rs':
        return 'text-orange-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <svg 
      className={`w-4 h-4 mr-2 ${getIconColor()}`} 
      fill="none" 
      stroke="currentColor" 
      viewBox="0 0 24 24"
    >
      {extension ? (
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
        />
      ) : (
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" 
        />
      )}
    </svg>
  );
};

// Entry point badge
const EntryPointBadge: React.FC<{ type: CodemapEntryPoint['type'] }> = ({ type }) => {
  const colors: Record<CodemapEntryPoint['type'], string> = {
    api: 'bg-green-100 text-green-800',
    page: 'bg-blue-100 text-blue-800',
    component: 'bg-purple-100 text-purple-800',
    lib: 'bg-yellow-100 text-yellow-800',
    config: 'bg-gray-100 text-gray-800',
    script: 'bg-orange-100 text-orange-800',
  };

  return (
    <span className={`ml-2 px-1.5 py-0.5 text-xs rounded ${colors[type]}`}>
      {type}
    </span>
  );
};

// Tree node component
interface TreeNodeProps {
  node: CodemapNode;
  entryPointMap: Map<string, CodemapEntryPoint>;
  depth?: number;
  defaultExpanded?: boolean;
}

const TreeNode: React.FC<TreeNodeProps> = ({ 
  node, 
  entryPointMap, 
  depth = 0,
  defaultExpanded = depth < 2 
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const isDirectory = node.type === 'directory';
  const entryPoint = entryPointMap.get(node.path);
  const hasChildren = isDirectory && node.children && node.children.length > 0;

  const toggleExpand = () => {
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <div className="select-none">
      <div 
        className={`flex items-center py-1 px-2 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer rounded ${
          entryPoint ? 'bg-blue-50 dark:bg-blue-900/20' : ''
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={toggleExpand}
      >
        {hasChildren && (
          <svg 
            className={`w-4 h-4 mr-1 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        )}
        {!hasChildren && <span className="w-5" />}
        
        <FileIcon extension={node.extension} isEntryPoint={!!entryPoint} />
        
        <span className={`text-sm ${entryPoint ? 'font-medium' : ''}`}>
          {node.name}
        </span>
        
        {entryPoint && <EntryPointBadge type={entryPoint.type} />}
        
        {node.size !== undefined && (
          <span className="ml-2 text-xs text-gray-400">
            {(node.size / 1024).toFixed(1)} KB
          </span>
        )}
      </div>

      {isExpanded && hasChildren && (
        <div>
          {node.children!.map((child, index) => (
            <TreeNode 
              key={`${child.path}-${index}`}
              node={child}
              entryPointMap={entryPointMap}
              depth={depth + 1}
              defaultExpanded={depth < 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Main panel component
export const CodemapPanel: React.FC<CodemapPanelProps> = ({ 
  structure, 
  entryPoints,
  className = '' 
}) => {
  // Build entry point lookup map
  const entryPointMap = new Map<string, CodemapEntryPoint>();
  for (const ep of entryPoints) {
    entryPointMap.set(ep.path, ep);
  }

  return (
    <div className={`border rounded-lg overflow-hidden bg-white dark:bg-gray-900 ${className}`}>
      <div className="p-3 border-b bg-gray-50 dark:bg-gray-800">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200">
          File Structure
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {entryPoints.length} entry points detected
        </p>
      </div>
      <div className="p-2 max-h-[600px] overflow-auto">
        <TreeNode 
          node={structure} 
          entryPointMap={entryPointMap}
          defaultExpanded={true}
        />
      </div>
    </div>
  );
};

export default CodemapPanel;
