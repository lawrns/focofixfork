/**
 * Intake Processor Service
 * Processes natural language task input through AI classification
 */

import { supabaseAdmin } from '@/lib/supabase-server';
import { dispatchToClawdBot } from '@/lib/delegation/dispatchers';
import type { 
  TaskIntakeItem, 
  ParsedTaskResult, 
  TaskClassification, 
  IntakeProcessingOptions 
} from '../types';

/**
 * Submit raw text for intake processing
 */
export async function submitIntake(
  userId: string,
  rawText: string,
  options: IntakeProcessingOptions = {}
): Promise<TaskIntakeItem> {
  if (!supabaseAdmin) {
    throw new Error('Database not available');
  }

  const { preferredProjectId } = options;

  // Create intake record
  const { data: intake, error } = await supabaseAdmin
    .from('task_intake_queue')
    .insert({
      user_id: userId,
      project_id: preferredProjectId,
      raw_text: rawText,
      status: 'pending',
      classification: 'unclear',
      confidence_score: 0,
    })
    .select()
    .single();

  if (error || !intake) {
    throw new Error(`Failed to create intake: ${error?.message}`);
  }

  // Trigger async parsing
  parseIntakeItem(intake.id, rawText).catch(console.error);

  return intake as TaskIntakeItem;
}

/**
 * Parse raw text using ClawdBot
 */
export async function parseIntakeItem(
  intakeId: string,
  rawText: string
): Promise<void> {
  if (!supabaseAdmin) return;

  // Update status to parsing
  await supabaseAdmin
    .from('task_intake_queue')
    .update({ status: 'parsed' })
    .eq('id', intakeId);

  // Call ClawdBot for parsing
  const dispatchResult = await dispatchToClawdBot({
    taskId: `intake:${intakeId}`,
    title: 'Parse Task Intake',
    description: rawText,
    projectContext: '',
    featureContext: '',
    systemPrompt: `You are a task parsing assistant. Analyze the user's natural language input and extract structured task information.

Respond with a JSON object:
{
  "title": "Clear, actionable task title",
  "description": "Detailed description if provided, or null",
  "priority": "urgent|high|medium|low",
  "tags": ["relevant", "tags"],
  "estimated_hours": number or null,
  "project_hint": "suggested project category or null"
}

Be concise and accurate. Infer priority from urgency words (ASAP, urgent, critical = urgent; important = high; minor = low).`,
    agentId: 'clawdbot-parser',
    callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/task-intake/callback`,
  });

  if (!dispatchResult.success) {
    await supabaseAdmin
      .from('task_intake_queue')
      .update({ 
        status: 'discarded',
        ai_analysis: { error: dispatchResult.error }
      })
      .eq('id', intakeId);
  }
}

/**
 * Handle parsing callback from ClawdBot
 */
export async function handleIntakeCallback(
  intakeId: string,
  parsedOutput: string
): Promise<void> {
  if (!supabaseAdmin) return;

  try {
    const parsed = JSON.parse(parsedOutput) as ParsedTaskResult;
    
    // Classify the task
    const { classification, confidence } = classifyTask(parsed);

    await supabaseAdmin
      .from('task_intake_queue')
      .update({
        parsed_result: parsed,
        classification,
        confidence_score: confidence,
        status: 'classified',
        ai_analysis: {
          reasoning: `Classified as ${classification} based on complexity and clarity`,
          complexity: estimateComplexity(parsed),
          completeness: calculateCompleteness(parsed),
        },
      })
      .eq('id', intakeId);

    // Auto-dispatch if AI-completable and high confidence
    if (classification === 'ai' && confidence > 0.7) {
      await autoCompleteIntake(intakeId, parsed);
    }
  } catch (error) {
    console.error('[IntakeCallback] Parse error:', error);
    await supabaseAdmin
      .from('task_intake_queue')
      .update({
        status: 'discarded',
        ai_analysis: { error: 'Failed to parse AI response' }
      })
      .eq('id', intakeId);
  }
}

/**
 * Classify task as human/ai/hybrid/unclear
 */
function classifyTask(parsed: ParsedTaskResult): {
  classification: TaskClassification;
  confidence: number;
} {
  let aiScore = 0;
  let humanScore = 0;

  // Factors that suggest AI can handle it
  if (!parsed.estimated_hours || parsed.estimated_hours <= 4) aiScore += 0.3;
  if (parsed.priority === 'low' || parsed.priority === 'medium') aiScore += 0.2;
  if (parsed.title && parsed.title.length < 100) aiScore += 0.2;
  if (parsed.description && parsed.description.length < 500) aiScore += 0.2;

  // Factors that suggest human needed
  if (parsed.estimated_hours && parsed.estimated_hours > 8) humanScore += 0.4;
  if (parsed.priority === 'urgent') humanScore += 0.3;
  if (/meeting|discussion|stakeholder|approval|decision/i.test(parsed.title)) {
    humanScore += 0.3;
  }

  const confidence = Math.max(aiScore, humanScore);
  
  if (aiScore > 0.6 && aiScore > humanScore) {
    return { classification: 'ai', confidence };
  }
  if (humanScore > 0.6 && humanScore > aiScore) {
    return { classification: 'human', confidence };
  }
  if (aiScore > 0.3 && humanScore > 0.3) {
    return { classification: 'hybrid', confidence };
  }
  return { classification: 'unclear', confidence: 0.5 };
}

/**
 * Estimate task complexity
 */
function estimateComplexity(parsed: ParsedTaskResult): 'simple' | 'medium' | 'complex' {
  const hours = parsed.estimated_hours;
  if (!hours || hours <= 2) return 'simple';
  if (hours <= 6) return 'medium';
  return 'complex';
}

/**
 * Calculate completeness score
 */
function calculateCompleteness(parsed: ParsedTaskResult): number {
  let score = 0;
  if (parsed.title) score += 0.3;
  if (parsed.description) score += 0.2;
  if (parsed.priority) score += 0.2;
  if (parsed.tags && parsed.tags.length > 0) score += 0.15;
  if (parsed.estimated_hours) score += 0.15;
  return score;
}

/**
 * Auto-complete an AI-classified intake by creating a task and dispatching
 */
export async function autoCompleteIntake(
  intakeId: string,
  parsed: ParsedTaskResult
): Promise<string | null> {
  if (!supabaseAdmin) return null;

  // Get intake to find project_id
  const { data: intake } = await supabaseAdmin
    .from('task_intake_queue')
    .select('project_id, user_id')
    .eq('id', intakeId)
    .single();

  if (!intake) return null;

  // Create the task
  const { data: task, error: taskError } = await supabaseAdmin
    .from('work_items')
    .insert({
      title: parsed.title,
      description: parsed.description,
      priority: parsed.priority,
      status: 'backlog',
      project_id: intake.project_id,
      delegation_status: 'pending',
      created_by: intake.user_id,
    })
    .select()
    .single();

  if (taskError || !task) {
    console.error('[AutoComplete] Failed to create task:', taskError);
    return null;
  }

  // Update intake
  await supabaseAdmin
    .from('task_intake_queue')
    .update({
      task_id: task.id,
      status: 'dispatched',
      auto_completed: true,
      processed_at: new Date().toISOString(),
    })
    .eq('id', intakeId);

  // Trigger delegation engine tick
  try {
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/delegation/tick`, {
      method: 'POST',
      headers: { 'x-internal-token': process.env.DELEGATION_INTERNAL_TOKEN || '' },
    });
  } catch (e) {
    // Non-fatal — delegation will pick it up on next scheduled tick
  }

  return task.id;
}

/**
 * Convert intake to task (manual action)
 */
export async function convertIntakeToTask(
  intakeId: string,
  overrides: Partial<ParsedTaskResult> = {}
): Promise<string | null> {
  if (!supabaseAdmin) return null;

  const { data: intake } = await supabaseAdmin
    .from('task_intake_queue')
    .select('*')
    .eq('id', intakeId)
    .single();

  if (!intake) return null;

  const parsed = { ...intake.parsed_result, ...overrides } as ParsedTaskResult;
  
  const taskId = await autoCompleteIntake(intakeId, parsed);
  
  if (taskId) {
    await supabaseAdmin
      .from('task_intake_queue')
      .update({ status: 'completed' })
      .eq('id', intakeId);
  }

  return taskId;
}

/**
 * Discard an intake item
 */
export async function discardIntake(intakeId: string): Promise<void> {
  if (!supabaseAdmin) return;

  await supabaseAdmin
    .from('task_intake_queue')
    .update({
      status: 'discarded',
      processed_at: new Date().toISOString(),
    })
    .eq('id', intakeId);
}

/**
 * Stream parse intake for real-time preview (Module 2)
 */
export async function streamParseIntake(
  rawText: string,
  projectContext?: string
): Promise<ReadableStream> {
  const encoder = new TextEncoder();
  
  return new ReadableStream({
    async start(controller) {
      try {
        // Send initial parsing event
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'parsing' })}\n\n`));
        
        // Simulate parsing delay
        await new Promise(r => setTimeout(r, 500));
        
        // Extract basic info from text
        const titleMatch = rawText.match(/(?:create task to|fix|implement|build|solve)\s+(.+?)(?:\.|$)/i);
        const title = titleMatch ? titleMatch[1].trim() : rawText.slice(0, 100);
        
        let priority: 'urgent' | 'high' | 'medium' | 'low' = 'medium';
        if (/urgent|critical|asap|p0|p1/i.test(rawText)) priority = 'urgent';
        else if (/high priority|important/i.test(rawText)) priority = 'high';
        else if (/low priority|minor/i.test(rawText)) priority = 'low';
        
        // Send parsed result
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'parsed',
          result: {
            title: title.charAt(0).toUpperCase() + title.slice(1),
            priority,
            estimated_hours: rawText.match(/(\d+)\s*(hour|hr)/i) ? parseInt(rawText.match(/(\d+)\s*(hour|hr)/i)![1]) : undefined,
          }
        })}\n\n`));
        
        // Send done event
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
        controller.close();
      } catch (error) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
          type: 'error', 
          message: error instanceof Error ? error.message : 'Unknown error' 
        })}\n\n`));
        controller.close();
      }
    },
  });
}

/**
 * Get intake statistics
 */
export async function getIntakeStats(userId: string): Promise<{
  total: number;
  pending: number;
  byClassification: Record<string, number>;
}> {
  if (!supabaseAdmin) {
    return { total: 0, pending: 0, byClassification: {} };
  }

  const { data, error } = await supabaseAdmin
    .from('task_intake_queue')
    .select('status, classification')
    .eq('user_id', userId);

  if (error || !data) {
    return { total: 0, pending: 0, byClassification: {} };
  }

  const stats = {
    total: data.length,
    pending: data.filter((i: any) => ['pending', 'parsed', 'classified'].includes(i.status)).length,
    byClassification: {} as Record<string, number>,
  };

  for (const item of data as any[]) {
    stats.byClassification[item.classification] = 
      (stats.byClassification[item.classification] || 0) + 1;
  }

  return stats;
}
