import { UpdateProject } from '@/lib/validation/schemas/project.schema'

export interface Project {
  id: string
  name: string
  slug: string
  description?: string | null
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled'
  due_date?: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  progress_percentage?: number
  created_at: string
  workspace_id?: string
  archived_at?: string | null
}

export interface ProjectWithOrg extends Project {
  organizations?: {
    name: string
  }
}

export interface ProjectTableProps {
  searchTerm?: string
  onCreateProject?: () => void
  onTakeTour?: () => void
  onImportProjects?: () => void
}

export type { UpdateProject }
