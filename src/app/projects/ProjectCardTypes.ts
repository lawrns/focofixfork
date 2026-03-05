export interface ProjectData {
  id: string;
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
