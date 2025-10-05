// Tasks Feature Types

export interface Task {
  id: string;
  title: string;
  description?: string;
  project_id: string;
  milestone_id?: string;
  status: 'todo' | 'in_progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee_id?: string;
  estimated_hours?: number;
  actual_hours?: number;
  due_date?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
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
  created_by: string;
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
