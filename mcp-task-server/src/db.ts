import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CONFIG } from './config.js';

export const supabase: SupabaseClient = createClient(
  CONFIG.SUPABASE_URL,
  CONFIG.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export type MemberRole = 'owner' | 'admin' | 'member' | 'guest';
export type WorkItemStatus = 'backlog' | 'next' | 'in_progress' | 'review' | 'blocked' | 'done';
export type PriorityLevel = 'urgent' | 'high' | 'medium' | 'low' | 'none';
export type WorkItemType = 'task' | 'bug' | 'feature' | 'milestone';

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: MemberRole;
  email?: string;
  full_name?: string;
}

export interface Project {
  id: string;
  workspace_id: string;
  name: string;
  slug: string;
  description: string | null;
  status: string;
}

export interface WorkItem {
  id: string;
  workspace_id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: WorkItemStatus;
  priority: PriorityLevel;
  type: WorkItemType;
  assignee_id: string | null;
  reporter_id: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
}
