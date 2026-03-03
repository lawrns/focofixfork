/**
 * Memory Indexer Service
 * Indexes project knowledge from various sources into memory segments
 */

import { supabaseAdmin } from '@/lib/supabase-server';
import { loadHandbook, formatHandbookForAgent, type AgentHandbook } from '@/lib/handbook/handbook-loader';
import type { MemorySegment, MemoryTopic, MemorySource } from '../types';

// Simple token estimation (1 token ≈ 4 characters for English)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Index handbook content into memory segments
 */
export async function indexFromHandbook(projectId: string, projectSlug: string): Promise<{
  segmentsCreated: number;
  tokensIndexed: number;
}> {
  if (!supabaseAdmin) {
    throw new Error('Database not available');
  }

  const handbook = await loadHandbook(projectSlug);
  if (!handbook) {
    return { segmentsCreated: 0, tokensIndexed: 0 };
  }

  let segmentsCreated = 0;
  let tokensIndexed = 0;

  // Index business rules
  if (handbook.businessRules.length > 0) {
    const content = `Business Rules:\n${handbook.businessRules.map(r => `- ${r}`).join('\n')}`;
    const tokenCount = estimateTokens(content);
    
    const { error } = await supabaseAdmin
      .from('project_memory_segments')
      .upsert({
        project_id: projectId,
        topic: 'patterns' as MemoryTopic,
        content,
        token_count: tokenCount,
        source: 'handbook' as MemorySource,
        source_id: `${projectSlug}:business_rules`,
        relevance_score: 0.9,
      }, {
        onConflict: 'project_id,source_id'
      });

    if (!error) {
      segmentsCreated++;
      tokensIndexed += tokenCount;
    }
  }

  // Index constraints
  if (handbook.constraints.length > 0) {
    const content = `Constraints:\n${handbook.constraints.map(c => `- ${c}`).join('\n')}`;
    const tokenCount = estimateTokens(content);
    
    const { error } = await supabaseAdmin
      .from('project_memory_segments')
      .upsert({
        project_id: projectId,
        topic: 'architecture' as MemoryTopic,
        content,
        token_count: tokenCount,
        source: 'handbook' as MemorySource,
        source_id: `${projectSlug}:constraints`,
        relevance_score: 0.85,
      }, {
        onConflict: 'project_id,source_id'
      });

    if (!error) {
      segmentsCreated++;
      tokensIndexed += tokenCount;
    }
  }

  // Index examples
  if (handbook.examples.length > 0) {
    for (let i = 0; i < handbook.examples.length; i++) {
      const example = handbook.examples[i];
      const tokenCount = estimateTokens(example);
      
      const { error } = await supabaseAdmin
        .from('project_memory_segments')
        .upsert({
          project_id: projectId,
          topic: 'patterns' as MemoryTopic,
          content: `Example ${i + 1}:\n${example}`,
          token_count: tokenCount,
          source: 'handbook' as MemorySource,
          source_id: `${projectSlug}:example_${i}`,
          relevance_score: 0.8,
        }, {
          onConflict: 'project_id,source_id'
        });

      if (!error) {
        segmentsCreated++;
        tokensIndexed += tokenCount;
      }
    }
  }

  // Index sections by topic
  for (const section of handbook.sections) {
    const tokenCount = estimateTokens(section.content);
    const topic = inferTopicFromTitle(section.title);
    
    const { error } = await supabaseAdmin
      .from('project_memory_segments')
      .upsert({
        project_id: projectId,
        topic,
        content: `## ${section.title}\n\n${section.content}`,
        token_count: tokenCount,
        source: 'handbook' as MemorySource,
        source_id: `${projectSlug}:section:${section.title.toLowerCase().replace(/\s+/g, '_')}`,
        relevance_score: 0.7,
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
 * Index learnings from a pipeline run into memory
 */
export async function indexFromPipelineRun(
  projectId: string,
  runId: string,
  learnings: string[],
  source: 'plan' | 'execute' | 'review'
): Promise<{
  segmentsCreated: number;
  tokensIndexed: number;
}> {
  if (!supabaseAdmin || learnings.length === 0) {
    return { segmentsCreated: 0, tokensIndexed: 0 };
  }

  let segmentsCreated = 0;
  let tokensIndexed = 0;

  for (let i = 0; i < learnings.length; i++) {
    const learning = learnings[i];
    const tokenCount = estimateTokens(learning);
    
    // Infer topic from content
    const topic = inferTopicFromContent(learning);
    
    const { error } = await supabaseAdmin
      .from('project_memory_segments')
      .insert({
        project_id: projectId,
        topic,
        content: learning,
        token_count: tokenCount,
        source: 'pipeline_run' as MemorySource,
        source_id: `${runId}:${source}:${i}`,
        relevance_score: 0.75,
      });

    if (!error) {
      segmentsCreated++;
      tokensIndexed += tokenCount;
    }
  }

  return { segmentsCreated, tokensIndexed };
}

/**
 * Infer memory topic from section title
 */
function inferTopicFromTitle(title: string): MemoryTopic {
  const lower = title.toLowerCase();
  
  if (lower.includes('debug') || lower.includes('error') || lower.includes('troubleshoot') || lower.includes('fix')) {
    return 'debugging';
  }
  if (lower.includes('api') || lower.includes('endpoint') || lower.includes('contract') || lower.includes('interface')) {
    return 'api_contracts';
  }
  if (lower.includes('arch') || lower.includes('structure') || lower.includes('design') || lower.includes('pattern')) {
    return 'architecture';
  }
  if (lower.includes('pattern') || lower.includes('convention') || lower.includes('style') || lower.includes('best practice')) {
    return 'patterns';
  }
  
  return 'general';
}

/**
 * Infer memory topic from content
 */
function inferTopicFromContent(content: string): MemoryTopic {
  const lower = content.toLowerCase();
  
  if (lower.includes('error') || lower.includes('bug') || lower.includes('fix') || lower.includes('debug')) {
    return 'debugging';
  }
  if (lower.includes('api ') || lower.includes('endpoint') || lower.includes('request') || lower.includes('response')) {
    return 'api_contracts';
  }
  if (lower.includes('architecture') || lower.includes('structure') || lower.includes('component')) {
    return 'architecture';
  }
  if (lower.includes('pattern') || lower.includes('convention') || lower.includes('should')) {
    return 'patterns';
  }
  
  return 'general';
}

/**
 * Get memory index summary for a project
 */
export async function getMemoryIndex(projectId: string): Promise<{
  segments: MemorySegment[];
  byTopic: Record<MemoryTopic, number>;
  totalTokens: number;
}> {
  if (!supabaseAdmin) {
    return { segments: [], byTopic: { debugging: 0, patterns: 0, architecture: 0, api_contracts: 0, general: 0 }, totalTokens: 0 };
  }

  const { data, error } = await supabaseAdmin
    .from('project_memory_segments')
    .select('*')
    .eq('project_id', projectId)
    .order('relevance_score', { ascending: false });

  if (error || !data) {
    return { segments: [], byTopic: { debugging: 0, patterns: 0, architecture: 0, api_contracts: 0, general: 0 }, totalTokens: 0 };
  }

  const segments = data as MemorySegment[];
  const byTopic: Record<MemoryTopic, number> = {
    debugging: 0,
    patterns: 0,
    architecture: 0,
    api_contracts: 0,
    general: 0,
  };

  let totalTokens = 0;

  for (const segment of segments) {
    byTopic[segment.topic]++;
    totalTokens += segment.token_count;
  }

  return { segments, byTopic, totalTokens };
}

/**
 * Index codemap content into memory segments
 * Called by Module 5 (Codemap) after generating a codemap
 */
export async function indexFromCodemap(codemap: {
  project_id: string;
  entry_points: Array<{ path: string; type: string; description?: string }>;
  stats: {
    totalFiles: number;
    totalDirectories: number;
    totalLines: number;
    byLanguage: Record<string, number>;
  };
}): Promise<{
  segmentsCreated: number;
  tokensIndexed: number;
}> {
  if (!supabaseAdmin) {
    return { segmentsCreated: 0, tokensIndexed: 0 };
  }

  let segmentsCreated = 0;
  let tokensIndexed = 0;

  // Create segment for entry points (architecture topic)
  if (codemap.entry_points.length > 0) {
    const entryPointsByType: Record<string, typeof codemap.entry_points> = {};
    for (const ep of codemap.entry_points) {
      if (!entryPointsByType[ep.type]) {
        entryPointsByType[ep.type] = [];
      }
      entryPointsByType[ep.type].push(ep);
    }

    const content = `Project Architecture (from Codemap):\n\n${Object.entries(entryPointsByType)
      .map(([type, points]) => 
        `## ${type.toUpperCase()}\n${points.map(p => `- \`${p.path}\`${p.description ? ` - ${p.description}` : ''}`).join('\n')}`
      )
      .join('\n\n')}`;

    const tokenCount = estimateTokens(content);
    
    const { error } = await supabaseAdmin
      .from('project_memory_segments')
      .upsert({
        project_id: codemap.project_id,
        topic: 'architecture',
        content,
        token_count: tokenCount,
        source: 'codemap',
        source_id: `${codemap.project_id}:codemap:architecture`,
        relevance_score: 0.9,
      }, {
        onConflict: 'project_id,source_id'
      });

    if (!error) {
      segmentsCreated++;
      tokensIndexed += tokenCount;
    }
  }

  // Create segment for API contracts (from entry points of type 'api')
  const apiEntryPoints = codemap.entry_points.filter(ep => ep.type === 'api');
  if (apiEntryPoints.length > 0) {
    const content = `API Contracts (from Codemap):\n\n${apiEntryPoints.map(ep => `- \`${ep.path}\``).join('\n')}`;
    const tokenCount = estimateTokens(content);
    
    const { error } = await supabaseAdmin
      .from('project_memory_segments')
      .upsert({
        project_id: codemap.project_id,
        topic: 'api_contracts',
        content,
        token_count: tokenCount,
        source: 'codemap',
        source_id: `${codemap.project_id}:codemap:api`,
        relevance_score: 0.85,
      }, {
        onConflict: 'project_id,source_id'
      });

    if (!error) {
      segmentsCreated++;
      tokensIndexed += tokenCount;
    }
  }

  // Create segment for code patterns (language breakdown)
  if (Object.keys(codemap.stats.byLanguage).length > 0) {
    const content = `Code Patterns & Statistics (from Codemap):\n\n- Total Files: ${codemap.stats.totalFiles}\n- Total Directories: ${codemap.stats.totalDirectories}\n- Estimated Lines: ${codemap.stats.totalLines}\n\n## Languages\n${Object.entries(codemap.stats.byLanguage)
      .map(([lang, count]) => `- ${lang}: ${count} files (${((count / codemap.stats.totalFiles) * 100).toFixed(1)}%)`)
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
        source_id: `${codemap.project_id}:codemap:patterns`,
        relevance_score: 0.75,
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
