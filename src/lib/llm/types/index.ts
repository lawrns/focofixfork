/**
 * LLM Integration Module - Core Types
 * Unified interface for GLM 4.7 and Kimi 2.5 providers
 */

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'function';
  content: string;
  name?: string;
}

export interface LLMConversation {
  id: string;
  userId: string;
  messages: LLMMessage[];
  metadata: ConversationMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationMetadata {
  provider: LLMProvider;
  model: string;
  totalTokens: number;
  estimatedCost: number;
  lastAction?: ParsedAction;
}

export type LLMProvider = 'glm4' | 'kimi' | 'auto';

export interface LLMResponse {
  content: string;
  usage: TokenUsage;
  provider: LLMProvider;
  model: string;
  latency: number;
  raw?: unknown;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface LLMRequestOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  functions?: LLMFunction[];
  functionCall?: 'auto' | 'none' | { name: string };
}

export interface LLMFunction {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface ParsedAction {
  type: ActionType;
  parameters: Record<string, unknown>;
  confidence: number;
  rawQuery: string;
}

export type ActionType =
  | 'list_tasks'
  | 'create_task'
  | 'update_task'
  | 'delete_task'
  | 'complete_task'
  | 'set_reminder'
  | 'get_task_info'
  | 'general_query'
  | 'help';

export interface TaskContext {
  tasks: TaskSummary[];
  lists: string[];
  tags: string[];
  userPreferences: UserPreferences;
}

export interface TaskSummary {
  id: string;
  title: string;
  status: 'pending' | 'completed' | 'in_progress';
  dueDate?: Date;
  priority?: 'low' | 'medium' | 'high';
  tags?: string[];
  list?: string;
}

export interface UserPreferences {
  timezone: string;
  language: string;
  defaultList?: string;
  notificationEnabled: boolean;
}

export interface WhatsAppMessage {
  body: string;
  from: string;
  timestamp: Date;
  conversationId?: string;
}

export interface RateLimitStatus {
  remaining: number;
  resetAt: Date;
  currentUsage: number;
  limit: number;
}

export interface ProviderStatus {
  provider: LLMProvider;
  available: boolean;
  latency: number;
  error?: string;
  lastChecked: Date;
}

export interface CostEstimate {
  provider: LLMProvider;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  currency: string;
}

export interface LLMConfig {
  defaultProvider: LLMProvider;
  fallbackProvider: LLMProvider;
  maxRetries: number;
  timeoutMs: number;
  rateLimits: {
    requestsPerMinute: number;
    tokensPerMinute: number;
  };
  costLimits: {
    dailyBudget: number;
    warningThreshold: number;
  };
}

// Provider-specific types
export interface GLM4Config {
  apiKey: string;
  baseUrl?: string;
  model: 'glm-4-plus' | 'glm-4-0520' | 'glm-4-flash' | 'glm-4v-plus';
}

export interface KimiConfig {
  apiKey: string;
  baseUrl?: string;
  model: 'kimi-latest' | 'kimi-k2-0711-preview' | 'moonshot-v1-8k';
}

// Natural language parsing results
export interface ParsedTaskCommand {
  action: ActionType;
  taskData?: Partial<TaskData>;
  filters?: TaskFilters;
  reminder?: ReminderData;
}

export interface TaskData {
  title: string;
  description?: string;
  dueDate?: string;
  priority: 'low' | 'medium' | 'high';
  tags: string[];
  list: string;
  recurrence?: RecurrenceRule;
}

export interface TaskFilters {
  status?: 'pending' | 'completed' | 'all';
  list?: string;
  tags?: string[];
  priority?: 'low' | 'medium' | 'high';
  dueBefore?: string;
  dueAfter?: string;
}

export interface ReminderData {
  relativeTime?: { amount: number; unit: 'minutes' | 'hours' | 'days' };
  absoluteTime?: string;
  message?: string;
}

export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly';
  interval?: number;
  daysOfWeek?: number[];
  endDate?: string;
}
