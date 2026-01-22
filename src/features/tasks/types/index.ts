// Tasks Feature Types

export interface Task {
  id: string;
  title: string;
  description?: string;
  workspace_id?: string;
  project_id: string;
  milestone_id?: string;
  status: 'backlog' | 'next' | 'in_progress' | 'review' | 'blocked' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee_id?: string;
  estimated_hours?: number;
  actual_hours?: number;
  due_date?: string;
  position?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_recurring?: boolean;
  recurrence_pattern?: any;
  parent_recurring_task_id?: string;
  occurrence_number?: number;
  next_occurrence_date?: string;
}

export interface CreateTaskData {
  workspace_id: string;
  project_id: string;
  title: string;
  description?: string;
  parent_id?: string;
  status?: Task['status'];
  priority?: Task['priority'];
  assignee_id?: string;
  reporter_id?: string;
  due_date?: string;
  start_date?: string;
  estimate_hours?: number;
  actual_hours?: number;
  position?: string;
  type?: 'task' | 'bug' | 'feature' | 'milestone';
}

export interface UpdateTaskData {
  title?: string;
  description?: string;
  status?: Task['status'];
  priority?: Task['priority'];
  assignee_id?: string;
  estimated_hours?: number;
  actual_hours?: number;
  due_date?: string;
}

export interface TaskFilters {
  project_id?: string;
  milestone_id?: string;
  status?: Task['status'];
  priority?: Task['priority'];
  assignee_id?: string;
  limit?: number;
  offset?: number;
}

export interface TasksListResponse {
  success: boolean;
  data?: Task[];
  pagination?: {
    total: number;
    limit: number;
    offset: number;
  };
  error?: string;
}

export interface TasksResponse<T = Task> {
  success: boolean;
  data?: T;
  error?: string;
}
