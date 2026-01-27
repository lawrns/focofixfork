/**
 * FocoBot AI Service
 * Integrates with GLM 4.7 or Kimi 2.5 for natural language task management
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// LLM Configuration
interface LLMConfig {
  provider: 'openrouter' | 'deepseek' | 'openai';
  model: string;
  apiKey: string;
  baseUrl?: string;
}

// Available models
export const AVAILABLE_MODELS = {
  'glm-4.7': { provider: 'openrouter' as const, model: 'thudm/glm-4-9b-chat' },
  'kimi-2.5': { provider: 'openrouter' as const, model: 'moonshot/kimi-v2.5' },
  'claude-3.5-sonnet': { provider: 'openrouter' as const, model: 'anthropic/claude-3.5-sonnet' },
  'deepseek-chat': { provider: 'deepseek' as const, model: 'deepseek-chat' },
  'gpt-4o-mini': { provider: 'openai' as const, model: 'gpt-4o-mini' },
};

// Types
export interface ParsedIntent {
  intent: 'list_tasks' | 'create_task' | 'complete_task' | 'edit_task' | 'delete_task' | 'get_summary' | 'help' | 'unknown';
  confidence: number;
  entities: {
    taskTitle?: string;
    taskDescription?: string;
    dueDate?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    projectName?: string;
    taskId?: string;
    status?: string;
  };
  originalText: string;
}

export interface AIResponse {
  text: string;
  actions: Array<{
    type: string;
    params: Record<string, any>;
  }>;
  suggestions?: string[];
}

export interface TaskContext {
  userId: string;
  workspaceId?: string;
  projectId?: string;
  recentTasks?: Array<{
    id: string;
    title: string;
    status: string;
  }>;
  pendingTasks?: Array<{
    id: string;
    title: string;
    dueDate?: string;
    priority: string;
  }>;
}

/**
 * Get LLM configuration from environment
 */
function getLLMConfig(): LLMConfig {
  const preferredModel = process.env.FOCOBOT_LLM_MODEL || 'glm-4.7';
  const modelConfig = AVAILABLE_MODELS[preferredModel as keyof typeof AVAILABLE_MODELS] || AVAILABLE_MODELS['glm-4.7'];
  
  let apiKey = '';
  let baseUrl = '';
  
  switch (modelConfig.provider) {
    case 'openrouter':
      apiKey = process.env.OPENROUTER_API_KEY || '';
      baseUrl = 'https://openrouter.ai/api/v1';
      break;
    case 'deepseek':
      apiKey = process.env.DEEPSEEK_API_KEY || '';
      baseUrl = 'https://api.deepseek.com/v1';
      break;
    case 'openai':
      apiKey = process.env.OPENAI_API_KEY || '';
      baseUrl = 'https://api.openai.com/v1';
      break;
  }
  
  return {
    provider: modelConfig.provider,
    model: modelConfig.model,
    apiKey,
    baseUrl,
  };
}

class FocoBotAIService {
  private config: LLMConfig;
  private supabase: SupabaseClient;

  constructor() {
    this.config = getLLMConfig();
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    
    this.supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
  }

  /**
   * Call LLM API
   */
  private async callLLM(messages: Array<{ role: string; content: string }>): Promise<string> {
    if (!this.config.apiKey) {
      throw new Error('LLM API key not configured');
    }

    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_BASE_URL || '',
        'X-Title': 'FocoBot',
      },
      body: JSON.stringify({
        model: this.config.model,
        messages,
        temperature: 0.3,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`LLM API error: ${error}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }

  /**
   * Parse user intent from natural language
   */
  async parseIntent(text: string, context?: TaskContext): Promise<ParsedIntent> {
    const systemPrompt = `You are FocoBot, a helpful task management assistant. Parse the user's message and extract their intent.

Available intents:
- list_tasks: User wants to see their tasks
- create_task: User wants to create a new task
- complete_task: User wants to mark a task as done
- edit_task: User wants to modify an existing task
- delete_task: User wants to delete a task
- get_summary: User wants a summary of their work
- help: User needs help
- unknown: Cannot determine intent

Respond in JSON format:
{
  "intent": "one_of_the_above",
  "confidence": 0.0_to_1.0,
  "entities": {
    "taskTitle": "extracted task title if any",
    "taskDescription": "extracted description if any",
    "dueDate": "ISO date or relative date like 'tomorrow', 'next week'",
    "priority": "low|medium|high|urgent",
    "projectName": "project name if mentioned",
    "taskId": "task identifier if mentioned",
    "status": "task status filter if mentioned"
  }
}`;

    const contextPrompt = context ? `
Context:
- User has ${context.pendingTasks?.length || 0} pending tasks
- Recent tasks: ${context.recentTasks?.map(t => `"${t.title}" (ID: ${t.id})`).join(', ') || 'none'}
- Current workspace: ${context.workspaceId || 'not set'}
- Current project: ${context.projectId || 'not set'}
` : '';

    const userPrompt = `${contextPrompt}
User message: "${text}"

Parse this message and respond with JSON only.`;

    try {
      const response = await this.callLLM([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ]);

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          intent: parsed.intent || 'unknown',
          confidence: parsed.confidence || 0.5,
          entities: parsed.entities || {},
          originalText: text,
        };
      }
    } catch (error) {
      console.error('Failed to parse intent:', error);
    }

    return {
      intent: 'unknown',
      confidence: 0,
      entities: {},
      originalText: text,
    };
  }

  /**
   * Generate friendly response
   */
  async generateResponse(params: {
    intent: ParsedIntent;
    result: any;
    context?: TaskContext;
    error?: string;
  }): Promise<string> {
    const { intent, result, context, error } = params;

    const systemPrompt = `You are FocoBot, a helpful and friendly task management assistant. 
Respond in a conversational, encouraging tone. Keep responses concise (max 3-4 sentences for simple operations).
Use emojis occasionally to keep it friendly. Be helpful and offer relevant suggestions.`;

    let userPrompt = '';

    if (error) {
      userPrompt = `The user tried to: "${intent.originalText}"\nBut there was an error: ${error}\nGenerate a friendly error message and suggest what they can do.`;
    } else {
      switch (intent.intent) {
        case 'create_task':
          userPrompt = `Task created successfully: "${result.title}"${result.due_date ? ` due ${result.due_date}` : ''}. Generate a friendly confirmation.`;
          break;
        case 'complete_task':
          userPrompt = `Task "${result.title}" marked as complete. Generate a celebratory message.`;
          break;
        case 'list_tasks':
          const tasks = result.tasks || [];
          if (tasks.length === 0) {
            userPrompt = 'User has no tasks. Suggest creating one.';
          } else {
            userPrompt = `User has ${tasks.length} tasks:\n${tasks.map((t: any) => `- ${t.title} (${t.status})`).join('\n')}\nSummarize this briefly.`;
          }
          break;
        case 'get_summary':
          userPrompt = `User's summary: ${JSON.stringify(result)}. Present this in a friendly, organized way.`;
          break;
        default:
          userPrompt = `User said: "${intent.originalText}". Intent: ${intent.intent}. Provide a helpful response.`;
      }
    }

    try {
      return await this.callLLM([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ]);
    } catch (err) {
      console.error('Failed to generate response:', err);
      
      // Fallback responses
      if (error) {
        return `❌ Sorry, I couldn't do that. ${error}`;
      }
      
      switch (intent.intent) {
        case 'create_task':
          return `✅ Task "${result.title}" created successfully!`;
        case 'complete_task':
          return `🎉 Task "${result.title}" completed! Great job!`;
        case 'list_tasks':
          const count = result.tasks?.length || 0;
          return count === 0 
            ? "📭 You don't have any tasks. Try creating one by saying 'add task Review proposal'"
            : `📋 You have ${count} task${count === 1 ? '' : 's'}. Check them out in your Foco app!`;
        default:
          return "👋 I'm here to help! You can ask me to show your tasks, create new ones, or mark tasks as complete.";
      }
    }
  }

  /**
   * Extract date from natural language
   */
  async parseDate(dateText: string): Promise<Date | null> {
    const systemPrompt = `Convert natural language dates to ISO format. Respond with JSON: {"date": "YYYY-MM-DD"} or {"date": null} if unclear.`;
    
    try {
      const response = await this.callLLM([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Convert: "${dateText}"` },
      ]);

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.date ? new Date(parsed.date) : null;
      }
    } catch (error) {
      console.error('Failed to parse date:', error);
    }

    return null;
  }

  /**
   * Get task suggestions based on context
   */
  async getSuggestions(context: TaskContext): Promise<string[]> {
    const suggestions: string[] = [];
    
    if (!context.pendingTasks || context.pendingTasks.length === 0) {
      suggestions.push('Create your first task: "Add task Prepare presentation"');
    } else {
      const urgent = context.pendingTasks.filter(t => t.priority === 'urgent' || t.priority === 'high');
      if (urgent.length > 0) {
        suggestions.push(`You have ${urgent.length} high priority task${urgent.length === 1 ? '' : 's'} to tackle`);
      }
      
      const dueSoon = context.pendingTasks.filter(t => {
        if (!t.dueDate) return false;
        const due = new Date(t.dueDate);
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return due <= tomorrow;
      });
      
      if (dueSoon.length > 0) {
        suggestions.push(`${dueSoon.length} task${dueSoon.length === 1 ? '' : 's'} due soon`);
      }
    }
    
    suggestions.push('Type "help" to see what I can do');
    
    return suggestions;
  }

  /**
   * Generate daily summary
   */
  async generateDailySummary(params: {
    userId: string;
    completedToday: number;
    pendingTasks: Array<{
      id: string;
      title: string;
      dueDate?: string;
      priority: string;
    }>;
    overdueTasks: Array<{
      id: string;
      title: string;
    }>;
  }): Promise<string> {
    const systemPrompt = `You are FocoBot, a friendly task assistant. Generate a brief, encouraging daily summary for the user.
Be concise (3-5 sentences max). Use emojis. Be positive and motivating.`;

    const userPrompt = `Generate a daily summary:
- Tasks completed today: ${params.completedToday}
- Pending tasks: ${params.pendingTasks.length}
- Overdue tasks: ${params.overdueTasks.length}

${params.pendingTasks.length > 0 ? `Top priorities:\n${params.pendingTasks.slice(0, 3).map(t => `- ${t.title} (${t.priority})`).join('\n')}` : ''}

${params.overdueTasks.length > 0 ? `Overdue:\n${params.overdueTasks.slice(0, 2).map(t => `- ${t.title}`).join('\n')}` : ''}`;

    try {
      return await this.callLLM([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ]);
    } catch (error) {
      // Fallback summary
      const parts: string[] = ['📅 Daily Update:\n'];
      
      if (params.completedToday > 0) {
        parts.push(`✅ Completed ${params.completedToday} task${params.completedToday === 1 ? '' : 's'} today`);
      }
      
      parts.push(`📋 ${params.pendingTasks.length} pending task${params.pendingTasks.length === 1 ? '' : 's'}`);
      
      if (params.overdueTasks.length > 0) {
        parts.push(`⚠️ ${params.overdueTasks.length} overdue - let's catch up!`);
      }
      
      parts.push('\nKeep up the great work! 💪');
      
      return parts.join('\n');
    }
  }
}

// Singleton instance
let aiServiceInstance: FocoBotAIService | null = null;

export function getFocoBotAIService(): FocoBotAIService {
  if (!aiServiceInstance) {
    aiServiceInstance = new FocoBotAIService();
  }
  return aiServiceInstance;
}

export default FocoBotAIService;
