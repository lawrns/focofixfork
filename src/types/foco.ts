// ============================================================================
// FOCO 2.0 TYPE DEFINITIONS
// ============================================================================

// Enums matching database schema
export type WorkItemType = 'task' | 'bug' | 'feature' | 'milestone';
export type WorkItemStatus = 'backlog' | 'next' | 'in_progress' | 'review' | 'blocked' | 'done';
export type PriorityLevel = 'urgent' | 'high' | 'medium' | 'low' | 'none';
export type MemberRole = 'owner' | 'admin' | 'member' | 'guest';
export type NotificationType = 'mention' | 'assigned' | 'status_change' | 'comment' | 'approval' | 'ai_flag' | 'due_soon' | 'blocked';
export type AutomationTrigger = 'work_item_created' | 'status_changed' | 'due_date_approaching' | 'blocked' | 'comment_contains' | 'schedule' | 'assigned' | 'priority_changed';
export type AutomationAction = 'assign' | 'set_priority' | 'set_due_date' | 'create_follow_up' | 'notify' | 'move_status' | 'request_approval' | 'generate_report' | 'add_label';

// Density settings
export type DensitySetting = 'compact' | 'comfortable' | 'spacious';

// View types
export type ViewType = 'list' | 'board' | 'timeline' | 'calendar';

// ============================================================================
// WORKSPACE
// ============================================================================
export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo_url?: string;
  settings: WorkspaceSettings;
  ai_policy: AIPolicy;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceSettings {
  density: DensitySetting;
  theme: 'light' | 'dark' | 'system';
  locale: string;
}

export interface AIPolicy {
  allowed_actions: string[];
  auto_apply: boolean;
  confidence_threshold: number;
  data_sources: string[];
  audit_visible: boolean;
}

// ============================================================================
// WORKSPACE MEMBER
// ============================================================================
export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: MemberRole;
  capacity_hours_per_week: number;
  focus_hours_per_day: number;
  timezone: string;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  user?: User;
}

// ============================================================================
// USER
// ============================================================================
export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
}

// ============================================================================
// PROJECT
// ============================================================================
export interface Project {
  id: string;
  workspace_id: string;
  name: string;
  slug: string;
  description?: string;
  brief?: string;
  color: string;
  icon: string;
  status: string;
  owner_id?: string;
  default_status: WorkItemStatus;
  settings: ProjectSettings;
  is_pinned: boolean;
  archived_at?: string;
  created_at: string;
  updated_at: string;
  owner?: User;
  work_items_count?: number;
  completed_count?: number;
}

export interface ProjectSettings {
  statuses: WorkItemStatus[];
  labels: string[];
  wip_limits: Record<string, number>;
  require_closure_note: boolean;
}

// ============================================================================
// LABEL
// ============================================================================
export interface Label {
  id: string;
  workspace_id: string;
  project_id?: string;
  name: string;
  color: string;
  description?: string;
  created_at: string;
}

// ============================================================================
// WORK ITEM
// ============================================================================
export interface WorkItem {
  id: string;
  workspace_id: string;
  project_id: string;
  parent_id?: string;
  type: WorkItemType;
  title: string;
  description?: string;
  status: WorkItemStatus;
  priority: PriorityLevel;
  assignee_id?: string;
  reporter_id?: string;
  due_date?: string;
  start_date?: string;
  completed_at?: string;
  estimate_hours?: number;
  actual_hours?: number;
  position: number;
  section?: string;
  blocked_reason?: string;
  blocked_by_id?: string;
  closure_note?: string;
  ai_context_sources: unknown[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  // Relations
  assignee?: User;
  reporter?: User;
  project?: Project;
  labels?: Label[];
  children?: WorkItem[];
  dependencies?: WorkItemDependency[];
  comments_count?: number;
}

export interface WorkItemDependency {
  id: string;
  work_item_id: string;
  depends_on_id: string;
  dependency_type: string;
  created_at: string;
  depends_on?: WorkItem;
}

// ============================================================================
// COMMENT
// ============================================================================
export interface Comment {
  id: string;
  work_item_id: string;
  user_id: string;
  content: string;
  mentions: string[];
  attachments: Attachment[];
  is_ai_generated: boolean;
  ai_sources?: unknown;
  created_at: string;
  updated_at: string;
  user?: User;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
}

// ============================================================================
// DOC
// ============================================================================
export interface Doc {
  id: string;
  workspace_id: string;
  project_id?: string;
  parent_id?: string;
  title: string;
  content?: string;
  content_type: string;
  template?: string;
  created_by?: string;
  last_edited_by?: string;
  is_locked: boolean;
  locked_by?: string;
  locked_at?: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  creator?: User;
  editor?: User;
}

// ============================================================================
// SAVED VIEW
// ============================================================================
export interface SavedView {
  id: string;
  workspace_id: string;
  project_id?: string;
  user_id?: string;
  name: string;
  view_type: ViewType;
  filters: ViewFilters;
  sort_by: string;
  sort_order: 'asc' | 'desc';
  columns: string[];
  group_by?: string;
  is_default: boolean;
  is_shared: boolean;
  created_at: string;
  updated_at: string;
}

export interface ViewFilters {
  status?: WorkItemStatus[];
  priority?: PriorityLevel[];
  assignee?: string | 'me' | 'unassigned';
  type?: WorkItemType[];
  labels?: string[];
  due_date?: 'overdue' | 'today' | 'this_week' | 'this_month' | string;
  search?: string;
}

// ============================================================================
// AUTOMATION
// ============================================================================
export interface Automation {
  id: string;
  workspace_id: string;
  project_id?: string;
  name: string;
  description?: string;
  is_active: boolean;
  trigger_type: AutomationTrigger;
  trigger_config: Record<string, unknown>;
  conditions: AutomationCondition[];
  action_type: AutomationAction;
  action_config: Record<string, unknown>;
  run_count: number;
  last_run_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface AutomationCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'in' | 'not_in' | 'contains' | 'gt' | 'lt';
  value: unknown;
}

// ============================================================================
// INBOX ITEM
// ============================================================================
export interface InboxItem {
  id: string;
  workspace_id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body?: string;
  work_item_id?: string;
  project_id?: string;
  doc_id?: string;
  comment_id?: string;
  actor_id?: string;
  is_read: boolean;
  is_resolved: boolean;
  snoozed_until?: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  actor?: User;
  work_item?: WorkItem;
  project?: Project;
}

// ============================================================================
// ACTIVITY LOG
// ============================================================================
export interface ActivityLogEntry {
  id: string;
  workspace_id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  changes?: Record<string, { old: unknown; new: unknown }>;
  user_id?: string;
  is_ai_action: boolean;
  ai_confidence?: number;
  ai_sources?: unknown;
  can_undo: boolean;
  undo_data?: unknown;
  undone_at?: string;
  undone_by?: string;
  created_at: string;
  user?: User;
}

// ============================================================================
// AI SUGGESTION
// ============================================================================
export interface AISuggestion {
  id: string;
  workspace_id: string;
  user_id?: string;
  suggestion_type: string;
  title: string;
  description?: string;
  entity_type?: string;
  entity_id?: string;
  proposed_changes: Record<string, unknown>;
  confidence: number;
  sources: AISuggestionSource[];
  reasoning?: string;
  status: 'pending' | 'applied' | 'dismissed';
  applied_at?: string;
  dismissed_at?: string;
  feedback?: string;
  expires_at?: string;
  created_at: string;
}

export interface AISuggestionSource {
  type: 'task' | 'comment' | 'doc' | 'history';
  id: string;
  title: string;
  excerpt?: string;
}

// ============================================================================
// TIME ENTRY
// ============================================================================
export interface TimeEntry {
  id: string;
  work_item_id: string;
  user_id: string;
  started_at: string;
  ended_at?: string;
  duration_minutes?: number;
  description?: string;
  is_billable: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// USER PRESENCE
// ============================================================================
export interface UserPresence {
  id: string;
  workspace_id: string;
  user_id: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  current_page?: string;
  current_entity_type?: string;
  current_entity_id?: string;
  last_seen_at: string;
  user?: User;
}

// ============================================================================
// REPORT
// ============================================================================
export interface Report {
  id: string;
  workspace_id: string;
  project_id?: string;
  report_type: string;
  title: string;
  config: Record<string, unknown>;
  data?: unknown;
  generated_by?: string;
  is_ai_generated: boolean;
  period_start?: string;
  period_end?: string;
  created_at: string;
}

// ============================================================================
// UI STATE TYPES
// ============================================================================
export interface CommandPaletteAction {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  shortcut?: string;
  action: () => void | Promise<void>;
  group?: string;
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  duration?: number;
}

export interface DailyBrief {
  date: string;
  summary: string;
  priorities: WorkItem[];
  risks: {
    title: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
    work_item?: WorkItem;
  }[];
  suggestions: AISuggestion[];
  metrics: {
    completed_yesterday: number;
    due_today: number;
    in_progress: number;
    blocked: number;
  };
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}
