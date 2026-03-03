/**
 * m2c1 Orchestration - 12-Phase Workflow Engine
 * 
 * Module exports for the orchestration feature.
 */

// Types
export {
  type OrchestrationPhaseType,
  type OrchestrationWorkflow,
  type WorkflowPhase,
  type PhaseTask,
  type PhaseContext,
  type ArtifactTemplate,
  type OrchestrationCallbackPayload,
  type CreateWorkflowInput,
  type AdvancePhaseResult,
  PHASE_DEFINITIONS,
  PHASE_ORDER,
} from './types';

// Services
export {
  buildPhaseContext,
  buildPhaseSystemPrompt,
  getArtifactTemplate,
} from './services/phase-templates';

export {
  createWorkflow,
  advancePhase,
  shardPhase,
  completePhaseTask,
  getWorkflowWithPhases,
} from './services/orchestration-engine';

// Store
export { useOrchestrationStore } from './stores/orchestration-store';

// Components
export { WorkflowOrchestrator } from './components/workflow-orchestrator';
export { PhaseCard } from './components/phase-card';
export { CreateWorkflowDialog } from './components/create-workflow-dialog';
export { WorkflowList } from './components/workflow-list';
