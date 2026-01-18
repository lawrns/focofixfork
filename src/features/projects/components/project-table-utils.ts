// Project Table Utility Functions and Types
import { SortCondition } from '@/lib/services/filtering'

// Types and Interfaces
export interface Project {
  id: string
  name: string
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
  workspaces?: {
    name: string
  }
}

export interface ProjectTableProps {
  searchTerm?: string
  onCreateProject?: () => void
  onTakeTour?: () => void
  onImportProjects?: () => void
}

// Status badge configuration
const STATUS_BACKGROUND_COLORS: Record<Project['status'], string> = {
  'planning': '#f1f5f9',
  'active': '#dbeafe',
  'on_hold': '#fed7aa',
  'completed': '#bbf7d0',
  'cancelled': '#fecaca'
}

const STATUS_TEXT_COLORS: Record<Project['status'], string> = {
  'planning': '#475569',
  'active': '#1e40af',
  'on_hold': '#c2410c',
  'completed': '#14532d',
  'cancelled': '#991b1b'
}

const STATUS_BORDER_COLORS: Record<Project['status'], string> = {
  'planning': '#cbd5e1',
  'active': '#93c5fd',
  'on_hold': '#fb923c',
  'completed': '#86efac',
  'cancelled': '#fca5a5'
}

const STATUS_LABELS: Record<Project['status'], string> = {
  'planning': 'Planning',
  'active': 'Active',
  'on_hold': 'On Hold',
  'completed': 'Completed',
  'cancelled': 'Cancelled'
}

// Priority badge configuration
const PRIORITY_BACKGROUND_COLORS: Record<Project['priority'], string> = {
  'low': '#e2e8f0',
  'medium': '#3b82f6',
  'high': '#f97316',
  'urgent': '#dc2626'
}

const PRIORITY_TEXT_COLORS: Record<Project['priority'], string> = {
  'low': '#475569',
  'medium': '#ffffff',
  'high': '#ffffff',
  'urgent': '#ffffff'
}

const PRIORITY_LABELS: Record<Project['priority'], string> = {
  'low': 'Low',
  'medium': 'Medium',
  'high': 'High',
  'urgent': 'Urgent'
}

// Badge style generators
export function getStatusBadgeStyles(status: Project['status']): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4px 12px',
    minWidth: '85px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '600',
    letterSpacing: '0.025em',
    textTransform: 'uppercase',
    backgroundColor: STATUS_BACKGROUND_COLORS[status] || STATUS_BACKGROUND_COLORS.planning,
    color: STATUS_TEXT_COLORS[status] || STATUS_TEXT_COLORS.planning,
    border: `1px solid ${STATUS_BORDER_COLORS[status] || STATUS_BORDER_COLORS.planning}`
  }
}

export function getStatusLabel(status: Project['status']): string {
  return STATUS_LABELS[status] || status
}

export function getPriorityBadgeStyles(priority: Project['priority']): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4px 12px',
    minWidth: '70px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '600',
    letterSpacing: '0.025em',
    textTransform: 'uppercase',
    backgroundColor: PRIORITY_BACKGROUND_COLORS[priority] || PRIORITY_BACKGROUND_COLORS.medium,
    color: PRIORITY_TEXT_COLORS[priority] || PRIORITY_TEXT_COLORS.medium,
    border: priority === 'low' ? '1px solid #cbd5e1' : 'none'
  }
}

export function getPriorityLabel(priority: Project['priority']): string {
  return PRIORITY_LABELS[priority] || priority
}

// Filter field configuration for advanced filter builder
export const PROJECT_FILTER_FIELDS = [
  { key: 'name', label: 'Name', type: 'string' as const },
  { key: 'status', label: 'Status', type: 'string' as const, options: ['planning', 'active', 'on_hold', 'completed', 'cancelled'] },
  { key: 'priority', label: 'Priority', type: 'string' as const, options: ['low', 'medium', 'high', 'urgent'] },
  { key: 'progress_percentage', label: 'Progress', type: 'number' as const },
  { key: 'due_date', label: 'Due Date', type: 'date' as const },
  { key: 'created_at', label: 'Created', type: 'date' as const },
  { key: 'workspaces.name', label: 'Workspace', type: 'string' as const }
]

// Sort utilities
export function toggleSortCondition(
  currentConditions: SortCondition[],
  field: string
): SortCondition[] {
  const existing = currentConditions.find((s) => s.field === field)
  if (!existing) {
    return [{ field, direction: 'asc' }]
  } else if (existing.direction === 'asc') {
    return [{ field, direction: 'desc' }]
  } else {
    return []
  }
}

export function getSortDirection(
  conditions: SortCondition[],
  field: string
): 'asc' | 'desc' | null {
  const existing = conditions.find((s) => s.field === field)
  return existing ? existing.direction : null
}

// Parse API response for projects
export function parseProjectsResponse(data: unknown): ProjectWithOrg[] {
  if (typeof data !== 'object' || data === null) {
    return []
  }

  const responseData = data as Record<string, unknown>

  if (responseData.success && responseData.data) {
    const innerData = responseData.data as Record<string, unknown>
    if (Array.isArray(innerData.data)) {
      return innerData.data as ProjectWithOrg[]
    } else if (Array.isArray(innerData)) {
      return innerData as unknown as ProjectWithOrg[]
    }
  } else if (Array.isArray(responseData.data)) {
    return responseData.data as ProjectWithOrg[]
  } else if (Array.isArray(data)) {
    return data as ProjectWithOrg[]
  }

  return []
}
