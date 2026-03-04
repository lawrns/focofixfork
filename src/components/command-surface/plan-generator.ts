import { v4 as uuidv4 } from 'uuid';
import type { CommandMode, IntentType, CommandPlan, PlanStep } from './types';
import { detectIntent } from './intent-detection';

export function generatePlan(intent: IntentType, mode: CommandMode, prompt: string): CommandPlan {
  const steps: PlanStep[] = [];
  let requiresApproval = false;
  let estimatedDuration = 0;

  steps.push({
    id: uuidv4(),
    type: 'ledger_log',
    description: 'Log command initiation to ledger',
    status: 'pending'
  });

  switch (intent) {
    case 'create_project':
      steps.push({
        id: uuidv4(),
        type: 'create_project',
        description: 'Create project in workspace',
        status: 'pending'
      });
      steps.push({
        id: uuidv4(),
        type: 'verify',
        description: 'Verify project was created',
        status: 'pending'
      });
      estimatedDuration = 2500;
      break;

    case 'create_cron':
      steps.push({
        id: uuidv4(),
        type: 'create_cron',
        description: 'Create scheduled cron job',
        status: 'pending'
      });
      steps.push({
        id: uuidv4(),
        type: 'verify',
        description: 'Verify cron was created successfully',
        status: 'pending'
      });
      estimatedDuration = 2000;
      break;

    case 'send_email':
      steps.push({
        id: uuidv4(),
        type: 'send_email',
        description: 'Queue email to outbox',
        status: 'pending'
      });
      steps.push({
        id: uuidv4(),
        type: 'verify',
        description: 'Verify email was queued',
        status: 'pending'
      });
      estimatedDuration = 1500;
      break;

    case 'create_task':
    case 'fix_issue':
      steps.push({
        id: uuidv4(),
        type: 'create_task',
        description: `Create ${intent === 'fix_issue' ? 'bug fix' : 'implementation'} task`,
        status: 'pending'
      });
      if (mode === 'cto') {
        steps.push({
          id: uuidv4(),
          type: 'create_run',
          description: 'Create agent run for implementation',
          status: 'pending'
        });
      }
      steps.push({
        id: uuidv4(),
        type: 'verify',
        description: 'Verify task was created',
        status: 'pending'
      });
      requiresApproval = true;
      estimatedDuration = 3000;
      break;

    case 'architect_feature':
      steps.push({
        id: uuidv4(),
        type: 'create_task',
        description: 'Create architecture planning task',
        status: 'pending'
      });
      steps.push({
        id: uuidv4(),
        type: 'create_run',
        description: 'Create agent run for architecture review',
        status: 'pending'
      });
      requiresApproval = true;
      estimatedDuration = 5000;
      break;

    default:
      steps.push({
        id: uuidv4(),
        type: 'report',
        description: 'Provide response to user',
        status: 'pending'
      });
      estimatedDuration = 1000;
  }

  steps.push({
    id: uuidv4(),
    type: 'report',
    description: 'Report execution results',
    status: 'pending'
  });

  const { confidence } = detectIntent(prompt);

  return {
    intent,
    confidence,
    steps,
    estimatedDuration,
    requiresApproval
  };
}
