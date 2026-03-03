/**
 * Memory Management Types
 * Module 6: Memory Management
 */

export type MemoryTopic = 'debugging' | 'patterns' | 'architecture' | 'api_contracts' | 'general';

export type MemorySource = 'handbook' | 'codemap' | 'pipeline_run' | 'manual' | 'auto_extracted';

export interface MemorySegment {
  id: string;
  project_id: string;
  topic: MemoryTopic;
  content: string;
  token_count: number;
  source: MemorySource;
  source_id?: string;
  relevance_score: number;
  last_accessed_at: string;
  created_at: string;
  updated_at: string;
}

export interface ContextBudget {
  maxTokens: number;
  reservedTokens: number; // for system prompt, task description
  availableTokens: number;
}

export interface AssembledContext {
  segments: MemorySegment[];
  totalTokens: number;
  formattedContext: string;
  topicsIncluded: MemoryTopic[];
  sourcesIncluded: MemorySource[];
}

export interface MemoryStats {
  totalSegments: number;
  totalTokens: number;
  byTopic: Record<MemoryTopic, number>;
  bySource: Record<MemorySource, number>;
  avgRelevance: number;
  lastUpdated: string | null;
}

export interface MemoryHygieneReport {
  staleSegments: MemorySegment[];
  duplicates: Array<{ content: string; segments: MemorySegment[] }>;
  lowRelevance: MemorySegment[];
  totalPrunable: number;
}

export interface ContextAssemblyOptions {
  task?: string;
  preferredTopics?: MemoryTopic[];
  minRelevance?: number;
  maxSegments?: number;
  recencyBoost?: boolean;
}
