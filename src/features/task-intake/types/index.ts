/**
 * Task Intake Types
 * Module 2: Task Intake / Quick Capture
 */

export type TaskClassification = 'human' | 'ai' | 'hybrid' | 'unclear';

export type TaskIntakeStatus = 'pending' | 'parsed' | 'classified' | 'dispatched' | 'completed' | 'discarded';

export interface ParsedTaskResult {
  title: string;
  description?: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  project_slug?: string;
  tags?: string[];
  estimated_hours?: number;
  due_date?: string;
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
