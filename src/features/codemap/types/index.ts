/**
 * Codemap Types
 * Module 5: Codemap Integration
 */

export interface CodemapNode {
  path: string;
  name: string;
  type: 'file' | 'directory';
  size?: number;
  extension?: string;
  imports?: string[];
  exports?: string[];
  children?: CodemapNode[];
}

export interface CodemapEntryPoint {
  path: string;
  type: 'api' | 'page' | 'component' | 'lib' | 'config' | 'script';
  description?: string;
}

export interface ProjectCodemap {
  id: string;
  project_id: string;
  structure: CodemapNode;
  entry_points: CodemapEntryPoint[];
  dependency_graph_mermaid?: string;
  stats: {
    totalFiles: number;
    totalDirectories: number;
    totalLines: number;
    byLanguage: Record<string, number>;
  };
  generated_at: string;
  updated_at: string;
}

export interface DependencyEdge {
  from: string;
  to: string;
  type: 'import' | 'dynamic' | 'type';
}

export interface CodemapStats {
  totalFiles: number;
  totalDirectories: number;
  totalLines: number;
  byLanguage: Record<string, number>;
  byExtension: Record<string, number>;
  largestFiles: Array<{ path: string; size: number; lines: number }>;
}

export interface ParseOptions {
  maxDepth?: number;
  respectGitignore?: boolean;
  includeDotFiles?: boolean;
  excludePatterns?: string[];
}

export interface CodemapGenerationResult {
  structure: CodemapNode;
  entryPoints: CodemapEntryPoint[];
  dependencyGraph: string;
  stats: CodemapStats;
}
