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
  created_by: string;
  organization_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateProjectData {
  name: string;
  description: string | null;
  status: Project['status'];
  priority: Project['priority'];
  start_date: string | null;
  due_date: string | null;
  organization_id: string | null;
  created_by: string;
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
  organization_id?: string | null;
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



