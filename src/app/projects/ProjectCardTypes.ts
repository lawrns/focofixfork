export interface ProjectData {
  id: string;
  workspaceId?: string | null;
  name: string;
  slug: string;
  description?: string;
  color: string;
  icon: string;
  status: 'active' | 'on_hold' | 'completed' | 'archived';
  isPinned: boolean;
  progress: number;
  tasksCompleted: number;
  totalTasks: number;
  risk: 'none' | 'low' | 'medium' | 'high';
  nextMilestone?: { name: string; dueDate: string };
  owner: { name: string; avatar?: string };
  teamSize?: number;
  updatedAt: string;
  agentPool: string[];
  delegationCounts: { pending: number; delegated: number; running: number; completed: number; failed: number };
  activeRuns: number;
  delegationEnabled: boolean;
  localPath?: string | null;
}

interface ApiProjectRow {
  id: string
  workspace_id?: string | null
  name: string
  slug: string
  description?: string | null
  color?: string | null
  icon?: string | null
  status?: 'active' | 'on_hold' | 'completed' | 'archived' | null
  is_pinned?: boolean | null
  tasks_completed?: number | null
  total_tasks?: number | null
  risk?: 'none' | 'low' | 'medium' | 'high' | null
  next_milestone?: { name: string; dueDate: string } | null
  owner_name?: string | null
  owner_avatar?: string | null
  updated_at?: string | null
  assigned_agent_pool?: string[] | null
  delegation_counts?: { pending?: number; delegated?: number; running?: number; completed?: number; failed?: number } | null
  active_run_count?: number | null
  delegation_settings?: { enabled?: boolean } | null
  local_path?: string | null
}

export function mapApiProjectRow(
  project: ApiProjectRow,
  fallbackOwnerName: string
): ProjectData {
  return {
    id: project.id,
    workspaceId: project.workspace_id ?? null,
    name: project.name,
    slug: project.slug,
    description: project.description ?? undefined,
    color: project.color || '#6366F1',
    icon: project.icon || 'folder',
    status: project.status || 'active',
    isPinned: project.is_pinned || false,
    progress: (project.total_tasks ?? 0) > 0
      ? Math.round(((project.tasks_completed ?? 0) / (project.total_tasks ?? 1)) * 100)
      : 0,
    tasksCompleted: project.tasks_completed ?? 0,
    totalTasks: project.total_tasks ?? 0,
    risk: project.risk || deriveProjectRisk(project.total_tasks, project.tasks_completed, project.status),
    nextMilestone: project.next_milestone ?? undefined,
    owner: {
      name: project.owner_name || fallbackOwnerName || 'Unknown',
      avatar: project.owner_avatar || undefined,
    },
    updatedAt: project.updated_at || new Date().toISOString(),
    agentPool: project.assigned_agent_pool ?? [],
    delegationCounts: {
      pending: project.delegation_counts?.pending ?? 0,
      delegated: project.delegation_counts?.delegated ?? 0,
      running: project.delegation_counts?.running ?? 0,
      completed: project.delegation_counts?.completed ?? 0,
      failed: project.delegation_counts?.failed ?? 0,
    },
    activeRuns: project.active_run_count ?? 0,
    delegationEnabled: project.delegation_settings?.enabled ?? false,
    localPath: project.local_path ?? null,
  }
}

export type FetchFailureReason =
  | 'none'
  | 'unauthenticated'
  | 'workspace-missing'
  | 'forbidden'
  | 'server'
  | 'network';

export function deriveProjectRisk(
  totalTasks: number | null | undefined,
  tasksDone: number | null | undefined,
  status: string | null | undefined
): 'none' | 'medium' | 'high' {
  if (status === 'on_hold') return 'high'
  const total = totalTasks ?? 0
  const done = tasksDone ?? 0
  if (total > 5 && done === 0) return 'medium'
  return 'none'
}

export const riskColors = {
  none: '',
  low: 'text-[color:var(--foco-teal)] bg-secondary border-secondary',
  medium: 'text-amber-600 bg-amber-50 border-amber-200',
  high: 'text-red-600 bg-red-50 border-red-200',
};

export function formatRelativeDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
  } catch {
    return 'recently';
  }
}
