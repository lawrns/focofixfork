/**
 * LLM-Based Intent Parser for Voice Commands
 * Uses DeepSeek to extract structured intents from natural language
 */

import { AIService } from '@/lib/services/ai-service';

export interface ParsedVoiceIntent {
  domain: 'task' | 'project' | 'search' | 'team' | 'dashboard' | 'settings' | 'unknown';
  action: string;
  entities: {
    taskTitle?: string;
    taskId?: string;
    projectName?: string;
    projectId?: string;
    personName?: string;
    personId?: string;
    status?: string;
    priority?: string;
    dueDate?: string;
    description?: string;
    tags?: string[];
    query?: string;
    [key: string]: unknown;
  };
  confidence: number;
  requiresConfirmation: boolean;
  missingParams: string[];
  originalTranscript: string;
  suggestedResponse?: string;
}

export interface ConversationContext {
  sessionId: string;
  userId: string;
  workspaceId: string;
  workspaceName?: string;

  // Recent entity references for "it", "that", etc.
  lastMentionedTask?: { id: string; title: string };
  lastMentionedProject?: { id: string; name: string };
  lastMentionedPerson?: { id: string; name: string };

  // Recent conversation for context
  recentCommands: Array<{
    transcript: string;
    intent: ParsedVoiceIntent;
    timestamp: number;
  }>;

  // Current focus
  currentProjectId?: string;
  currentProjectName?: string;
}

const DANGEROUS_ACTIONS = ['delete', 'remove', 'archive', 'drop', 'destroy'];
const DESTRUCTIVE_ACTIONS = ['delete', 'drop', 'destroy', 'truncate'];

/**
 * Parse voice command using LLM
 */
export async function parseIntentWithLLM(
  transcript: string,
  context: Partial<ConversationContext> = {}
): Promise<ParsedVoiceIntent> {
  const aiService = new AIService();

  const systemPrompt = `You are the voice command parser for Foco, a project management application.
Your job is to extract structured intent from natural language voice commands.

IMPORTANT: Respond ONLY with valid JSON, no explanation or markdown.

The JSON must have this exact structure:
{
  "domain": "task" | "project" | "search" | "team" | "dashboard" | "settings" | "unknown",
  "action": string (e.g., "create", "update", "delete", "list", "complete", "assign", "move"),
  "entities": {
    "taskTitle": string or null,
    "projectName": string or null,
    "personName": string or null,
    "status": string or null (todo, in_progress, review, done, blocked),
    "priority": string or null (low, medium, high, urgent),
    "dueDate": string or null (ISO date or relative like "tomorrow"),
    "description": string or null,
    "tags": array of strings or null,
    "query": string or null (for search)
  },
  "confidence": number 0-1,
  "requiresConfirmation": boolean (true for delete/archive/destructive),
  "missingParams": array of strings (what info is needed),
  "suggestedResponse": string (what to say back to user)
}

Rules:
1. If user says "it" or "that", check context for last mentioned entity
2. Status values: todo, in_progress, review, done, blocked
3. Priority values: low, medium, high, urgent
4. Always require confirmation for delete/archive/remove actions
5. If intent is unclear, set domain to "unknown" and suggest clarification`;

  const userPrompt = `Parse this voice command: "${transcript}"

Context:
- Workspace: ${context.workspaceName || 'Unknown'}
- Current project: ${context.currentProjectName || 'None'}
- Last mentioned task: ${context.lastMentionedTask?.title || 'None'}
- Last mentioned project: ${context.lastMentionedProject?.name || 'None'}
- Last mentioned person: ${context.lastMentionedPerson?.name || 'None'}
- Recent commands: ${context.recentCommands?.slice(-3).map(c => c.transcript).join('; ') || 'None'}

Return ONLY valid JSON.`;

  try {
    const response = await aiService.chatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]);

    // Parse the JSON response
    let parsed: ParsedVoiceIntent;
    try {
      // Handle potential markdown code blocks
      let jsonStr = response;
      const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      }
      parsed = JSON.parse(jsonStr.trim());
    } catch {
      // If JSON parsing fails, return unknown intent
      console.error('[LLM Intent Parser] Failed to parse JSON:', response);
      return createUnknownIntent(transcript, 'Failed to understand command');
    }

    // Validate and normalize the response
    parsed.originalTranscript = transcript;

    // Ensure required fields exist
    if (!parsed.domain) parsed.domain = 'unknown';
    if (!parsed.action) parsed.action = 'unknown';
    if (!parsed.entities) parsed.entities = {};
    if (typeof parsed.confidence !== 'number') parsed.confidence = 0.5;
    if (!Array.isArray(parsed.missingParams)) parsed.missingParams = [];

    // Auto-detect confirmation requirements
    if (DANGEROUS_ACTIONS.includes(parsed.action.toLowerCase())) {
      parsed.requiresConfirmation = true;
    }
    if (DESTRUCTIVE_ACTIONS.includes(parsed.action.toLowerCase())) {
      parsed.requiresConfirmation = true;
    }

    // Resolve pronouns from context
    if (parsed.entities.taskTitle?.toLowerCase() === 'it' && context.lastMentionedTask) {
      parsed.entities.taskTitle = context.lastMentionedTask.title;
      parsed.entities.taskId = context.lastMentionedTask.id;
    }
    if (parsed.entities.projectName?.toLowerCase() === 'it' && context.lastMentionedProject) {
      parsed.entities.projectName = context.lastMentionedProject.name;
      parsed.entities.projectId = context.lastMentionedProject.id;
    }

    // Use current project as default if none specified
    if (!parsed.entities.projectId && !parsed.entities.projectName && context.currentProjectId) {
      parsed.entities.projectId = context.currentProjectId;
      parsed.entities.projectName = context.currentProjectName;
    }

    return parsed;
  } catch (error) {
    console.error('[LLM Intent Parser] Error:', error);
    return createUnknownIntent(transcript, 'Failed to process command');
  }
}

/**
 * Create an unknown intent response
 */
function createUnknownIntent(transcript: string, reason: string): ParsedVoiceIntent {
  return {
    domain: 'unknown',
    action: 'unknown',
    entities: {},
    confidence: 0,
    requiresConfirmation: false,
    missingParams: [],
    originalTranscript: transcript,
    suggestedResponse: `I didn't understand that. ${reason}. Try saying something like "create a task called..." or "show my tasks".`
  };
}

/**
 * Map parsed intent to CRICO action types
 */
export function mapIntentToAction(
  intent: ParsedVoiceIntent
): { domain: string; action: string; entities: Record<string, unknown> } | null {
  const { domain, action, entities } = intent;

  // Task operations
  if (domain === 'task') {
    switch (action.toLowerCase()) {
      case 'create':
      case 'add':
      case 'make':
        return {
          domain: 'task',
          action: 'create',
          entities: {
            title: entities.taskTitle || entities.description,
            projectId: entities.projectId,
            projectName: entities.projectName,
            priority: entities.priority,
            dueDate: entities.dueDate,
            assignee: entities.personName
          }
        };

      case 'complete':
      case 'finish':
      case 'done':
        return {
          domain: 'task',
          action: 'complete',
          entities: {
            taskId: entities.taskId,
            taskTitle: entities.taskTitle
          }
        };

      case 'delete':
      case 'remove':
        return {
          domain: 'task',
          action: 'delete',
          entities: {
            taskId: entities.taskId,
            taskTitle: entities.taskTitle
          }
        };

      case 'update':
      case 'change':
      case 'set':
      case 'modify':
        return {
          domain: 'task',
          action: 'update',
          entities: {
            taskId: entities.taskId,
            taskTitle: entities.taskTitle,
            status: entities.status,
            priority: entities.priority,
            dueDate: entities.dueDate,
            assignee: entities.personName
          }
        };

      case 'assign':
        return {
          domain: 'task',
          action: 'update',
          entities: {
            taskId: entities.taskId,
            taskTitle: entities.taskTitle,
            assignee: entities.personName
          }
        };

      case 'list':
      case 'show':
      case 'get':
        return {
          domain: 'task',
          action: 'list',
          entities: {
            projectId: entities.projectId,
            status: entities.status,
            assignee: entities.personName
          }
        };

      default:
        return null;
    }
  }

  // Project operations
  if (domain === 'project') {
    switch (action.toLowerCase()) {
      case 'create':
      case 'add':
      case 'make':
        return {
          domain: 'project',
          action: 'create',
          entities: {
            name: entities.projectName,
            description: entities.description
          }
        };

      case 'archive':
        return {
          domain: 'project',
          action: 'archive',
          entities: {
            projectId: entities.projectId,
            projectName: entities.projectName
          }
        };

      case 'list':
      case 'show':
        return {
          domain: 'project',
          action: 'list',
          entities: {
            status: entities.status
          }
        };

      default:
        return null;
    }
  }

  // Search operations
  if (domain === 'search') {
    return {
      domain: 'search',
      action: 'search',
      entities: {
        query: entities.query || intent.originalTranscript,
        type: entities.taskTitle ? 'task' : 'all'
      }
    };
  }

  // Dashboard operations
  if (domain === 'dashboard') {
    return {
      domain: 'dashboard',
      action: 'show',
      entities: {}
    };
  }

  return null;
}

/**
 * Generate a natural language response for the intent
 */
export function generateIntentResponse(intent: ParsedVoiceIntent): string {
  if (intent.suggestedResponse) {
    return intent.suggestedResponse;
  }

  const { domain, action, entities } = intent;

  if (domain === 'unknown') {
    return "I'm not sure what you want me to do. Try saying something like 'create a task' or 'show my projects'.";
  }

  if (intent.missingParams.length > 0) {
    return `I need more information. What's the ${intent.missingParams[0]}?`;
  }

  // Build response based on intent
  if (domain === 'task') {
    switch (action) {
      case 'create':
        return `Creating task: ${entities.taskTitle || 'new task'}`;
      case 'complete':
        return `Marking ${entities.taskTitle || 'task'} as complete`;
      case 'delete':
        return `Delete ${entities.taskTitle || 'task'}? Say yes to confirm.`;
      case 'update':
        const changes = [];
        if (entities.status) changes.push(`status to ${entities.status}`);
        if (entities.priority) changes.push(`priority to ${entities.priority}`);
        if (entities.personName) changes.push(`assigned to ${entities.personName}`);
        return `Updating ${entities.taskTitle || 'task'}: ${changes.join(', ')}`;
      case 'list':
        return 'Showing your tasks';
      default:
        return `Processing ${action} for task`;
    }
  }

  if (domain === 'project') {
    switch (action) {
      case 'create':
        return `Creating project: ${entities.projectName || 'new project'}`;
      case 'archive':
        return `Archive ${entities.projectName || 'project'}? Say yes to confirm.`;
      case 'list':
        return 'Showing your projects';
      default:
        return `Processing ${action} for project`;
    }
  }

  if (domain === 'search') {
    return `Searching for: ${entities.query || 'items'}`;
  }

  if (domain === 'dashboard') {
    return 'Opening your dashboard';
  }

  return 'Processing your request...';
}
