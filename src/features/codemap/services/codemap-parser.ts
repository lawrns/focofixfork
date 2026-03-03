/**
 * Codemap Parser Service
 * Module 5: Codemap Integration
 * 
 * Parses project file structure, detects entry points, generates dependency graphs
 */

import { promises as fs } from 'fs';
import path from 'path';
import type { 
  CodemapNode, 
  CodemapEntryPoint, 
  DependencyEdge, 
  CodemapStats,
  ParseOptions,
  CodemapGenerationResult
} from '../types';

// Default file extensions to consider as code files
const CODE_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.py', '.rb', '.go', '.rs', '.java', '.kt', '.scala',
  '.php', '.swift', '.cs', '.cpp', '.c', '.h', '.hpp',
  '.vue', '.svelte', '.astro'
]);

// Entry point detection patterns
const ENTRY_POINT_PATTERNS: Array<{ pattern: RegExp; type: CodemapEntryPoint['type']; description: string }> = [
  { pattern: /\/api\//, type: 'api', description: 'API route' },
  { pattern: /\/app\/.*\/page\.(tsx|ts|jsx|js)$/, type: 'page', description: 'Next.js App Router page' },
  { pattern: /\/app\/.*\/layout\.(tsx|ts|jsx|js)$/, type: 'page', description: 'Next.js layout' },
  { pattern: /\/pages\/.*\.(tsx|ts|jsx|js)$/, type: 'page', description: 'Next.js Pages Router page' },
  { pattern: /\/components\/.*\.(tsx|ts|jsx|js|vue|svelte)$/, type: 'component', description: 'UI component' },
  { pattern: /\/[Ll]ib\/.*\.(ts|js)$/, type: 'lib', description: 'Library module' },
  { pattern: /\/[Uu]tils?\/.*\.(ts|js)$/, type: 'lib', description: 'Utility module' },
  { pattern: /\/[Hh]ooks\/.*\.(ts|js)$/, type: 'lib', description: 'Custom hook' },
  { pattern: /.*\.config\.(ts|js|mjs|json)$/, type: 'config', description: 'Configuration file' },
  { pattern: /next\.config\.(ts|js|mjs)$/, type: 'config', description: 'Next.js config' },
  { pattern: /tailwind\.config\.(ts|js)$/, type: 'config', description: 'Tailwind config' },
  { pattern: /vitest\.config\.(ts|js)$/, type: 'config', description: 'Vitest config' },
  { pattern: /jest\.config\.(ts|js)$/, type: 'config', description: 'Jest config' },
  { pattern: /package\.json$/, type: 'config', description: 'Package manifest' },
  { pattern: /tsconfig\.json$/, type: 'config', description: 'TypeScript config' },
  { pattern: /\/scripts?\/.*\.(ts|js|py|sh)$/, type: 'script', description: 'Build/deploy script' },
];

// Default patterns to exclude
const DEFAULT_EXCLUDE_PATTERNS = [
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  'coverage',
  '.cache',
  '__pycache__',
  '.venv',
  'venv',
  '.vercel',
  '.netlify',
];

/**
 * Parse .gitignore file and return patterns
 */
async function parseGitignore(projectPath: string): Promise<string[]> {
  try {
    const gitignorePath = path.join(projectPath, '.gitignore');
    const content = await fs.readFile(gitignorePath, 'utf-8');
    return content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'));
  } catch {
    return [];
  }
}

/**
 * Check if a path should be excluded based on patterns
 */
function shouldExclude(filePath: string, excludePatterns: string[]): boolean {
  const parts = filePath.split(path.sep);
  
  for (const pattern of excludePatterns) {
    // Simple string match for directory names
    if (parts.some(part => part === pattern || part.startsWith(pattern))) {
      return true;
    }
    // Glob-like patterns
    if (pattern.includes('*')) {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      if (parts.some(part => regex.test(part))) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Detect imports from file content
 */
export function detectImports(content: string): string[] {
  const imports: string[] = [];
  
  // ES6 imports: import X from 'Y' or import { X } from 'Y'
  const es6Regex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = es6Regex.exec(content)) !== null) {
    imports.push(match[1]);
  }
  
  // Dynamic imports: import('X')
  const dynamicRegex = /import\(['"]([^'"]+)['"]\)/g;
  while ((match = dynamicRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }
  
  // CommonJS requires: require('X')
  const cjsRegex = /require\(['"]([^'"]+)['"]\)/g;
  while ((match = cjsRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }
  
  // TypeScript type imports: import type X from 'Y'
  const typeRegex = /import\s+type\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
  while ((match = typeRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }
  
  return [...new Set(imports)]; // Deduplicate
}

/**
 * Get file extension from path
 */
function getExtension(filePath: string): string {
  const ext = path.extname(filePath);
  return ext.toLowerCase();
}

/**
 * Get language name from extension
 */
function getLanguage(ext: string): string {
  const langMap: Record<string, string> = {
    '.ts': 'TypeScript',
    '.tsx': 'TypeScript (React)',
    '.js': 'JavaScript',
    '.jsx': 'JavaScript (React)',
    '.mjs': 'JavaScript (ES Module)',
    '.cjs': 'JavaScript (CommonJS)',
    '.py': 'Python',
    '.rb': 'Ruby',
    '.go': 'Go',
    '.rs': 'Rust',
    '.java': 'Java',
    '.kt': 'Kotlin',
    '.scala': 'Scala',
    '.php': 'PHP',
    '.swift': 'Swift',
    '.cs': 'C#',
    '.cpp': 'C++',
    '.c': 'C',
    '.h': 'C Header',
    '.hpp': 'C++ Header',
    '.vue': 'Vue',
    '.svelte': 'Svelte',
    '.astro': 'Astro',
  };
  return langMap[ext] || 'Other';
}

/**
 * Count lines in content
 */
function countLines(content: string): number {
  return content.split('\n').length;
}

/**
 * Detect if a file is an entry point
 */
function detectEntryPoint(filePath: string): CodemapEntryPoint | null {
  for (const { pattern, type, description } of ENTRY_POINT_PATTERNS) {
    if (pattern.test(filePath)) {
      return { path: filePath, type, description };
    }
  }
  return null;
}

/**
 * Recursively walk directory and build structure tree
 */
async function walkDirectory(
  dirPath: string,
  relativePath: string,
  options: ParseOptions,
  currentDepth: number,
  allNodes: CodemapNode[],
  entryPoints: CodemapEntryPoint[]
): Promise<CodemapNode | null> {
  const { maxDepth = 20, respectGitignore = true, excludePatterns = [] } = options;
  
  if (currentDepth > maxDepth) {
    return null;
  }
  
  const name = path.basename(dirPath);
  const node: CodemapNode = {
    path: relativePath,
    name,
    type: 'directory',
    children: [],
  };
  
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const entryPath = path.join(dirPath, entry.name);
      const entryRelativePath = path.join(relativePath, entry.name);
      
      // Check exclusion patterns
      const allExcludes = [...DEFAULT_EXCLUDE_PATTERNS, ...excludePatterns];
      if (shouldExclude(entryRelativePath, allExcludes)) {
        continue;
      }
      
      if (entry.isDirectory()) {
        const childNode = await walkDirectory(
          entryPath,
          entryRelativePath,
          options,
          currentDepth + 1,
          allNodes,
          entryPoints
        );
        if (childNode && node.children) {
          node.children.push(childNode);
        }
      } else if (entry.isFile()) {
        const ext = getExtension(entry.name);
        const isCodeFile = CODE_EXTENSIONS.has(ext);
        
        let fileNode: CodemapNode = {
          path: entryRelativePath,
          name: entry.name,
          type: 'file',
          extension: ext || undefined,
        };
        
        // For code files, read content to get imports and exports
        if (isCodeFile) {
          try {
            const content = await fs.readFile(entryPath, 'utf-8');
            const stats = await fs.stat(entryPath);
            
            fileNode.size = stats.size;
            fileNode.imports = detectImports(content);
            
            // Detect entry point
            const entryPoint = detectEntryPoint(entryRelativePath);
            if (entryPoint) {
              entryPoints.push(entryPoint);
            }
            
            allNodes.push(fileNode);
          } catch {
            // File might be binary or unreadable, skip content parsing
            allNodes.push(fileNode);
          }
        } else {
          allNodes.push(fileNode);
        }
        
        if (node.children) {
          node.children.push(fileNode);
        }
      }
    }
    
    // Sort children: directories first, then files alphabetically
    if (node.children) {
      node.children.sort((a, b) => {
        if (a.type === b.type) {
          return a.name.localeCompare(b.name);
        }
        return a.type === 'directory' ? -1 : 1;
      });
    }
    
    return node;
  } catch (error) {
    console.warn(`[CodemapParser] Error reading directory ${dirPath}:`, error);
    return null;
  }
}

/**
 * Calculate statistics from parsed nodes
 */
function calculateStats(nodes: CodemapNode[]): CodemapStats {
  let totalFiles = 0;
  let totalDirectories = 0;
  let totalLines = 0;
  const byExtension: Record<string, number> = {};
  const byLanguage: Record<string, number> = {};
  const largestFiles: Array<{ path: string; size: number; lines: number }> = [];
  
  function traverse(node: CodemapNode) {
    if (node.type === 'file') {
      totalFiles++;
      if (node.extension) {
        byExtension[node.extension] = (byExtension[node.extension] || 0) + 1;
        const lang = getLanguage(node.extension);
        byLanguage[lang] = (byLanguage[lang] || 0) + 1;
      }
      if (node.size) {
        largestFiles.push({
          path: node.path,
          size: node.size,
          lines: node.size > 0 ? Math.ceil(node.size / 50) : 0, // Rough estimate
        });
      }
    } else if (node.type === 'directory') {
      totalDirectories++;
      if (node.children) {
        for (const child of node.children) {
          traverse(child);
        }
      }
    }
  }
  
  for (const node of nodes) {
    traverse(node);
  }
  
  // Sort and limit largest files
  largestFiles.sort((a, b) => b.size - a.size);
  
  return {
    totalFiles,
    totalDirectories,
    totalLines,
    byLanguage,
    byExtension,
    largestFiles: largestFiles.slice(0, 10),
  };
}

/**
 * Generate Mermaid dependency graph from nodes
 */
function generateDependencyGraph(nodes: CodemapNode[]): string {
  const edges: DependencyEdge[] = [];
  const nodeMap = new Map<string, CodemapNode>();
  
  // Build node map for quick lookup
  function buildNodeMap(node: CodemapNode) {
    nodeMap.set(node.path, node);
    if (node.children) {
      for (const child of node.children) {
        buildNodeMap(child);
      }
    }
  }
  
  for (const node of nodes) {
    buildNodeMap(node);
  }
  
  // Find all edges
  for (const node of nodeMap.values()) {
    if (node.imports && node.imports.length > 0) {
      for (const imp of node.imports) {
        // Try to resolve the import path
        let resolvedPath: string | null = null;
        
        // Check if it's a relative import
        if (imp.startsWith('.')) {
          const nodeDir = path.dirname(node.path);
          resolvedPath = path.join(nodeDir, imp);
          
          // Try with common extensions
          const extensions = ['.ts', '.tsx', '.js', '.jsx', ''];
          for (const ext of extensions) {
            const tryPath = resolvedPath + ext;
            if (nodeMap.has(tryPath)) {
              resolvedPath = tryPath;
              break;
            }
            // Try index files
            const indexPath = path.join(resolvedPath, `index${ext}`);
            if (nodeMap.has(indexPath)) {
              resolvedPath = indexPath;
              break;
            }
          }
        }
        
        if (resolvedPath && nodeMap.has(resolvedPath)) {
          edges.push({
            from: node.path,
            to: resolvedPath,
            type: 'import',
          });
        }
      }
    }
  }
  
  // Generate Mermaid graph
  if (edges.length === 0) {
    return 'graph TD\n  A[No dependencies detected]\n';
  }
  
  const lines = ['graph TD'];
  const nodeIds = new Map<string, string>();
  let idCounter = 0;
  
  function getNodeId(filePath: string): string {
    if (!nodeIds.has(filePath)) {
      nodeIds.set(filePath, `N${idCounter++}`);
    }
    return nodeIds.get(filePath)!;
  }
  
  // Add node definitions
  for (const edge of edges) {
    const fromId = getNodeId(edge.from);
    const toId = getNodeId(edge.to);
    const fromName = path.basename(edge.from);
    const toName = path.basename(edge.to);
    
    if (!lines.some(l => l.startsWith(`${fromId}[`) || l.startsWith(`${fromId}(`))) {
      lines.push(`  ${fromId}["${fromName}"]`);
    }
    if (!lines.some(l => l.startsWith(`${toId}[`) || l.startsWith(`${toId}(`))) {
      lines.push(`  ${toId}["${toName}"]`);
    }
    
    lines.push(`  ${fromId} --> ${toId}`);
  }
  
  return lines.join('\n');
}

/**
 * Parse project structure from filesystem
 */
export async function parseProjectStructure(
  projectPath: string,
  options: ParseOptions = {}
): Promise<CodemapGenerationResult> {
  const { respectGitignore = true } = options;
  
  // Load gitignore patterns if requested
  let gitignorePatterns: string[] = [];
  if (respectGitignore) {
    gitignorePatterns = await parseGitignore(projectPath);
  }
  
  const mergedOptions: ParseOptions = {
    ...options,
    excludePatterns: [...(options.excludePatterns || []), ...gitignorePatterns],
  };
  
  const allNodes: CodemapNode[] = [];
  const entryPoints: CodemapEntryPoint[] = [];
  
  const structure = await walkDirectory(
    projectPath,
    '',
    mergedOptions,
    0,
    allNodes,
    entryPoints
  );
  
  if (!structure) {
    throw new Error(`Failed to parse project structure at ${projectPath}`);
  }
  
  const stats = calculateStats([structure]);
  const dependencyGraph = generateDependencyGraph([structure]);
  
  return {
    structure,
    entryPoints,
    dependencyGraph,
    stats,
  };
}

/**
 * Detect entry points from parsed structure
 */
export function detectEntryPoints(structure: CodemapNode): CodemapEntryPoint[] {
  const entryPoints: CodemapEntryPoint[] = [];
  
  function traverse(node: CodemapNode) {
    if (node.type === 'file') {
      const entryPoint = detectEntryPoint(node.path);
      if (entryPoint) {
        entryPoints.push(entryPoint);
      }
    }
    
    if (node.children) {
      for (const child of node.children) {
        traverse(child);
      }
    }
  }
  
  traverse(structure);
  return entryPoints;
}

/**
 * Generate Mermaid dependency diagram
 */
export function generateMermaidDiagram(nodes: CodemapNode[]): string {
  return generateDependencyGraph(nodes);
}
