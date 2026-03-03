/**
 * Agent Multi-Surface Types
 * Module 8: Agent Multi-Surface Execution
 */

export type SurfaceType = 'browser' | 'file_system' | 'api' | 'communication' | 'calendar';

export type SurfaceStatus = 'available' | 'busy' | 'disabled';

export type ExecutionStatus = 'pending' | 'running' | 'complete' | 'failed' | 'cancelled';

export interface AgentSurface {
  id: string;
  agent_id: string;
  agent_backend: 'crico' | 'clawdbot' | 'bosun' | 'openclaw';
  surface_type: SurfaceType;
  capabilities: string[];
  status: SurfaceStatus;
  config: Record<string, unknown>;
  last_used_at?: string;
  created_at: string;
  updated_at: string;
}

export interface SurfaceExecution {
  id: string;
  surface_id: string;
  agent_id: string;
  task_id?: string;
  action: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  status: ExecutionStatus;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

export interface BrowserAction {
  type: 'navigate' | 'click' | 'fill' | 'screenshot' | 'scrape' | 'scroll' | 'wait';
  selector?: string;
  url?: string;
  value?: string;
  options?: Record<string, unknown>;
}

export interface ApiAction {
  type: 'http' | 'webhook' | 'graphql';
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
}

export interface FileSystemAction {
  type: 'read' | 'write' | 'delete' | 'list' | 'mkdir';
  path: string;
  content?: string;
  encoding?: string;
}

export interface CommunicationAction {
  type: 'email' | 'slack' | 'discord' | 'telegram';
  to: string | string[];
  subject?: string;
  message: string;
  attachments?: string[];
}

export interface CalendarAction {
  type: 'create_event' | 'update_event' | 'delete_event' | 'list_events';
  calendar_id?: string;
  event_id?: string;
  title?: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  attendees?: string[];
}

export type SurfaceAction = BrowserAction | ApiAction | FileSystemAction | CommunicationAction | CalendarAction;

export interface SurfaceMatch {
  surface: AgentSurface;
  score: number;
  reason: string;
}

export const SURFACE_TYPE_LABELS: Record<SurfaceType, string> = {
  browser: 'Browser Automation',
  file_system: 'File System',
  api: 'API & Webhooks',
  communication: 'Communication',
  calendar: 'Calendar',
};

export const SURFACE_TYPE_ICONS: Record<SurfaceType, string> = {
  browser: '🌐',
  file_system: '📁',
  api: '🔌',
  communication: '💬',
  calendar: '📅',
};
