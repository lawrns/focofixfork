/**
 * Context Builder Service
 * Assembles relevant memory segments into context within token budget
 */

import { supabaseAdmin } from '@/lib/supabase-server';
import type { 
  MemorySegment, 
  ContextBudget, 
  AssembledContext, 
  ContextAssemblyOptions,
  MemoryTopic 
} from '../types';

// Default token budget for context
const DEFAULT_MAX_TOKENS = 4000;
const DEFAULT_RESERVED_TOKENS = 1000; // for system prompt, task description

/**
 * Calculate available tokens for memory context
 */
export function calculateContextBudget(
  maxTokens: number = DEFAULT_MAX_TOKENS,
  reservedTokens: number = DEFAULT_RESERVED_TOKENS
): ContextBudget {
  return {
    maxTokens,
    reservedTokens,
    availableTokens: Math.max(0, maxTokens - reservedTokens),
  };
}

/**
 * Rank segments by relevance to the task
 */
export function rankSegments(
  segments: MemorySegment[],
  task?: string,
  preferredTopics?: MemoryTopic[]
): MemorySegment[] {
  return [...segments].sort((a, b) => {
    let scoreA = a.relevance_score;
    let scoreB = b.relevance_score;

    // Boost by recency
    const daysSinceAccessA = (Date.now() - new Date(a.last_accessed_at).getTime()) / (1000 * 60 * 60 * 24);
    const daysSinceAccessB = (Date.now() - new Date(b.last_accessed_at).getTime()) / (1000 * 60 * 60 * 24);
    scoreA += Math.max(0, 0.1 - daysSinceAccessA * 0.01);
    scoreB += Math.max(0, 0.1 - daysSinceAccessB * 0.01);

    // Boost preferred topics
    if (preferredTopics) {
      if (preferredTopics.includes(a.topic)) scoreA += 0.2;
      if (preferredTopics.includes(b.topic)) scoreB += 0.2;
    }

    // Task keyword matching (simple)
    if (task) {
      const taskLower = task.toLowerCase();
      const aContent = a.content.toLowerCase();
      const bContent = b.content.toLowerCase();
      
      // Count keyword matches
      const taskWords = taskLower.split(/\s+/).filter(w => w.length > 3);
      for (const word of taskWords) {
        if (aContent.includes(word)) scoreA += 0.05;
        if (bContent.includes(word)) scoreB += 0.05;
      }
    }

    return scoreB - scoreA;
  });
}

/**
 * Assemble context from memory segments within token budget
 */
export async function assembleContext(
  projectId: string,
  options: ContextAssemblyOptions = {}
): Promise<AssembledContext> {
  if (!supabaseAdmin) {
    return {
      segments: [],
      totalTokens: 0,
      formattedContext: '',
      topicsIncluded: [],
      sourcesIncluded: [],
    };
  }

  const {
    task,
    preferredTopics,
    minRelevance = 0.3,
    maxSegments = 20,
    recencyBoost = true,
  } = options;

  const budget = calculateContextBudget();

  // Fetch segments for project
  const { data, error } = await supabaseAdmin
    .from('project_memory_segments')
    .select('*')
    .eq('project_id', projectId)
    .gte('relevance_score', minRelevance)
    .order('relevance_score', { ascending: false })
    .limit(maxSegments * 2); // Fetch extra for filtering

  if (error || !data) {
    return {
      segments: [],
      totalTokens: 0,
      formattedContext: '',
      topicsIncluded: [],
      sourcesIncluded: [],
    };
  }

  let segments = data as MemorySegment[];

  // Rank segments
  segments = rankSegments(segments, task, preferredTopics);

  // Select segments within budget
  const selectedSegments: MemorySegment[] = [];
  let usedTokens = 0;
  const topicsIncluded = new Set<MemoryTopic>();
  const sourcesIncluded = new Set<string>();

  for (const segment of segments) {
    if (usedTokens + segment.token_count > budget.availableTokens) {
      break;
    }

    selectedSegments.push(segment);
    usedTokens += segment.token_count;
    topicsIncluded.add(segment.topic);
    sourcesIncluded.add(segment.source);

    // Update last_accessed_at for used segments
    await supabaseAdmin
      .from('project_memory_segments')
      .update({ last_accessed_at: new Date().toISOString() })
      .eq('id', segment.id);

    if (selectedSegments.length >= maxSegments) {
      break;
    }
  }

  // Format context
  const formattedContext = formatContext(selectedSegments);

  return {
    segments: selectedSegments,
    totalTokens: usedTokens,
    formattedContext,
    topicsIncluded: Array.from(topicsIncluded),
    sourcesIncluded: Array.from(sourcesIncluded) as ('handbook' | 'codemap' | 'pipeline_run' | 'manual' | 'auto_extracted')[],
  };
}

/**
 * Format segments into a readable context string
 */
function formatContext(segments: MemorySegment[]): string {
  if (segments.length === 0) {
    return '';
  }

  const parts: string[] = ['## Project Knowledge\n'];

  // Group by topic
  const byTopic: Record<string, MemorySegment[]> = {};
  for (const segment of segments) {
    if (!byTopic[segment.topic]) {
      byTopic[segment.topic] = [];
    }
    byTopic[segment.topic].push(segment);
  }

  // Format each topic section
  for (const [topic, topicSegments] of Object.entries(byTopic)) {
    parts.push(`\n### ${topic.replace('_', ' ').toUpperCase()}`);
    
    for (const segment of topicSegments) {
      parts.push(segment.content);
      parts.push(''); // Empty line between segments
    }
  }

  return parts.join('\n');
}

/**
 * Quick context assembly for delegation engine
 * This is the main entry point used by the delegation engine
 */
export async function assembleProjectContext(
  projectId: string,
  taskTitle: string,
  taskDescription?: string | null
): Promise<string> {
  const task = `${taskTitle} ${taskDescription || ''}`.trim();
  
  const context = await assembleContext(projectId, {
    task,
    preferredTopics: ['patterns', 'architecture', 'api_contracts'],
    minRelevance: 0.4,
    maxSegments: 10,
  });

  return context.formattedContext;
}
