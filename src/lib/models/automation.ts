export interface AutomationRule {
  id: string
  name: string
  description?: string
  project_id: string
  created_by: string
  is_active: boolean
  created_at: string
  updated_at: string
  
  // Rule configuration
  trigger: AutomationTrigger
  conditions: AutomationCondition[]
  actions: AutomationAction[]
  
  // Execution settings
  execution_count: number
  last_executed_at?: string
  next_execution_at?: string
  
  // Metadata
  tags?: string[]
  priority: 'low' | 'medium' | 'high'
}

export interface AutomationTrigger {
  type: 'task_created' | 'task_updated' | 'task_moved' | 'task_due_soon' | 'task_overdue' | 'milestone_reached' | 'project_updated' | 'schedule' | 'webhook'
  
  // Task-specific triggers
  task_status?: string[]
  task_priority?: string[]
  task_assignee?: string[]
  task_labels?: string[]
  
  // Time-based triggers
  schedule_type?: 'daily' | 'weekly' | 'monthly' | 'custom'
  schedule_config?: {
    time?: string // HH:MM format
    days?: number[] // 0-6 for weekly, 1-31 for monthly
    cron?: string // Custom cron expression
  }
  
  // Due date triggers
  due_date_offset?: number // Days before/after due date
  
  // Webhook triggers
  webhook_url?: string
  webhook_secret?: string
  
  // Project-specific triggers
  project_status?: string[]
  milestone_status?: string[]
}

export interface AutomationCondition {
  id: string
  type: 'field_equals' | 'field_contains' | 'field_greater_than' | 'field_less_than' | 'field_exists' | 'field_missing' | 'user_role' | 'time_range' | 'custom'
  
  // Field conditions
  field?: string
  value?: any
  operator?: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'exists' | 'missing'
  
  // User conditions
  user_field?: 'assignee' | 'reporter' | 'creator'
  user_role?: string[]
  
  // Time conditions
  time_field?: 'created_at' | 'updated_at' | 'due_date'
  time_range?: {
    start?: string
    end?: string
    unit?: 'minutes' | 'hours' | 'days' | 'weeks' | 'months'
  }
  
  // Custom conditions
  custom_expression?: string
  
  // Logical operators
  logical_operator?: 'AND' | 'OR'
}

export interface AutomationAction {
  id: string
  type: 'update_task' | 'create_task' | 'assign_user' | 'set_due_date' | 'add_label' | 'remove_label' | 'send_notification' | 'send_email' | 'move_to_column' | 'archive_task' | 'webhook_call' | 'custom'
  
  // Task actions
  task_updates?: {
    title?: string
    description?: string
    status?: string
    priority?: string
    assignee_id?: string
    due_date?: string
    estimated_hours?: number
    labels?: string[]
  }
  
  // User actions
  assignee_id?: string
  user_role?: string
  
  // Date actions
  due_date_offset?: number
  due_date_absolute?: string
  
  // Label actions
  label_name?: string
  label_color?: string
  
  // Notification actions
  notification_type?: 'mention' | 'assignment' | 'due_date' | 'status_change' | 'custom'
  notification_title?: string
  notification_message?: string
  notification_users?: string[]
  
  // Email actions
  email_template?: string
  email_subject?: string
  email_body?: string
  email_recipients?: string[]
  
  // Column/status actions
  target_column?: string
  target_status?: string
  
  // Webhook actions
  webhook_url?: string
  webhook_method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  webhook_headers?: Record<string, string>
  webhook_body?: string
  
  // Custom actions
  custom_script?: string
  
  // Execution settings
  delay_seconds?: number
  retry_count?: number
  retry_delay?: number
}

export interface AutomationExecution {
  id: string
  rule_id: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  started_at: string
  completed_at?: string
  
  // Execution context
  trigger_data: any
  affected_entities: {
    tasks?: string[]
    users?: string[]
    projects?: string[]
  }
  
  // Results
  actions_executed: number
  actions_succeeded: number
  actions_failed: number
  
  // Error handling
  error_message?: string
  error_details?: any
  
  // Metadata
  execution_time_ms: number
  memory_usage_mb?: number
}

export interface AutomationTemplate {
  id: string
  name: string
  description: string
  category: 'productivity' | 'workflow' | 'notifications' | 'time_management' | 'collaboration' | 'custom'
  
  // Template configuration
  trigger: AutomationTrigger
  conditions: AutomationCondition[]
  actions: AutomationAction[]
  
  // Template metadata
  tags: string[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  estimated_time: number // minutes
  
  // Usage statistics
  usage_count: number
  rating: number
  reviews: number
  
  // Template settings
  is_official: boolean
  is_featured: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export interface AutomationAnalytics {
  rule_id: string
  total_executions: number
  successful_executions: number
  failed_executions: number
  average_execution_time: number
  
  // Time-based analytics
  executions_by_day: Record<string, number>
  executions_by_hour: Record<string, number>
  
  // Action analytics
  most_used_actions: Array<{
    action_type: string
    count: number
  }>
  
  // Performance metrics
  success_rate: number
  average_response_time: number
  peak_execution_time: number
  
  // Error analytics
  common_errors: Array<{
    error_type: string
    count: number
    last_occurrence: string
  }>
}

// Predefined automation templates
export const AUTOMATION_TEMPLATES: AutomationTemplate[] = [
  {
    id: 'auto-assign-high-priority',
    name: 'Auto-assign High Priority Tasks',
    description: 'Automatically assign high priority tasks to available team members',
    category: 'productivity',
    trigger: {
      type: 'task_created',
      task_priority: ['high', 'urgent']
    },
    conditions: [
      {
        id: '1',
        type: 'field_equals',
        field: 'assignee_id',
        value: null,
        operator: 'missing'
      }
    ],
    actions: [
      {
        id: '1',
        type: 'assign_user',
        assignee_id: 'auto-assign'
      }
    ],
    tags: ['assignment', 'priority', 'automation'],
    difficulty: 'beginner',
    estimated_time: 5,
    usage_count: 0,
    rating: 0,
    reviews: 0,
    is_official: true,
    is_featured: true,
    created_by: 'system',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'due-date-reminder',
    name: 'Due Date Reminder',
    description: 'Send notifications when tasks are due soon',
    category: 'notifications',
    trigger: {
      type: 'task_due_soon',
      due_date_offset: 1
    },
    conditions: [
      {
        id: '1',
        type: 'field_equals',
        field: 'status',
        value: 'done',
        operator: 'not_equals'
      }
    ],
    actions: [
      {
        id: '1',
        type: 'send_notification',
        notification_type: 'due_date',
        notification_title: 'Task Due Soon',
        notification_message: 'Task "{task.title}" is due tomorrow'
      }
    ],
    tags: ['reminder', 'due-date', 'notification'],
    difficulty: 'beginner',
    estimated_time: 3,
    usage_count: 0,
    rating: 0,
    reviews: 0,
    is_official: true,
    is_featured: true,
    created_by: 'system',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'auto-move-completed',
    name: 'Auto-move Completed Tasks',
    description: 'Automatically move completed tasks to done column',
    category: 'workflow',
    trigger: {
      type: 'task_updated'
    },
    conditions: [
      {
        id: '1',
        type: 'field_equals',
        field: 'status',
        value: 'done',
        operator: 'equals'
      }
    ],
    actions: [
      {
        id: '1',
        type: 'move_to_column',
        target_column: 'done'
      },
      {
        id: '2',
        type: 'update_task',
        task_updates: {
          due_date: new Date().toISOString().split('T')[0]
        }
      }
    ],
    tags: ['workflow', 'status', 'automation'],
    difficulty: 'beginner',
    estimated_time: 2,
    usage_count: 0,
    rating: 0,
    reviews: 0,
    is_official: true,
    is_featured: true,
    created_by: 'system',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
]

