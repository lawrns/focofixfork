// Tasks Feature Types

export interface Task {
  id: string;
  title: string;
  description?: string;
  project_id: string;
  milestone_id?: string;
  status: 'todo' | 'in_progress' | 'review' | 'done' | 'blocked';
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
  title: string;
  description?: string;
  project_id: string;
  milestone_id?: string;
  status?: Task['status'];
  priority?: Task['priority'];
  assignee_id?: string;
  estimated_hours?: number;
  actual_hours?: number;
  due_date?: string;
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
