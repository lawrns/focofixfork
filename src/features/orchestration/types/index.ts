/**
 * m2c1 Orchestration - 12-Phase Workflow Engine Types
 */

export type OrchestrationPhaseType = 
  | 'brain_dump' | 'prd' | 'research' | 'discovery' 
  | 'architecture' | 'implementation' | 'testing' | 'review'
  | 'documentation' | 'deployment' | 'monitoring' | 'retrospective';

export const PHASE_DEFINITIONS: Record<OrchestrationPhaseType, {
  label: string;
  description: string;
  icon: string;
}> = {
  brain_dump: { label: 'Brain Dump', description: 'Capture all ideas and requirements', icon: 'Brain' },
  prd: { label: 'PRD', description: 'Product Requirements Document', icon: 'FileText' },
  research: { label: 'Research', description: 'Technical and market research', icon: 'Search' },
  discovery: { label: 'Discovery', description: 'Requirements discovery', icon: 'Compass' },
  architecture: { label: 'Architecture', description: 'System design and architecture', icon: 'Layers' },
  implementation: { label: 'Implementation', description: 'Build the solution', icon: 'Code' },
  testing: { label: 'Testing', description: 'QA and validation', icon: 'TestTube' },
  review: { label: 'Review', description: 'Code and design review', icon: 'Eye' },
  documentation: { label: 'Documentation', description: 'Write docs and guides', icon: 'BookOpen' },
  deployment: { label: 'Deployment', description: 'Deploy to production', icon: 'Rocket' },
  monitoring: { label: 'Monitoring', description: 'Setup monitoring and alerts', icon: 'Activity' },
  retrospective: { label: 'Retrospective', description: 'Review and learn', icon: 'History' },
};

export const PHASE_ORDER: OrchestrationPhaseType[] = [
  'brain_dump',
  'prd',
  'research',
  'discovery',
  'architecture',
  'implementation',
  'testing',
  'review',
  'documentation',
  'deployment',
  'monitoring',
  'retrospective',
];

export interface OrchestrationWorkflow {
  id: string;
  project_id: string;
  title: string;
  status: 'draft' | 'running' | 'paused' | 'complete' | 'failed';
  current_phase_idx: number;
  context_accumulator: Record<string, unknown>;
  total_cost_usd: number;
  total_tokens_in: number;
  total_tokens_out: number;
  created_at: string;
  updated_at: string;
  project?: {
    id: string;
    name: string;
    slug: string;
  };
}

export interface WorkflowPhase {
  id: string;
  workflow_id: string;
  phase_type: OrchestrationPhaseType;
  phase_idx: number;
  status: 'pending' | 'running' | 'complete' | 'skipped' | 'failed';
  result?: Record<string, unknown>;
  artifact?: Record<string, unknown>;
  tokens_in: number;
  tokens_out: number;
  cost_usd: number;
  model?: string;
  started_at?: string;
  completed_at?: string;
}

export interface PhaseTask {
  id: string;
  phase_id: string;
  shard_idx: number;
  title: string;
  status: 'pending' | 'running' | 'complete' | 'failed';
  result?: Record<string, unknown>;
  external_run_id?: string;
  created_at: string;
  updated_at: string;
}

export interface PhaseContext {
  workflowTitle: string;
  brainDump?: string;
  accumulatedResults: Record<string, unknown>;
  previousPhaseResults?: Record<string, unknown>;
  currentPhaseIdx: number;
}

export interface ArtifactTemplate {
  structure: Record<string, unknown>;
  requiredFields: string[];
  format: 'json' | 'markdown' | 'yaml';
}

export interface OrchestrationCallbackPayload {
  task_id: string;
  status: 'complete' | 'failed' | 'error';
  output: string | Record<string, unknown>;
  tokens_in?: number;
  tokens_out?: number;
  cost_usd?: number;
  model?: string;
  completed_at?: string;
}

export interface CreateWorkflowInput {
  project_id: string;
  title: string;
  brain_dump?: string;
}

export interface AdvancePhaseResult {
  success: boolean;
  phaseId?: string;
  taskId?: string;
  error?: string;
}
