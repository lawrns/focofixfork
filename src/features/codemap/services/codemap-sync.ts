/**
 * Codemap Sync Service
 * Module 5: Codemap Integration
 * 
 * Syncs codemap data to memory segments (Module 6) and mermaid service
 */

import { supabaseAdmin } from '@/lib/supabase-server';
import type { 
  ProjectCodemap, 
  CodemapGenerationResult,
  CodemapEntryPoint,
  CodemapNode 
} from '../types';
import { parseProjectStructure } from './codemap-parser';

// Simple token estimation (1 token ≈ 4 characters)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Generate and store codemap for a project
 */
export async function generateAndStore(
  projectId: string,
  projectPath: string
): Promise<{
  success: boolean;
  codemap?: ProjectCodemap;
  error?: string;
}> {
  if (!supabaseAdmin) {
    return { success: false, error: 'Database not available' };
  }

  try {
    // Parse project structure
    const result = await parseProjectStructure(projectPath, {
      maxDepth: 20,
      respectGitignore: true,
      excludePatterns: ['*.test.ts', '*.spec.ts', '__tests__', '*.d.ts'],
    });

    // Store in database
    const { data, error } = await supabaseAdmin
      .from('project_codemaps')
      .upsert({
        project_id: projectId,
        structure_json: result.structure,
        entry_points: result.entryPoints.map(ep => `${ep.type}:${ep.path}`),
        dependency_graph_mermaid: result.dependencyGraph,
        stats: {
          totalFiles: result.stats.totalFiles,
          totalDirectories: result.stats.totalDirectories,
          totalLines: result.stats.totalLines,
          byLanguage: result.stats.byLanguage,
        },
        generated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'project_id'
      })
      .select()
      .single();

    if (error) {
      console.error('[CodemapSync] Database error:', error);
      return { success: false, error: error.message };
    }

    const codemap: ProjectCodemap = {
      id: data.id,
      project_id: data.project_id,
      structure: result.structure,
      entry_points: result.entryPoints,
      dependency_graph_mermaid: result.dependencyGraph,
      stats: result.stats,
      generated_at: data.generated_at,
      updated_at: data.updated_at,
    };

    // Sync to memory segments
    await syncToMemory(codemap);

    return { success: true, codemap };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[CodemapSync] Generation error:', err);
    return { success: false, error: message };
  }
}

/**
 * Sync codemap to memory segments
 */
export async function syncToMemory(codemap: ProjectCodemap): Promise<{
  segmentsCreated: number;
  tokensIndexed: number;
}> {
  if (!supabaseAdmin) {
    return { segmentsCreated: 0, tokensIndexed: 0 };
  }

  let segmentsCreated = 0;
  let tokensIndexed = 0;

  // Import memory indexer dynamically to avoid circular dependencies
  try {
    const { indexFromCodemap } = await import('@/features/memory/services/memory-indexer');
    return await indexFromCodemap(codemap);
  } catch (err) {
    console.warn('[CodemapSync] Memory indexer not available, using fallback:', err);
    // Fallback: create memory segments directly
    return await syncToMemoryFallback(codemap);
  }
}

/**
 * Fallback memory sync when memory-indexer is not available
 */
async function syncToMemoryFallback(codemap: ProjectCodemap): Promise<{
  segmentsCreated: number;
  tokensIndexed: number;
}> {
  if (!supabaseAdmin) {
    return { segmentsCreated: 0, tokensIndexed: 0 };
  }

  let segmentsCreated = 0;
  let tokensIndexed = 0;

  // Create segments for entry points (architecture topic)
  if (codemap.entry_points.length > 0) {
    const entryPointsByType: Record<string, CodemapEntryPoint[]> = {};
    for (const ep of codemap.entry_points) {
      if (!entryPointsByType[ep.type]) {
        entryPointsByType[ep.type] = [];
      }
      entryPointsByType[ep.type].push(ep);
    }

    const content = `Project Entry Points (Architecture):\n${Object.entries(entryPointsByType)
      .map(([type, points]) => 
        `\n${type.toUpperCase()}:\n${points.map(p => `  - ${p.path}${p.description ? ` (${p.description})` : ''}`).join('\n')}`
      )
      .join('\n')}`;

    const tokenCount = estimateTokens(content);
    
    const { error } = await supabaseAdmin
      .from('project_memory_segments')
      .upsert({
        project_id: codemap.project_id,
        topic: 'architecture',
        content,
        token_count: tokenCount,
        source: 'codemap',
        source_id: `${codemap.project_id}:entry_points`,
        relevance_score: 0.85,
      }, {
        onConflict: 'project_id,source_id'
      });

    if (!error) {
      segmentsCreated++;
      tokensIndexed += tokenCount;
    }
  }

  // Create segments for API contracts (from entry points of type 'api')
  const apiEntryPoints = codemap.entry_points.filter(ep => ep.type === 'api');
  if (apiEntryPoints.length > 0) {
    const content = `API Routes:\n${apiEntryPoints.map(ep => `- ${ep.path}`).join('\n')}`;
    const tokenCount = estimateTokens(content);
    
    const { error } = await supabaseAdmin
      .from('project_memory_segments')
      .upsert({
        project_id: codemap.project_id,
        topic: 'api_contracts',
        content,
        token_count: tokenCount,
        source: 'codemap',
        source_id: `${codemap.project_id}:api_routes`,
        relevance_score: 0.8,
      }, {
        onConflict: 'project_id,source_id'
      });

    if (!error) {
      segmentsCreated++;
      tokensIndexed += tokenCount;
    }
  }

  // Create segments for patterns (language breakdown)
  if (Object.keys(codemap.stats.byLanguage).length > 0) {
    const content = `Code Statistics:\nTotal Files: ${codemap.stats.totalFiles}\nTotal Directories: ${codemap.stats.totalDirectories}\n\nBy Language:\n${Object.entries(codemap.stats.byLanguage)
      .map(([lang, count]) => `- ${lang}: ${count} files`)
      .join('\n')}`;

    const tokenCount = estimateTokens(content);
    
    const { error } = await supabaseAdmin
      .from('project_memory_segments')
      .upsert({
        project_id: codemap.project_id,
        topic: 'patterns',
        content,
        token_count: tokenCount,
        source: 'codemap',
        source_id: `${codemap.project_id}:stats`,
        relevance_score: 0.6,
      }, {
        onConflict: 'project_id,source_id'
      });

    if (!error) {
      segmentsCreated++;
      tokensIndexed += tokenCount;
    }
  }

  return { segmentsCreated, tokensIndexed };
}

/**
 * Get codemap for a project
 */
export async function getCodemap(projectId: string): Promise<ProjectCodemap | null> {
  if (!supabaseAdmin) {
    return null;
  }

  const { data, error } = await supabaseAdmin
    .from('project_codemaps')
    .select('*')
    .eq('project_id', projectId)
    .single();

  if (error || !data) {
    return null;
  }

  // Parse entry points from stored strings
  const entryPoints: CodemapEntryPoint[] = (data.entry_points || []).map((ep: string) => {
    const [type, ...pathParts] = ep.split(':');
    return {
      type: type as CodemapEntryPoint['type'],
      path: pathParts.join(':'),
    };
  });

  return {
    id: data.id,
    project_id: data.project_id,
    structure: data.structure_json,
    entry_points: entryPoints,
    dependency_graph_mermaid: data.dependency_graph_mermaid,
    stats: data.stats,
    generated_at: data.generated_at,
    updated_at: data.updated_at,
  };
}

/**
 * Delete codemap for a project
 */
export async function deleteCodemap(projectId: string): Promise<boolean> {
  if (!supabaseAdmin) {
    return false;
  }

  const { error } = await supabaseAdmin
    .from('project_codemaps')
    .delete()
    .eq('project_id', projectId);

  if (error) {
    console.error('[CodemapSync] Delete error:', error);
    return false;
  }

  return true;
}

/**
 * Get Mermaid diagram for a project
 */
export async function getMermaidDiagram(projectId: string): Promise<string | null> {
  if (!supabaseAdmin) {
    return null;
  }

  const { data, error } = await supabaseAdmin
    .from('project_codemaps')
    .select('dependency_graph_mermaid')
    .eq('project_id', projectId)
    .single();

  if (error || !data) {
    return null;
  }

  return data.dependency_graph_mermaid;
}

/**
 * Sync codemap to mermaid service (for preview caching)
 */
export async function syncToMermaid(codemap: ProjectCodemap): Promise<{
  success: boolean;
  diagramId?: string;
  error?: string;
}> {
  // This could store the diagram in a cache or trigger rendering
  // For now, we just validate it's accessible
  if (!codemap.dependency_graph_mermaid) {
    return { success: false, error: 'No dependency graph available' };
  }

  // The diagram is already stored in the codemap record
  // Additional mermaid-specific processing could go here
  return { success: true, diagramId: codemap.project_id };
}
