/**
 * Task Intake Types
 * Module 2: Task Intake / Quick Capture
 */

export type TaskClassification = 'human' | 'ai' | 'hybrid' | 'unclear';

export type TaskIntakeStatus = 'pending' | 'parsed' | 'classified' | 'dispatched' | 'completed' | 'discarded';

export type ExecutionMode = 'human' | 'agent' | 'hybrid';

export interface ParsedTaskResult {
  title: string;
  description?: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  project_slug?: string;
  tags?: string[];
  estimated_hours?: number;
  due_date?: string;
}

export interface DraftPlanTask {
  id: string;
  title: string;
  description?: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  status: 'backlog' | 'next' | 'in_progress' | 'review' | 'blocked' | 'done';
  recommended_execution: ExecutionMode;
  recommended_agent?: string | null;
  estimated_hours?: number | null;
  acceptance_criteria: string[];
  verification_steps: string[];
  dependencies: string[];
}

export interface DraftPlanResult {
  title: string;
  summary: string;
  goals: string[];
  constraints: string[];
  milestones: Array<{ id: string; title: string; goal: string }>;
  tasks: DraftPlanTask[];
  confidence_score: number;
}

export interface TaskIntakeItem {
  id: string;
  user_id: string;
  project_id?: string;
  raw_text: string;
  parsed_result: Partial<ParsedTaskResult>;
  classification: TaskClassification;
  auto_completed: boolean;
  task_id?: string;
  status: TaskIntakeStatus;
  ai_analysis: {
    reasoning?: string;
    suggested_actions?: string[];
    complexity?: 'simple' | 'medium' | 'complex';
    completeness?: number;
  };
  confidence_score: number;
  draft_plan?: DraftPlanResult;
  created_at: string;
  updated_at: string;
  processed_at?: string;
}

export interface IntakeProcessingOptions {
  autoDispatch?: boolean;
  preferredProjectId?: string;
  requireConfirmation?: boolean;
}

export interface IntakeStats {
  total: number;
  byStatus: Record<TaskIntakeStatus, number>;
  byClassification: Record<TaskClassification, number>;
  avgConfidence: number;
  autoCompleted: number;
}
