// Goals Feature Types

export interface Goal {
  id: string;
  title: string;
  description?: string;
  type: 'project' | 'milestone' | 'task' | 'organization' | 'personal';
  status: 'draft' | 'active' | 'completed' | 'cancelled' | 'on_hold';
  priority: 'low' | 'medium' | 'high' | 'critical';
  target_value?: number;
  current_value?: number;
  unit?: string;
  start_date?: string;
  end_date?: string;
  progress_percentage: number;
  owner_id: string;
  organization_id?: string;
  project_id?: string;
  milestone_id?: string;
  task_id?: string;
  parent_goal_id?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export interface GoalProgress {
  id: string;
  goal_id: string;
  user_id: string;
  value: number;
  note?: string;
  created_at: string;
}

export interface GoalComment {
  id: string;
  goal_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export interface CreateGoalData {
  title: string;
  description?: string;
  type: Goal['type'];
  priority: Goal['priority'];
  target_value?: number;
  unit?: string;
  start_date?: string;
  end_date?: string;
  owner_id: string;
  organization_id?: string;
  project_id?: string;
  tags?: string[];
}

export interface UpdateGoalData {
  title?: string;
  description?: string;
  status?: Goal['status'];
  priority?: Goal['priority'];
  target_value?: number;
  current_value?: number;
  unit?: string;
  start_date?: string;
  end_date?: string;
  tags?: string[];
}

export interface GoalFilters {
  organizationId?: string;
  projectId?: string;
  userId?: string;
  status?: Goal['status'];
  type?: Goal['type'];
  priority?: Goal['priority'];
}

// Export type aliases for convenience
export type GoalStatus = Goal['status'];
export type GoalType = Goal['type'];
export type GoalPriority = Goal['priority'];
