'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Plus,
  Search,
  Filter,
  Grid3X3,
  List,
  MoreHorizontal,
  Star,
  StarOff,
  Users,
  Calendar,
  AlertTriangle,
  FolderKanban,
  ArrowUpDown,
  CheckSquare,
  Bot,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { PageShell } from '@/components/layout/page-shell';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/ui/empty-state-standard';
import { ProjectEmptyState } from '@/features/delegation/components/ProjectEmptyState';
import { emptyStates, buttons } from '@/lib/copy';
import { useAuth } from '@/lib/hooks/use-auth';
import { useMobile } from '@/lib/hooks/use-mobile';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

interface ProjectData {
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
}


function deriveProjectRisk(
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

const riskColors = {
  none: '',
  low: 'text-blue-600 bg-blue-50 border-blue-200',
  medium: 'text-amber-600 bg-amber-50 border-amber-200',
  high: 'text-red-600 bg-red-50 border-red-200',
};

interface ProjectCardProps {
  project: ProjectData;
  onEdit: (project: ProjectData) => void;
  onDuplicate: (project: ProjectData) => void;
  onGenerateStatus: (project: ProjectData) => void;
  onArchive: (project: ProjectData) => void;
  onToggleDelegation: (project: ProjectData) => void;
}

function formatRelativeDate(dateString: string): string {
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

function ProjectCard({ project, onEdit, onDuplicate, onGenerateStatus, onArchive, onToggleDelegation }: ProjectCardProps) {
  const [isPinned, setIsPinned] = useState(project.isPinned);

  return (
    <Link
      href={`/projects/${project.slug}`}
      className={cn(
        'block p-4 sm:p-5 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800',
        'hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-md transition-all',
        'group overflow-hidden'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="h-10 w-10 rounded-lg flex items-center justify-center text-white"
            style={{ backgroundColor: project.color }}
          >
            <FolderKanban className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              {project.name}
            </h3>
            <p className="text-xs text-zinc-500">
              Updated {formatRelativeDate(project.updatedAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.preventDefault();
              setIsPinned(!isPinned);
            }}
          >
            {isPinned ? (
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            ) : (
              <StarOff className="h-4 w-4" />
            )}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.preventDefault()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault();
                  onEdit(project);
                }}
              >
                Edit project
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault();
                  onDuplicate(project);
                }}
              >
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault();
                  onGenerateStatus(project);
                }}
              >
                Generate status update
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault();
                  onToggleDelegation(project);
                }}
              >
                {project.delegationEnabled ? 'Disable' : 'Enable'} delegation
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600"
                onClick={(e) => {
                  e.preventDefault();
                  onArchive(project);
                }}
              >
                Archive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Description */}
      {project.description && (
        <p className="text-sm text-zinc-500 mb-4 line-clamp-2">
          {project.description}
        </p>
      )}

      {/* Progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-zinc-500">Progress</span>
          <span className="text-xs font-medium">
            {project.tasksCompleted}/{project.totalTasks} tasks
          </span>
        </div>
        <div className="overflow-hidden rounded-full">
          <Progress value={project.progress} className="h-1.5" />
        </div>
      </div>

      {/* Risk & Milestone */}
      <div className="flex items-center justify-between mb-4">
        {project.risk !== 'none' && (
          <Badge variant="outline" className={cn('text-xs', riskColors[project.risk])}>
            <AlertTriangle className="h-3 w-3" />
            {project.risk} risk
          </Badge>
        )}
        {project.nextMilestone && (
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <Calendar className="h-3 w-3" />
            <span>{project.nextMilestone.name}</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
        {/* Row 1: Owner + task count */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-[10px]">
                {project.owner.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-zinc-500">{project.owner.name}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-zinc-500">
            <CheckSquare className="h-3 w-3" />
            <span>{project.tasksCompleted}/{project.totalTasks}</span>
          </div>
        </div>

        {/* Row 2: Fleet status */}
        <div className="flex items-center gap-1.5 pt-1 border-t border-border/40">
          {project.activeRuns > 0 && (
            <Link
              href="/empire/command"
              onClick={e => e.stopPropagation()}
              className="flex items-center gap-1 text-[10px] font-mono text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
              </span>
              {project.activeRuns} running
            </Link>
          )}
          {project.delegationCounts.pending > 0 && (
            <span className="text-[10px] font-mono text-amber-500">
              {project.delegationCounts.pending} pending
            </span>
          )}
          {project.delegationCounts.failed > 0 && (
            <span className="text-[10px] font-mono text-red-500">
              {project.delegationCounts.failed} failed
            </span>
          )}
          {project.agentPool.length > 0 ? (
            <span className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground">
              <Bot className="h-3 w-3" />{project.agentPool.length}
            </span>
          ) : (
            <span className="ml-auto text-[10px] text-muted-foreground/50">No agents</span>
          )}
        </div>
      </div>
    </Link>
  );
}

interface ProjectRowProps {
  project: ProjectData;
  onEdit: (project: ProjectData) => void;
  onDuplicate: (project: ProjectData) => void;
  onGenerateStatus: (project: ProjectData) => void;
  onArchive: (project: ProjectData) => void;
  onToggleDelegation: (project: ProjectData) => void;
  isMobile?: boolean;
}

function ProjectRow({ project, onEdit, onDuplicate, onGenerateStatus, onArchive, onToggleDelegation, isMobile }: ProjectRowProps) {
  const [isPinned, setIsPinned] = useState(project.isPinned);

  // Mobile card layout
  if (isMobile) {
    return (
      <Link
        href={`/projects/${project.slug}`}
        className={cn(
          'block p-4 border-b border-zinc-100 dark:border-zinc-800',
          'hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors',
          'group'
        )}
      >
        {/* Header row: Icon + Name + Actions */}
        <div className="flex items-center gap-3 mb-3">
          <div
            className="h-9 w-9 rounded-lg flex items-center justify-center text-white shrink-0"
            style={{ backgroundColor: project.color }}
          >
            <FolderKanban className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-zinc-900 dark:text-zinc-50 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                {project.name}
              </h3>
              {isPinned && <Star className="h-3 w-3 fill-amber-400 text-amber-400 shrink-0" />}
            </div>
            {project.risk !== 'none' && (
              <Badge variant="outline" className={cn('text-[10px] h-5 mt-1', riskColors[project.risk])}>
                {project.risk} risk
              </Badge>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={(e) => e.preventDefault()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault();
                  setIsPinned(!isPinned);
                }}
              >
                {isPinned ? 'Unpin' : 'Pin'} project
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault();
                  onEdit(project);
                }}
              >
                Edit project
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault();
                  onDuplicate(project);
                }}
              >
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault();
                  onGenerateStatus(project);
                }}
              >
                Generate status update
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600"
                onClick={(e) => {
                  e.preventDefault();
                  onArchive(project);
                }}
              >
                Archive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Progress bar */}
        <div className="mb-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0 overflow-hidden rounded-full">
              <Progress value={project.progress} className="h-1.5" />
            </div>
            <span className="text-xs text-zinc-500 w-8 shrink-0">{project.progress}%</span>
          </div>
        </div>

        {/* Footer: Owner + Updated date */}
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <Avatar className="h-5 w-5">
            <AvatarFallback className="text-[9px]">
              {project.owner.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <span className="truncate">{project.owner.name}</span>
          <span className="text-zinc-300 dark:text-zinc-600">•</span>
          <span>{formatRelativeDate(project.updatedAt)}</span>
        </div>
      </Link>
    );
  }

  // Desktop row layout
  return (
    <Link
      href={`/projects/${project.slug}`}
      className={cn(
        'flex items-center gap-4 p-4 border-b border-zinc-100 dark:border-zinc-800',
        'hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors',
        'group'
      )}
    >
      {/* Icon */}
      <div
        className="h-9 w-9 rounded-lg flex items-center justify-center text-white shrink-0"
        style={{ backgroundColor: project.color }}
      >
        <FolderKanban className="h-4 w-4" />
      </div>

      {/* Name & Description */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-zinc-900 dark:text-zinc-50 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
            {project.name}
          </h3>
          {isPinned && <Star className="h-3 w-3 fill-amber-400 text-amber-400 shrink-0" />}
          {project.risk !== 'none' && (
            <Badge variant="outline" className={cn('text-[10px] h-5', riskColors[project.risk])}>
              {project.risk} risk
            </Badge>
          )}
        </div>
        {project.description && (
          <p className="text-xs text-zinc-500 truncate mt-0.5">
            {project.description}
          </p>
        )}
      </div>

      {/* Progress */}
      <div className="w-32 shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0 overflow-hidden rounded-full">
            <Progress value={project.progress} className="h-1.5" />
          </div>
          <span className="text-xs text-zinc-500 w-8 shrink-0">{project.progress}%</span>
        </div>
      </div>

      {/* Fleet */}
      <div className="hidden md:block w-36 shrink-0">
        {project.activeRuns > 0 ? (
          <Badge className="text-[10px] bg-emerald-500/10 text-emerald-600 border-0 gap-1">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
            </span>
            {project.activeRuns} running
          </Badge>
        ) : project.delegationEnabled ? (
          <span className="text-[11px] text-muted-foreground">
            {project.delegationCounts.delegated + project.delegationCounts.pending > 0
              ? `${project.delegationCounts.delegated + project.delegationCounts.pending} queued`
              : 'idle'}
          </span>
        ) : (
          <span className="text-[11px] text-muted-foreground/40">unassigned</span>
        )}
      </div>

      {/* Owner */}
      <div className="w-32 shrink-0 flex items-center gap-2">
        <Avatar className="h-6 w-6">
          <AvatarFallback className="text-[10px]">
            {project.owner.name.split(' ').map(n => n[0]).join('')}
          </AvatarFallback>
        </Avatar>
        <span className="text-sm text-zinc-600 dark:text-zinc-300 truncate">
          {project.owner.name}
        </span>
      </div>

      {/* Updated */}
      <div className="w-24 shrink-0 text-xs text-zinc-500">
        {formatRelativeDate(project.updatedAt)}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => {
            e.preventDefault();
            setIsPinned(!isPinned);
          }}
        >
          {isPinned ? (
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
          ) : (
            <StarOff className="h-4 w-4" />
          )}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => e.preventDefault()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={(e) => {
                e.preventDefault();
                onEdit(project);
              }}
            >
              Edit project
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.preventDefault();
                onDuplicate(project);
              }}
            >
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.preventDefault();
                onGenerateStatus(project);
              }}
            >
              Generate status update
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-600"
              onClick={(e) => {
                e.preventDefault();
                onArchive(project);
              }}
            >
              Archive
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Link>
  );
}

export default function ProjectsPageClient({ pageTitle = 'Projects' }: { pageTitle?: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const isMobile = useMobile();
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('updated');
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectData | null>(null);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [editProjectName, setEditProjectName] = useState('');
  const [editProjectDescription, setEditProjectDescription] = useState('');
  const [editDelegationEnabled, setEditDelegationEnabled] = useState(false);
  const [isSavingProject, setIsSavingProject] = useState(false);

  // Handle query parameters from command palette
  useEffect(() => {
    const createParam = searchParams.get('create');
    if (createParam === 'true') {
      setCreateDialogOpen(true);
      // Clear the parameter from URL
      router.replace(pathname || '/projects');
    }
  }, [searchParams, router, pathname]);

  // Get user's workspace first
  useEffect(() => {
    const getUserWorkspace = async () => {
      if (!user) return;

      try {
        const response = await fetch('/api/workspaces', {
          credentials: 'include'
        });
        
        if (!response.ok) {
          console.error('Failed to fetch workspaces');
          return;
        }

        const data = await response.json();
        
        // Handle both wrapped format { workspaces: [...] } and direct array format
        const workspaces = data.data?.workspaces || data.data || [];
        if (data.ok && workspaces.length > 0) {
          // Use the first workspace the user has access to
          setCurrentWorkspaceId(workspaces[0].id);
        } else {
          console.error('No workspaces found for user');
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Failed to fetch user workspace:', error);
      }
    };

    getUserWorkspace();
  }, [user]);

  useEffect(() => {
    const fetchProjects = async () => {
    if (!user || !currentWorkspaceId) return;

    try {
      const response = await fetch(`/api/projects?workspace_id=${currentWorkspaceId}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Projects API error:', {
          status: response.status,
          error: errorData.error
        });

        if (response.status === 401) {
          toast.error('Session expired. Please sign in again.');
        } else if (response.status === 403) {
          toast.error('You do not have permission to access projects.');
        } else {
          toast.error('Failed to load projects');
        }

        return;
      }

      const data = await response.json();
      console.log('Projects API response:', data);

      // API returns {ok: true, data: [...]} or {success: true, data: [...]}
      if ((data.success || data.ok) && data.data) {
        // Transform API response to component format
        const transformedProjects = data.data.map((project: any) => ({
          id: project.id,
          name: project.name,
          slug: project.slug,
          description: project.description,
          color: project.color || '#6366F1',
          icon: project.icon || 'folder',
          status: project.status || 'active',
          isPinned: project.is_pinned || false,
          progress: (project.total_tasks ?? 0) > 0
            ? Math.round(((project.tasks_completed ?? 0) / (project.total_tasks ?? 1)) * 100)
            : 0,
          tasksCompleted: project.tasks_completed ?? 0,
          totalTasks: project.total_tasks ?? 0,
          risk: deriveProjectRisk(project.total_tasks, project.tasks_completed, project.status),
          owner: {
            name: project.owner_name || user?.user_metadata?.name || user?.user_metadata?.full_name || 'Unknown',
            avatar: project.owner_avatar || user?.user_metadata?.avatar_url
          },
          updatedAt: project.updated_at,
          agentPool: project.assigned_agent_pool ?? [],
          delegationCounts: {
            pending:   project.delegation_counts?.pending ?? 0,
            delegated: project.delegation_counts?.delegated ?? 0,
            running:   project.delegation_counts?.running ?? 0,
            completed: project.delegation_counts?.completed ?? 0,
            failed:    project.delegation_counts?.failed ?? 0,
          },
          activeRuns: project.active_run_count ?? 0,
          delegationEnabled: project.delegation_settings?.enabled ?? false,
        }));

        setProjects(transformedProjects);
      } else {
        console.error('Invalid response format:', data);
        setProjects([]);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
      toast.error('Failed to load projects');
      setProjects([]);
    } finally {
      setIsLoading(false);
    }
  };

    if (currentWorkspaceId) {
      fetchProjects();
    }
  }, [user, currentWorkspaceId]);

  const handleCreateProject = useCallback(async () => {
    if (!newProjectName.trim() || !currentWorkspaceId) {
      toast.error('Please enter a project name');
      return;
    }

    setIsCreatingProject(true);
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newProjectName.trim(),
          description: newProjectDescription.trim() || null,
          workspace_id: currentWorkspaceId,
          status: 'active',
          color: '#6366F1',
          icon: 'folder',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Create project error:', errorData);
        toast.error(errorData.error || 'Failed to create project');
        return;
      }

      const data = await response.json();
      // API returns {ok: true, data: {...}} or {success: true, data: {...}}
      if ((data.success || data.ok) && data.data) {
        toast.success('Project created successfully');
        setNewProjectName('');
        setNewProjectDescription('');
        setCreateDialogOpen(false);
        // Navigate to the new project
        router.push(`/projects/${data.data.slug}`);
      }
    } catch (error) {
      console.error('Failed to create project:', error);
      toast.error('Failed to create project');
    } finally {
      setIsCreatingProject(false);
    }
  }, [newProjectName, newProjectDescription, currentWorkspaceId, router]);

  const handleDuplicateProject = useCallback(async (project: ProjectData) => {
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `${project.name} (Copy)`,
          description: project.description,
          color: project.color,
          icon: project.icon,
          status: project.status,
          workspace_id: currentWorkspaceId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Duplicate project API error:', {
          status: response.status,
          error: errorData.error
        });
        toast.error(errorData.error || 'Failed to duplicate project');
        return;
      }

      const data = await response.json();

      if (data.success) {
        toast.success('Project duplicated successfully');
        // Refresh projects list
        const refreshResponse = await fetch(`/api/projects?workspace_id=${currentWorkspaceId}`, {
          credentials: 'include'
        });

        if (!refreshResponse.ok) {
          console.error('Failed to refresh projects list');
          return;
        }

        const refreshData = await refreshResponse.json();
        if (refreshData.success) {
          const projectsData = refreshData.data?.data || refreshData.data || [];
          setProjects(projectsData.map((p: any) => ({
            id: p.id,
            name: p.name,
            slug: p.slug || p.id,
            description: p.description,
            color: p.color || '#6366F1',
            icon: p.icon || 'folder',
            status: p.status || 'active',
            isPinned: p.is_pinned || false,
            progress: p.progress || 0,
            tasksCompleted: p.tasks_completed || 0,
            totalTasks: p.total_tasks || 0,
            risk: p.risk || 'none',
            nextMilestone: p.next_milestone,
            owner: p.owner || { name: 'Unknown' },
            teamSize: p.team_size || 0,
            updatedAt: p.updated_at || new Date().toISOString(),
          })));
        }
      } else {
        toast.error(data.error || 'Failed to duplicate project');
      }
    } catch (error) {
      console.error('Duplicate project error:', error);
      toast.error('Failed to duplicate project');
    }
  }, [currentWorkspaceId]);

  const handleEditProject = useCallback((project: ProjectData) => {
    setEditingProject(project);
    setEditProjectName(project.name);
    setEditProjectDescription(project.description || '');
    setEditDelegationEnabled(project.delegationEnabled);
    setEditDialogOpen(true);
  }, []);

  const handleSaveProject = useCallback(async () => {
    if (!editingProject) return;

    setIsSavingProject(true);
    try {
      const response = await fetch(`/api/projects/${editingProject.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editProjectName,
          description: editProjectDescription,
          delegation_settings: { enabled: editDelegationEnabled },
        }),
        credentials: 'include',
      });

      if (response.ok) {
        toast.success('Project updated successfully');
        setProjects(prev =>
          prev.map(p =>
            p.id === editingProject.id
              ? { ...p, name: editProjectName, description: editProjectDescription, delegationEnabled: editDelegationEnabled }
              : p
          )
        );
        setEditDialogOpen(false);
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to update project');
      }
    } catch (error) {
      console.error('Save project error:', error);
      toast.error('Failed to update project');
    } finally {
      setIsSavingProject(false);
    }
  }, [editingProject, editProjectName, editProjectDescription, editDelegationEnabled]);

  const handleGenerateStatus = useCallback((project: ProjectData) => {
    router.push(`/projects/${project.slug}/status-update`);
  }, [router]);

  const handleToggleDelegation = useCallback(async (project: ProjectData) => {
    const newEnabled = !project.delegationEnabled;
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ delegation_settings: { enabled: newEnabled } }),
      });
      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || 'Failed to update delegation');
        return;
      }
      setProjects(prev =>
        prev.map(p => p.id === project.id ? { ...p, delegationEnabled: newEnabled } : p)
      );
      toast.success(`Delegation ${newEnabled ? 'enabled' : 'disabled'}`);
    } catch {
      toast.error('Failed to update delegation');
    }
  }, []);

  const handleArchiveProject = useCallback(async (project: ProjectData) => {
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'archived',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Archive project API error:', {
          status: response.status,
          error: errorData.error
        });
        toast.error(errorData.error || 'Failed to archive project');
        return;
      }

      const data = await response.json();

      if (data.success) {
        toast.success('Project archived successfully');
        // Remove from list
        setProjects(prev => prev.filter(p => p.id !== project.id));
      } else {
        toast.error(data.error || 'Failed to archive project');
      }
    } catch (error) {
      console.error('Archive project error:', error);
      toast.error('Failed to archive project');
    }
  }, []);

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.description?.toLowerCase().includes(search.toLowerCase())
  );

  const sortedProjects = [...filteredProjects].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'progress':
        return b.progress - a.progress;
      case 'risk':
        const riskOrder = { high: 0, medium: 1, low: 2, none: 3 };
        return riskOrder[a.risk] - riskOrder[b.risk];
      default:
        return 0;
    }
  });

  if (isLoading) {
    return (
      <PageShell>
        <PageHeader
          title={pageTitle}
          subtitle="Loading..."
          primaryAction={
            <Button disabled>
              <Plus className="h-4 w-4" />
              {buttons.createProject}
            </Button>
          }
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Projects"
        subtitle={`${projects.length} active projects`}
      />

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
        <div className="relative w-full sm:flex-1 sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-3">
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-[160px] flex-1 sm:flex-none">
              <ArrowUpDown className="h-4 w-4" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="updated">Last updated</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="progress">Progress</SelectItem>
              <SelectItem value="risk">Risk level</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon" className="shrink-0" onClick={() => toast.info('Project filtering coming soon')}>
            <Filter className="h-4 w-4" />
          </Button>

          <div className="flex items-center border border-zinc-200 dark:border-zinc-800 rounded-lg p-0.5 shrink-0">
            <Button
              variant={view === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setView('grid')}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={view === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setView('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Projects */}
      {view === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onEdit={handleEditProject}
              onDuplicate={handleDuplicateProject}
              onGenerateStatus={handleGenerateStatus}
              onArchive={handleArchiveProject}
              onToggleDelegation={handleToggleDelegation}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          {/* List Header - hidden on mobile */}
          <div className="hidden sm:flex items-center gap-4 px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-xs font-medium text-zinc-500 uppercase tracking-wider">
            <div className="w-9" />
            <div className="flex-1">Project</div>
            <div className="w-32">Progress</div>
            <div className="hidden md:block w-36">Fleet</div>
            <div className="w-32">Owner</div>
            <div className="w-24">Updated</div>
            <div className="w-20" />
          </div>

          {/* List Items */}
          {sortedProjects.map((project) => (
            <ProjectRow
              key={project.id}
              project={project}
              onEdit={handleEditProject}
              onDuplicate={handleDuplicateProject}
              onGenerateStatus={handleGenerateStatus}
              onArchive={handleArchiveProject}
              onToggleDelegation={handleToggleDelegation}
              isMobile={isMobile}
            />
          ))}
        </div>
      )}

{/* Empty State */}
      {sortedProjects.length === 0 && !search && currentWorkspaceId && (
        <ProjectEmptyState workspaceId={currentWorkspaceId} hasProjects={false} />
      )}
      
      {sortedProjects.length === 0 && search && (
        <EmptyState
          icon={FolderKanban}
          title={`No projects matching "${search}"`}
          description="Try a different search term"
          primaryAction={{
            label: 'Clear search',
            onClick: () => setSearch(''),
          }}
        />
      )}

      {/* Edit Project Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>
              Make changes to your project here. Click save when you&apos;re done.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="name" className="text-sm font-medium">
                Name
              </label>
              <Input
                id="name"
                value={editProjectName}
                onChange={(e) => setEditProjectName(e.target.value)}
                placeholder="Project name"
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="description" className="text-sm font-medium">
                Description
              </label>
              <Input
                id="description"
                value={editProjectDescription}
                onChange={(e) => setEditProjectDescription(e.target.value)}
                placeholder="Project description"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border px-3 py-2">
              <div>
                <p className="text-[13px] font-medium">Agent delegation</p>
                <p className="text-[11px] text-muted-foreground">
                  Allow ClawdBot agents to pick up tasks from this project
                </p>
              </div>
              <Switch
                checked={editDelegationEnabled}
                onCheckedChange={setEditDelegationEnabled}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={isSavingProject}>
              Cancel
            </Button>
            <Button onClick={handleSaveProject} disabled={isSavingProject}>
              {isSavingProject ? 'Saving...' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Project Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={(open) => {
        setCreateDialogOpen(open);
        if (!open) {
          setNewProjectName('');
          setNewProjectDescription('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Project</DialogTitle>
            <DialogDescription>
              Create a new project to organize your work.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="create-name">Name</Label>
              <Input
                id="create-name"
                placeholder="Project name"
                autoFocus
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleCreateProject();
                  }
                }}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-description">Description</Label>
              <Textarea
                id="create-description"
                placeholder="What is this project about?"
                rows={3}
                value={newProjectDescription}
                onChange={(e) => setNewProjectDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)} disabled={isCreatingProject}>
              Cancel
            </Button>
            <Button onClick={handleCreateProject} disabled={isCreatingProject || !newProjectName.trim()}>
              {isCreatingProject ? 'Creating...' : 'Create project'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
