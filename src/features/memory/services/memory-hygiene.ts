/**
 * Memory Hygiene Service
 * Prunes stale segments, deduplicates, and generates memory index
 */

import { supabaseAdmin } from '@/lib/supabase-server';
import type { MemorySegment, MemoryStats, MemoryHygieneReport } from '../types';

const STALE_DAYS = 30;
const RELEVANCE_THRESHOLD = 0.2;

/**
 * Find and optionally remove stale memory segments
 */
export async function pruneStaleSegments(
  projectId: string,
  dryRun: boolean = false
): Promise<{ removed: number; segments: MemorySegment[] }> {
  if (!supabaseAdmin) {
    return { removed: 0, segments: [] };
  }

  const staleDate = new Date();
  staleDate.setDate(staleDate.getDate() - STALE_DAYS);

  // Find segments that haven't been accessed and are old
  const { data, error } = await supabaseAdmin
    .from('project_memory_segments')
    .select('*')
    .eq('project_id', projectId)
    .lt('last_accessed_at', staleDate.toISOString())
    .lt('relevance_score', RELEVANCE_THRESHOLD)
    .lt('created_at', staleDate.toISOString());

  if (error || !data) {
    return { removed: 0, segments: [] };
  }

  const staleSegments = data as MemorySegment[];

  if (!dryRun && staleSegments.length > 0) {
    const ids = staleSegments.map(s => s.id);
    await supabaseAdmin
      .from('project_memory_segments')
      .delete()
      .in('id', ids);
  }

  return {
    removed: staleSegments.length,
    segments: staleSegments,
  };
}

/**
 * Find duplicate segments based on content similarity
 */
export async function deduplicateSegments(
  projectId: string,
  dryRun: boolean = false
): Promise<{ duplicatesFound: number; removed: number }> {
  if (!supabaseAdmin) {
    return { duplicatesFound: 0, removed: 0 };
  }

  const { data, error } = await supabaseAdmin
    .from('project_memory_segments')
    .select('*')
    .eq('project_id', projectId);

  if (error || !data) {
    return { duplicatesFound: 0, removed: 0 };
  }

  const segments = data as MemorySegment[];
  const contentMap = new Map<string, MemorySegment[]>();

  // Group by normalized content
  for (const segment of segments) {
    const normalized = normalizeContent(segment.content);
    if (!contentMap.has(normalized)) {
      contentMap.set(normalized, []);
    }
    contentMap.get(normalized)!.push(segment);
  }

  // Find duplicates (same normalized content)
  const duplicates: MemorySegment[][] = [];
  for (const [, group] of contentMap) {
    if (group.length > 1) {
      duplicates.push(group);
    }
  }

  let removed = 0;

  if (!dryRun) {
    for (const group of duplicates) {
      // Keep the highest relevance one, delete others
      const sorted = [...group].sort((a, b) => b.relevance_score - a.relevance_score);
      const toDelete = sorted.slice(1);
      
      if (toDelete.length > 0) {
        const ids = toDelete.map(s => s.id);
        await supabaseAdmin
          .from('project_memory_segments')
          .delete()
          .in('id', ids);
        removed += toDelete.length;
      }
    }
  } else {
    removed = duplicates.reduce((sum, group) => sum + group.length - 1, 0);
  }

  return {
    duplicatesFound: duplicates.length,
    removed,
  };
}

/**
 * Normalize content for deduplication
 */
function normalizeContent(content: string): string {
  return content
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .slice(0, 200); // First 200 chars for comparison
}

/**
 * Get memory statistics for a project
 */
export async function getMemoryStats(projectId: string): Promise<MemoryStats> {
  if (!supabaseAdmin) {
    return {
      totalSegments: 0,
      totalTokens: 0,
      byTopic: { debugging: 0, patterns: 0, architecture: 0, api_contracts: 0, general: 0 },
      bySource: { handbook: 0, codemap: 0, pipeline_run: 0, manual: 0, auto_extracted: 0 },
      avgRelevance: 0,
      lastUpdated: null,
    };
  }

  const { data, error } = await supabaseAdmin
    .from('project_memory_segments')
    .select('*')
    .eq('project_id', projectId);

  if (error || !data) {
    return {
      totalSegments: 0,
      totalTokens: 0,
      byTopic: { debugging: 0, patterns: 0, architecture: 0, api_contracts: 0, general: 0 },
      bySource: { handbook: 0, codemap: 0, pipeline_run: 0, manual: 0, auto_extracted: 0 },
      avgRelevance: 0,
      lastUpdated: null,
    };
  }

  const segments = data as MemorySegment[];
  
  const byTopic: MemoryStats['byTopic'] = {
    debugging: 0,
    patterns: 0,
    architecture: 0,
    api_contracts: 0,
    general: 0,
  };

  const bySource: MemoryStats['bySource'] = {
    handbook: 0,
    codemap: 0,
    pipeline_run: 0,
    manual: 0,
    auto_extracted: 0,
  };

  let totalTokens = 0;
  let totalRelevance = 0;
  let lastUpdated: string | null = null;

  for (const segment of segments) {
    byTopic[segment.topic]++;
    bySource[segment.source]++;
    totalTokens += segment.token_count;
    totalRelevance += segment.relevance_score;
    
    if (!lastUpdated || segment.updated_at > lastUpdated) {
      lastUpdated = segment.updated_at;
    }
  }

  return {
    totalSegments: segments.length,
    totalTokens,
    byTopic,
    bySource,
    avgRelevance: segments.length > 0 ? totalRelevance / segments.length : 0,
    lastUpdated,
  };
}

/**
 * Generate a hygiene report for a project
 */
export async function generateHygieneReport(projectId: string): Promise<MemoryHygieneReport> {
  if (!supabaseAdmin) {
    return {
      staleSegments: [],
      duplicates: [],
      lowRelevance: [],
      totalPrunable: 0,
    };
  }

  const staleDate = new Date();
  staleDate.setDate(staleDate.getDate() - STALE_DAYS);

  // Find stale segments
  const { data: staleData } = await supabaseAdmin
    .from('project_memory_segments')
    .select('*')
    .eq('project_id', projectId)
    .lt('last_accessed_at', staleDate.toISOString())
    .lt('relevance_score', RELEVANCE_THRESHOLD);

  // Find low relevance segments
  const { data: lowData } = await supabaseAdmin
    .from('project_memory_segments')
    .select('*')
    .eq('project_id', projectId)
    .lt('relevance_score', 0.3);

  // Get all segments for duplicate detection
  const { data: allData } = await supabaseAdmin
    .from('project_memory_segments')
    .select('*')
    .eq('project_id', projectId);

  const staleSegments = (staleData || []) as MemorySegment[];
  const lowRelevance = (lowData || []) as MemorySegment[];
  const allSegments = (allData || []) as MemorySegment[];

  // Find duplicates
  const contentMap = new Map<string, MemorySegment[]>();
  for (const segment of allSegments) {
    const normalized = normalizeContent(segment.content);
    if (!contentMap.has(normalized)) {
      contentMap.set(normalized, []);
    }
    contentMap.get(normalized)!.push(segment);
  }

  const duplicates: MemoryHygieneReport['duplicates'] = [];
  for (const [content, group] of contentMap) {
    if (group.length > 1) {
      duplicates.push({ content: content.slice(0, 100) + '...', segments: group });
    }
  }

  return {
    staleSegments,
    duplicates,
    lowRelevance,
    totalPrunable: staleSegments.length + duplicates.reduce((sum, d) => sum + d.segments.length - 1, 0),
  };
}

/**
 * Generate AI_MEMORY_INDEX.md content for a project
 */
export async function generateMemoryIndex(projectId: string): Promise<string> {
  if (!supabaseAdmin) {
    return '# AI Memory Index\n\nNo memory data available.';
  }

  const { data: project } = await supabaseAdmin
    .from('foco_projects')
    .select('name, slug')
    .eq('id', projectId)
    .single();

  const stats = await getMemoryStats(projectId);

  const lines: string[] = [
    `# AI Memory Index: ${project?.name || 'Unknown Project'}`,
    '',
    `**Project ID:** ${projectId}`,
    `**Generated:** ${new Date().toISOString()}`,
    '',
    '## Statistics',
    '',
    `- **Total Segments:** ${stats.totalSegments}`,
    `- **Total Tokens:** ${stats.totalTokens.toLocaleString()}`,
    `- **Average Relevance:** ${(stats.avgRelevance * 100).toFixed(1)}%`,
    `- **Last Updated:** ${stats.lastUpdated ? new Date(stats.lastUpdated).toLocaleDateString() : 'Never'}`,
    '',
    '### By Topic',
    '',
  ];

  for (const [topic, count] of Object.entries(stats.byTopic)) {
    if (count > 0) {
      lines.push(`- **${topic.replace('_', ' ')}:** ${count}`);
    }
  }

  lines.push('', '### By Source', '');

  for (const [source, count] of Object.entries(stats.bySource)) {
    if (count > 0) {
      lines.push(`- **${source.replace('_', ' ')}:** ${count}`);
    }
  }

  // Fetch high-relevance segments for summary
  const { data: segments } = await supabaseAdmin
    .from('project_memory_segments')
    .select('*')
    .eq('project_id', projectId)
    .gte('relevance_score', 0.7)
    .order('relevance_score', { ascending: false })
    .limit(20);

  if (segments && segments.length > 0) {
    lines.push('', '## High Relevance Knowledge', '');

    for (const segment of segments) {
      lines.push(`### [${segment.topic}] (score: ${(segment.relevance_score * 100).toFixed(0)}%)`);
      lines.push('');
      lines.push(segment.content.slice(0, 500));
      if (segment.content.length > 500) {
        lines.push('...');
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}
