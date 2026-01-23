// Projects Feature Types

export interface Project {
  id: string;
  name: string;
  slug: string;
  description?: string;
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  start_date?: string;
  due_date?: string;
  progress_percentage: number;
  owner_id: string;
  workspace_id: string | null;
  created_at: string;
  updated_at: string;
  archived_at?: string | null;
}

export interface CreateProjectData {
  name: string;
  description?: string;
  status: Project['status'];
  priority: Project['priority'];
  start_date?: string;
  due_date?: string;
  workspace_id?: string;
  owner_id: string;
  progress_percentage: number;
}

export interface UpdateProjectData {
  name?: string;
  description?: string;
  status?: Project['status'];
  priority?: Project['priority'];
  start_date?: string;
  due_date?: string;
  progress_percentage?: number;
}

export interface ProjectFilters {
  workspace_id?: string;
  status?: Project['status'];
  priority?: Project['priority'];
  limit?: number;
  offset?: number;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  joined_at: string;
}

export interface AddProjectMemberData {
  user_id: string;
  role?: ProjectMember['role'];
}



