/**
 * OpenClaw Personality Configuration Types
 * Defines the structure for SOUL.md, AGENTS.md, USER.md, IDENTITY.md, etc.
 */

// IDENTITY.md
export interface IdentityConfig {
  name: string;
  emoji: string;
  theme: 'lobster' | 'minimal' | 'corporate' | 'playful';
  creature: 'ai' | 'system' | 'familiar' | 'assistant' | 'partner';
  avatar?: string;
  tagline?: string;
}

// SOUL.md
export interface SoulConfig {
  coreTruths: string[];
  communicationStyle: {
    tone: 'professional' | 'casual' | 'witty' | 'direct' | 'supportive';
    verbosity: 'concise' | 'balanced' | 'detailed';
    humorLevel: number; // 0-10
    formality: 'formal' | 'neutral' | 'informal';
  };
  values: string[];
  boundaries: string[];
  antiPatterns: string[];
  exampleResponses: {
    good: string[];
    bad: string[];
  };
}

// AGENTS.md
export interface AgentsConfig {
  role: string;
  workflow: {
    steps: WorkflowStep[];
  };
  codeStandards: {
    language: string;
    stylePreferences: string[];
    testingPolicy: 'tdd' | 'after' | 'optional' | 'required';
    documentationPolicy: 'inline' | 'separate' | 'minimal';
  };
  decisionFramework: {
    performanceBottleneck: string;
    newFeature: string;
    bugFix: string;
    technicalDebt: string;
    securityIssue: string;
  };
  responseGuidelines: {
    maxLength: number;
    requireCodeExamples: boolean;
    includeTradeoffs: boolean;
    errorHandlingRequired: boolean;
    askClarifyingQuestions: boolean;
  };
  prohibitedOperations: string[];
}

export interface WorkflowStep {
  order: number;
  title: string;
  description: string;
}

// USER.md
export interface UserConfig {
  profile: {
    name: string;
    role: string;
    company?: string;
    timezone: string;
    workingHours: {
      start: string;
      end: string;
    };
    preferredContact: string;
  };
  technicalStack: {
    proficient: string[];
    learning: string[];
    notFamiliar: string[];
  };
  currentProjects: Project[];
  preferences: {
    communicationStyle: string;
    codeReviewStyle: 'thorough' | 'quick' | 'suggestive';
    meetingPreference: 'async' | 'sync' | 'mixed';
  };
}

export interface Project {
  name: string;
  description: string;
  stack: string[];
  status: 'active' | 'paused' | 'completed';
}

// HEARTBEAT.md
export interface HeartbeatConfig {
  enabled: boolean;
  interval: string; // "30m", "1h", etc.
  activeHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
  checklist: ChecklistItem[];
  responseRules: {
    silentCondition: string;
    alertCondition: string;
    digestInterval: string;
  };
}

export interface ChecklistItem {
  id: string;
  emoji: string;
  task: string;
  priority: 'low' | 'medium' | 'high';
  enabled: boolean;
}

// Complete personality configuration
export interface PersonalityConfig {
  identity: IdentityConfig;
  soul: SoulConfig;
  agents: AgentsConfig;
  user: UserConfig;
  heartbeat: HeartbeatConfig;
}

// File metadata
export interface WorkspaceFile {
  filename: string;
  path: string;
  size: number;
  lastModified: string;
  charCount: number;
  truncated: boolean;
}

// API Response types
export interface OpenClawApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Raw file content
export interface FileContent {
  content: string;
  metadata: WorkspaceFile;
}

// Progress event type for OpenClaw run progress
export interface OpenClawProgressEvent {
  id: string;
  type: string;
  status: string | null;
  message: string | null;
  timestamp: string;
  correlationId: string | null;
  contextId: string | null;
  source: string | null;
  payload: Record<string, unknown>;
}

// Tab info from OpenClaw
export interface OpenClawTabInfo {
  id: string;
  title: string;
  url: string;
  attached: boolean;
  profile: string | undefined;
  lastSeen: string | undefined;
}

// Profile info from OpenClaw
export interface OpenClawProfileInfo {
  name: string;
  active: boolean;
}

// Runtime snapshot for OpenClaw status
export interface OpenClawRuntimeSnapshot {
  configPath: string;
  relayUrl: string;
  gatewayUrl: string;
  relayReachable: boolean;
  gatewayHealthy: boolean;
  dispatchConfigured: boolean;
  tokenConfigured: boolean;
  tokenSource: 'env' | 'config' | 'none';
  primaryModel: string | null;
  modelAlias: string | null;
  configuredModels: string[];
  defaultModelConfigured: boolean;
  workspacePath: string | null;
  attachedTabs: number;
  tabs: OpenClawTabInfo[];
  profiles: OpenClawProfileInfo[];
  version: string | null;
}

// Request to dispatch a task to OpenClaw
export interface OpenClawDispatchRequest {
  agentId: string;
  taskId?: string;
  title?: string;
  task: string;
  preferredModel?: string;
  callbackUrl?: string;
  context?: Record<string, unknown>;
  correlationId?: string;
}

// Result of dispatching a task to OpenClaw
export interface OpenClawDispatchResult {
  accepted: boolean;
  runId: string | null;
  correlationId: string;
  status: string;
}
