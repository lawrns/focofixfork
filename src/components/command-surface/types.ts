export type CommandMode = 'cto' | 'coo' | 'auto' | 'intake';

export type AgentExecutionStatus = 'queued' | 'executing' | 'completed' | 'error';

export type AgentExecutionEvent =
  | {
      type: 'status_update';
      status: AgentExecutionStatus;
      message?: string;
      phase?: string;
      timestamp: string;
    }
  | {
      type: 'output_chunk';
      text: string;
      phase?: string;
      timestamp: string;
    }
  | {
      type: 'reasoning';
      text: string;
      phase?: string;
      timestamp: string;
    }
  | {
      type: 'error';
      message: string;
      timestamp: string;
    }
  | {
      type: 'done';
      exitCode: number;
      summary?: string;
      timestamp: string;
    };

export type IntentType = 
  | 'create_project'
  | 'create_task' 
  | 'create_cron' 
  | 'send_email' 
  | 'fix_issue' 
  | 'architect_feature'
  | 'monitor_system'
  | 'schedule_reminder'
  | 'unknown';

export type StepResult =
  | { projectId: string; slug?: string }
  | { taskId: string; queued?: boolean }
  | { cronId: string }
  | { runId: string }
  | { emailId: string }
  | { verified: true }
  | { reported: true }
  | { logged: true }
  | Record<string, unknown>;

export type PlanStep = {
  id: string;
  type: 'create_project' | 'create_task' | 'create_cron' | 'send_email' | 'create_run' | 'ledger_log' | 'verify' | 'report';
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  result?: StepResult;
  error?: string;
};

export type CommandPlan = {
  intent: IntentType;
  confidence: number;
  steps: PlanStep[];
  estimatedDuration: number;
  requiresApproval: boolean;
};

export type AgentTrackerState = {
  runId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  runner?: string;
  startedAt?: string;
  currentStep?: string;
  outputPreview?: string;
  pollCount: number;
};

export type CommandExecution = {
  id: string;
  prompt: string;
  mode: CommandMode;
  plan: CommandPlan;
  status: 'planning' | 'delegating' | 'executing' | 'verifying' | 'reporting' | 'completed' | 'failed';
  currentStepIndex: number;
  createdAt: Date;
  updatedAt: Date;
  result?: unknown;
  error?: string;
  agentTracker?: AgentTrackerState;
};

export type CommandHistoryItem = {
  id: string;
  prompt: string;
  mode: CommandMode;
  intent: IntentType;
  confidence: number;
  status: 'running' | 'completed' | 'failed';
  outputPreview?: string;
  error?: string;
  runId?: string;
  createdAt: string;
  updatedAt: string;
};

export type CommandSurfaceProps = {
  context?: 'dashboard' | 'projects' | 'task' | 'crons' | 'emails' | 'decision-queue';
  contextId?: string;
  defaultMode?: CommandMode;
  onExecutionComplete?: (execution: CommandExecution) => void;
  className?: string;
};

export type CTODecision = {
  id: string;
  type: 'architecture' | 'implementation' | 'refactor' | 'security' | 'performance';
  title: string;
  description: string;
  projects?: Array<{
    name: string;
    description: string;
  }>;
  tasks: Array<{
    title: string;
    description: string;
    priority: 'urgent' | 'high' | 'medium' | 'low';
    estimatedHours: number;
  }>;
  runs: Array<{
    runner: string;
    task: string;
  }>;
  status: 'pending' | 'approved' | 'rejected' | 'in_progress';
};

export type COODecision = {
  id: string;
  type: 'schedule' | 'notify' | 'monitor' | 'automate';
  title: string;
  description: string;
  crons: Array<{
    name: string;
    schedule: string;
    handler: string;
  }>;
  emails: Array<{
    to: string[];
    subject: string;
    body: string;
  }>;
  status: 'pending' | 'approved' | 'rejected' | 'in_progress';
};
