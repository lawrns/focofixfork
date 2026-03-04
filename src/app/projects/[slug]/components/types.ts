export interface Project {
  id: string;
  name: string;
  slug: string;
  description?: string;
  brief?: string;
  color?: string;
  workspace_id: string;
}

export interface TeamMember {
  id: string;
  user_id: string;
  role: string;
  user_profiles?: {
    full_name?: string;
    email: string;
  };
}
