import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Normalize project data to ensure consistent structure across components
export function normalizeProjectData(project: any) {
  return {
    id: project.id,
    name: project.name || '',
    description: project.description || null,
    status: project.status || 'planning',
    priority: project.priority || 'medium',
    organization_id: project.organization_id || null,
    created_by: project.created_by || '',
    created_at: project.created_at || new Date().toISOString(),
    updated_at: project.updated_at || new Date().toISOString(),
    color: project.color || '#3B82F6',
    is_active: project.is_active !== undefined ? project.is_active : true,
    start_date: project.start_date || null,
    due_date: project.due_date || null,
    progress_percentage: project.progress_percentage || 0,
    organizations: project.organizations ? {
      name: project.organizations.name || ''
    } : undefined,
  }
}

// Normalize array of projects
export function normalizeProjectsData(projects: any[]): any[] {
  if (!Array.isArray(projects)) return []
  return projects.map(normalizeProjectData).filter(Boolean)
}


