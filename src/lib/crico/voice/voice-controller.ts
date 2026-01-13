/**
 * CRICO Voice Controller
 * Voice command processing with safety controls and feedback
 */

import { supabase } from '@/lib/supabase/client';
import { createAction, executeAction, type CreateActionInput } from '../actions/action-executor';
import type {
  VoiceCommand,
  VoiceStatus,
  VoiceFeedback,
  Intent,
  ActionSource,
  AuthorityLevel,
  ActionScope,
  Environment,
  VOICE_RULES,
} from '../types';

// ============================================================================
// VOICE RULES & POLICIES
// ============================================================================

const VOICE_SAFETY_RULES = {
  alwaysConfirmDestructive: true,
  requireHighConfidence: 0.85,
  maxScopeWithoutConfirm: 'write' as AuthorityLevel,
  speakBackBeforeExecute: true,
  allowInterrupt: true,
  logAllTranscripts: true,
  minTranscriptLength: 3,
  maxTranscriptLength: 500,
} as const;

// Keywords that trigger confirmation
const DANGEROUS_KEYWORDS = [
  'delete', 'remove', 'drop', 'truncate', 'destroy',
  'production', 'prod', 'deploy', 'migrate',
  'all', 'everything', 'entire',
];

// Keywords that are blocked entirely
const BLOCKED_KEYWORDS = [
  'password', 'secret', 'api_key', 'apikey', 'token',
  'credit_card', 'creditcard', 'ssn', 'social_security',
];

// ============================================================================
// INTENT PARSING
// ============================================================================

interface ParsedIntent {
  intent: Intent;
  confidence: number;
  requiresConfirmation: boolean;
  blockedReason?: string;
}

/**
 * Parse voice transcript into structured intent
 * In production, this would use an LLM for better understanding
 */
export function parseVoiceIntent(transcript: string): ParsedIntent {
  const normalizedTranscript = transcript.toLowerCase().trim();
  
  // Check for blocked keywords
  for (const keyword of BLOCKED_KEYWORDS) {
    if (normalizedTranscript.includes(keyword)) {
      return {
        intent: { domain: 'system', action: 'blocked', entities: {}, confidence: 0 },
        confidence: 0,
        requiresConfirmation: false,
        blockedReason: `Voice commands cannot reference sensitive data (${keyword})`,
      };
    }
  }

  // Determine domain and action from transcript
  const { domain, action, entities } = extractIntentFromTranscript(normalizedTranscript);
  
  // Calculate base confidence (simplified - would use ML model)
  let confidence = 0.75;
  
  // Reduce confidence for ambiguous phrases
  if (normalizedTranscript.includes('maybe') || normalizedTranscript.includes('possibly')) {
    confidence -= 0.1;
  }
  if (normalizedTranscript.includes('i think') || normalizedTranscript.includes('perhaps')) {
    confidence -= 0.1;
  }
  
  // Increase confidence for clear commands
  if (normalizedTranscript.startsWith('please ') || normalizedTranscript.startsWith('can you ')) {
    confidence += 0.05;
  }

  // Check if confirmation is required
  let requiresConfirmation = false;
  
  // Dangerous keywords require confirmation
  for (const keyword of DANGEROUS_KEYWORDS) {
    if (normalizedTranscript.includes(keyword)) {
      requiresConfirmation = true;
      break;
    }
  }

  // Structural or destructive actions require confirmation
  const authorityLevel = getAuthorityLevel(action, domain);
  if (authorityLevel === 'structural' || authorityLevel === 'destructive') {
    requiresConfirmation = true;
  }

  return {
    intent: {
      domain,
      action,
      entities,
      confidence,
    },
    confidence: Math.max(0, Math.min(1, confidence)),
    requiresConfirmation,
  };
}

/**
 * Extract domain, action, and entities from transcript
 */
function extractIntentFromTranscript(transcript: string): {
  domain: Intent['domain'];
  action: string;
  entities: Record<string, unknown>;
} {
  const entities: Record<string, unknown> = {};
  let domain: Intent['domain'] = 'system';
  let action = 'unknown';

  // Task-related patterns
  if (transcript.includes('task') || transcript.includes('todo')) {
    domain = 'task';
    if (transcript.includes('create') || transcript.includes('add') || transcript.includes('new')) {
      action = 'create';
      // Extract task description
      const match = transcript.match(/(?:create|add|new)\s+(?:a\s+)?task\s+(?:to\s+)?(.+)/i);
      if (match) entities.description = match[1];
    } else if (transcript.includes('complete') || transcript.includes('finish') || transcript.includes('done')) {
      action = 'complete';
    } else if (transcript.includes('delete') || transcript.includes('remove')) {
      action = 'delete';
    } else if (transcript.includes('update') || transcript.includes('edit') || transcript.includes('change')) {
      action = 'update';
    } else if (transcript.includes('list') || transcript.includes('show') || transcript.includes('get')) {
      action = 'list';
    }
  }

  // Project-related patterns
  else if (transcript.includes('project')) {
    domain = 'project';
    if (transcript.includes('create') || transcript.includes('add') || transcript.includes('new')) {
      action = 'create';
      const match = transcript.match(/(?:create|add|new)\s+(?:a\s+)?project\s+(?:called\s+)?(.+)/i);
      if (match) entities.name = match[1];
    } else if (transcript.includes('move') || transcript.includes('assign')) {
      action = 'move';
    } else if (transcript.includes('archive')) {
      action = 'archive';
    }
  }

  // Schema/database patterns
  else if (transcript.includes('column') || transcript.includes('table') || transcript.includes('schema') || transcript.includes('database')) {
    domain = 'schema';
    if (transcript.includes('add') || transcript.includes('create')) {
      action = 'add_column';
      const match = transcript.match(/add\s+(?:a\s+)?(?:column\s+)?(?:called\s+)?(\w+)\s+to\s+(\w+)/i);
      if (match) {
        entities.columnName = match[1];
        entities.tableName = match[2];
      }
    } else if (transcript.includes('remove') || transcript.includes('drop')) {
      action = 'drop_column';
    } else if (transcript.includes('modify') || transcript.includes('alter')) {
      action = 'alter_column';
    }
  }

  // Code-related patterns
  else if (transcript.includes('test') || transcript.includes('function') || transcript.includes('code')) {
    domain = 'code';
    if (transcript.includes('generate') || transcript.includes('create') || transcript.includes('write')) {
      action = 'generate';
    } else if (transcript.includes('refactor')) {
      action = 'refactor';
    } else if (transcript.includes('fix') || transcript.includes('debug')) {
      action = 'fix';
    }
  }

  // Deploy patterns
  else if (transcript.includes('deploy') || transcript.includes('release') || transcript.includes('publish')) {
    domain = 'deploy';
    if (transcript.includes('status') || transcript.includes('check')) {
      action = 'status';
    } else if (transcript.includes('rollback') || transcript.includes('revert')) {
      action = 'rollback';
    } else {
      action = 'deploy';
    }
  }

  // Config patterns
  else if (transcript.includes('config') || transcript.includes('setting') || transcript.includes('feature flag')) {
    domain = 'config';
    if (transcript.includes('enable') || transcript.includes('turn on')) {
      action = 'enable';
    } else if (transcript.includes('disable') || transcript.includes('turn off')) {
      action = 'disable';
    } else if (transcript.includes('set') || transcript.includes('change')) {
      action = 'set';
    }
  }

  // System patterns
  else if (transcript.includes('health') || transcript.includes('status') || transcript.includes('system')) {
    domain = 'system';
    action = 'status';
  }

  return { domain, action, entities };
}

/**
 * Get authority level for an action
 */
function getAuthorityLevel(action: string, domain: Intent['domain']): AuthorityLevel {
  // Read operations
  if (['list', 'show', 'get', 'status', 'check'].includes(action)) {
    return 'read';
  }

  // Destructive operations
  if (['delete', 'drop', 'truncate', 'destroy', 'remove'].includes(action)) {
    return 'destructive';
  }

  // Structural operations
  if (['add_column', 'drop_column', 'alter_column', 'migrate', 'deploy'].includes(action)) {
    return 'structural';
  }

  // Schema domain is structural by default
  if (domain === 'schema') {
    return 'structural';
  }

  // Deploy domain is structural by default
  if (domain === 'deploy') {
    return 'structural';
  }

  // Default to write
  return 'write';
}

/**
 * Map intent domain to action scope
 */
function getActionScope(domain: Intent['domain']): ActionScope {
  const scopeMap: Record<Intent['domain'], ActionScope> = {
    task: 'tasks',
    project: 'tasks',
    schema: 'db',
    code: 'code',
    deploy: 'deploy',
    config: 'config',
    system: 'system',
  };
  return scopeMap[domain] ?? 'system';
}

// ============================================================================
// VOICE COMMAND PROCESSING
// ============================================================================

export interface ProcessVoiceResult {
  command: VoiceCommand;
  feedback: VoiceFeedback;
  action?: { id: string };
}

/**
 * Process a voice command
 */
export async function processVoiceCommand(
  transcript: string,
  sttConfidence: number,
  userId?: string,
  sessionId?: string,
  environment: Environment = 'development'
): Promise<ProcessVoiceResult> {
  const commandId = crypto.randomUUID();
  
  // Validate transcript
  if (transcript.length < VOICE_SAFETY_RULES.minTranscriptLength) {
    return createErrorResult(commandId, transcript, sttConfidence, 'Transcript too short', userId, sessionId);
  }
  
  if (transcript.length > VOICE_SAFETY_RULES.maxTranscriptLength) {
    return createErrorResult(commandId, transcript, sttConfidence, 'Transcript too long', userId, sessionId);
  }

  // Check STT confidence
  if (sttConfidence < VOICE_SAFETY_RULES.requireHighConfidence) {
    return createClarificationResult(
      commandId, 
      transcript, 
      sttConfidence,
      `I'm not sure I heard you correctly (${(sttConfidence * 100).toFixed(0)}% confidence). Could you please repeat that?`,
      userId,
      sessionId
    );
  }

  // Parse intent
  const parsed = parseVoiceIntent(transcript);
  
  // Check if blocked
  if (parsed.blockedReason) {
    return createErrorResult(commandId, transcript, sttConfidence, parsed.blockedReason, userId, sessionId);
  }

  // Check intent confidence
  if (parsed.confidence < 0.6) {
    return createClarificationResult(
      commandId,
      transcript,
      sttConfidence,
      `I understood "${transcript}" but I'm not confident about what you want to do. Can you be more specific?`,
      userId,
      sessionId
    );
  }

  // Create voice command record
  const command: VoiceCommand = {
    id: commandId,
    rawTranscript: transcript,
    sttConfidence,
    parsedIntent: parsed.intent,
    intentConfidence: parsed.confidence,
    confirmationRequired: parsed.requiresConfirmation,
    confirmationReceived: false,
    clarificationNeeded: false,
    status: parsed.requiresConfirmation ? 'awaiting_confirmation' : 'parsed',
    userId,
    sessionId,
    createdAt: new Date(),
    metadata: {},
  };

  // Save to database
  await saveVoiceCommand(command);

  // Generate appropriate feedback
  let feedback: VoiceFeedback;
  
  if (parsed.requiresConfirmation) {
    feedback = generateConfirmationFeedback(parsed.intent, transcript);
  } else {
    // Auto-execute for safe commands
    const actionInput = createActionInputFromIntent(parsed.intent, 'voice', userId, sessionId, environment);
    const action = await createAction(actionInput);
    
    // Update command with action
    command.actionId = action.id;
    command.status = 'executing';
    await updateVoiceCommand(command);
    
    // Execute action
    const result = await executeAction(action);
    
    command.status = result.success ? 'completed' : 'failed';
    await updateVoiceCommand(command);
    
    feedback = {
      type: result.success ? 'completion' : 'error',
      message: result.success 
        ? `Done! ${getCompletionMessage(parsed.intent)}`
        : `Failed: ${result.error}`,
      speakable: result.success
        ? `Done. ${getCompletionMessage(parsed.intent)}`
        : `Sorry, that failed. ${result.error}`,
      visualData: result,
      awaitingResponse: false,
      expectedResponses: [],
      timeout: 0,
    };

    return { command, feedback, action: { id: action.id } };
  }

  return { command, feedback };
}

/**
 * Confirm a pending voice command
 */
export async function confirmVoiceCommand(
  commandId: string,
  confirmationTranscript: string,
  userId?: string,
  environment: Environment = 'development'
): Promise<ProcessVoiceResult> {
  // Get command
  const { data: commandData } = await (supabase as any)
    .from('crico_voice_commands')
    .select('*')
    .eq('id', commandId)
    .single();

  if (!commandData) {
    return createErrorResult(commandId, '', 0, 'Command not found', userId);
  }

  const command: VoiceCommand = {
    id: commandData.id,
    rawTranscript: commandData.raw_transcript,
    sttConfidence: commandData.stt_confidence,
    parsedIntent: commandData.parsed_intent,
    intentConfidence: commandData.intent_confidence,
    confirmationRequired: commandData.confirmation_required,
    confirmationReceived: true,
    confirmationTranscript,
    confirmationAt: new Date(),
    clarificationNeeded: false,
    status: 'confirmed',
    userId: commandData.user_id,
    sessionId: commandData.session_id,
    createdAt: new Date(commandData.created_at),
    metadata: commandData.metadata,
  };

  // Check if confirmation is positive
  const normalizedConfirmation = confirmationTranscript.toLowerCase().trim();
  const positiveResponses = ['yes', 'yeah', 'yep', 'confirm', 'do it', 'proceed', 'go ahead', 'ok', 'okay', 'sure'];
  const negativeResponses = ['no', 'nope', 'cancel', 'stop', 'nevermind', 'abort', 'don\'t'];

  const isPositive = positiveResponses.some(r => normalizedConfirmation.includes(r));
  const isNegative = negativeResponses.some(r => normalizedConfirmation.includes(r));

  if (isNegative || !isPositive) {
    command.status = 'cancelled';
    await updateVoiceCommand(command);
    
    return {
      command,
      feedback: {
        type: 'completion',
        message: 'Cancelled.',
        speakable: 'Okay, I cancelled that.',
        awaitingResponse: false,
        expectedResponses: [],
        timeout: 0,
      },
    };
  }

  // Execute the action
  const actionInput = createActionInputFromIntent(
    command.parsedIntent!,
    'voice',
    userId,
    command.sessionId,
    environment
  );
  const action = await createAction(actionInput);
  
  command.actionId = action.id;
  command.status = 'executing';
  await updateVoiceCommand(command);

  const result = await executeAction(action);
  
  command.status = result.success ? 'completed' : 'failed';
  await updateVoiceCommand(command);

  return {
    command,
    feedback: {
      type: result.success ? 'completion' : 'error',
      message: result.success 
        ? `Done! ${getCompletionMessage(command.parsedIntent!)}`
        : `Failed: ${result.error}`,
      speakable: result.success
        ? `Done. ${getCompletionMessage(command.parsedIntent!)}`
        : `Sorry, that failed. ${result.error}`,
      visualData: result,
      awaitingResponse: false,
      expectedResponses: [],
      timeout: 0,
    },
    action: { id: action.id },
  };
}

/**
 * Cancel a pending voice command
 */
export async function cancelVoiceCommand(commandId: string): Promise<void> {
  await (supabase as any)
    .from('crico_voice_commands')
    .update({
      status: 'cancelled',
      confirmation_received: false,
    })
    .eq('id', commandId);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function createErrorResult(
  commandId: string,
  transcript: string,
  sttConfidence: number,
  error: string,
  userId?: string,
  sessionId?: string
): ProcessVoiceResult {
  const command: VoiceCommand = {
    id: commandId,
    rawTranscript: transcript,
    sttConfidence,
    confirmationRequired: false,
    confirmationReceived: false,
    clarificationNeeded: false,
    status: 'failed',
    userId,
    sessionId,
    createdAt: new Date(),
    metadata: { error },
  };

  return {
    command,
    feedback: {
      type: 'error',
      message: error,
      speakable: `Sorry, I can't do that. ${error}`,
      awaitingResponse: false,
      expectedResponses: [],
      timeout: 0,
    },
  };
}

function createClarificationResult(
  commandId: string,
  transcript: string,
  sttConfidence: number,
  clarificationPrompt: string,
  userId?: string,
  sessionId?: string
): ProcessVoiceResult {
  const command: VoiceCommand = {
    id: commandId,
    rawTranscript: transcript,
    sttConfidence,
    confirmationRequired: false,
    confirmationReceived: false,
    clarificationNeeded: true,
    clarificationPrompt,
    status: 'captured',
    userId,
    sessionId,
    createdAt: new Date(),
    metadata: {},
  };

  return {
    command,
    feedback: {
      type: 'clarification',
      message: clarificationPrompt,
      speakable: clarificationPrompt,
      awaitingResponse: true,
      expectedResponses: [],
      timeout: 30000,
    },
  };
}

function generateConfirmationFeedback(intent: Intent, transcript: string): VoiceFeedback {
  const actionDescriptions: Record<string, string> = {
    'task.create': 'create a new task',
    'task.delete': 'delete a task',
    'task.complete': 'mark a task as complete',
    'project.create': 'create a new project',
    'project.archive': 'archive a project',
    'schema.add_column': 'add a new column to the database',
    'schema.drop_column': 'remove a column from the database',
    'deploy.deploy': 'deploy to staging',
    'deploy.rollback': 'rollback the last deployment',
    'config.enable': 'enable a feature',
    'config.disable': 'disable a feature',
  };

  const key = `${intent.domain}.${intent.action}`;
  const description = actionDescriptions[key] ?? `${intent.action} in ${intent.domain}`;

  const entities = Object.entries(intent.entities)
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ');

  const speakable = entities
    ? `I'll ${description} with ${entities}. Should I proceed?`
    : `I'll ${description}. Should I proceed?`;

  return {
    type: 'confirmation',
    message: speakable,
    speakable,
    visualData: { intent, transcript },
    awaitingResponse: true,
    expectedResponses: ['yes', 'no', 'cancel'],
    timeout: 30000,
  };
}

function getCompletionMessage(intent: Intent): string {
  const messages: Record<string, string> = {
    'task.create': 'Task created successfully.',
    'task.delete': 'Task deleted.',
    'task.complete': 'Task marked as complete.',
    'task.update': 'Task updated.',
    'task.list': 'Here are your tasks.',
    'project.create': 'Project created successfully.',
    'project.archive': 'Project archived.',
    'schema.add_column': 'Column added to the database.',
    'schema.drop_column': 'Column removed from the database.',
    'deploy.status': 'Here\'s the deployment status.',
    'config.enable': 'Feature enabled.',
    'config.disable': 'Feature disabled.',
  };

  const key = `${intent.domain}.${intent.action}`;
  return messages[key] ?? `${intent.action} completed.`;
}

function createActionInputFromIntent(
  intent: Intent,
  source: ActionSource,
  userId?: string,
  sessionId?: string,
  environment: Environment = 'development'
): CreateActionInput {
  return {
    source,
    intent: `${intent.domain}.${intent.action}`,
    intentParsed: { ...intent, entities: intent.entities },
    authorityLevel: getAuthorityLevel(intent.action, intent.domain),
    scope: getActionScope(intent.domain),
    steps: [], // Steps would be populated based on intent
    userId,
    sessionId,
    environment,
    confidence: intent.confidence,
    metadata: { voiceIntent: intent },
  };
}

async function saveVoiceCommand(command: VoiceCommand): Promise<void> {
  await (supabase as any)
    .from('crico_voice_commands')
    .insert({
      id: command.id,
      raw_transcript: command.rawTranscript,
      stt_confidence: command.sttConfidence,
      parsed_intent: command.parsedIntent,
      intent_confidence: command.intentConfidence,
      confirmation_required: command.confirmationRequired,
      confirmation_received: command.confirmationReceived,
      clarification_needed: command.clarificationNeeded,
      clarification_prompt: command.clarificationPrompt,
      status: command.status,
      user_id: command.userId,
      session_id: command.sessionId,
      created_at: command.createdAt.toISOString(),
      metadata: command.metadata,
    });
}

async function updateVoiceCommand(command: VoiceCommand): Promise<void> {
  await (supabase as any)
    .from('crico_voice_commands')
    .update({
      action_id: command.actionId,
      status: command.status,
      confirmation_received: command.confirmationReceived,
      confirmation_transcript: command.confirmationTranscript,
      confirmation_at: command.confirmationAt?.toISOString(),
      processed_at: new Date().toISOString(),
    })
    .eq('id', command.id);
}
