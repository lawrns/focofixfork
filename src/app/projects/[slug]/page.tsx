'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useRecentItems } from '@/hooks/useRecentItems';
import { useAuth } from '@/lib/hooks/use-auth';
import { supabase } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { useMobile } from '@/lib/hooks/use-mobile';
import {
  LayoutGrid,
  List,
  Calendar as CalendarIcon,
  FileText,
  Users,
  Settings,
  Plus,
  Filter,
  MoreHorizontal,
  ChevronDown,
  Star,
  Zap,
  AlertTriangle,
  Clock,
  CheckCircle2,
  GripVertical,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { WorkItem, WorkItemStatus, PriorityLevel } from '@/types/foco';

interface Project {
  id: string;
  name: string;
  slug: string;
  description?: string;
  brief?: string;
  color?: string;
  workspace_id: string;
}


interface TeamMember {
  id: string;
  user_id: string;
  role: string;
  user_profiles?: {
    full_name?: string;
    email: string;
  };
}

const columns: { status: WorkItemStatus; label: string; color: string }[] = [
  { status: 'backlog', label: 'Backlog', color: 'bg-zinc-400' },
  { status: 'next', label: 'Next', color: 'bg-blue-500' },
  { status: 'in_progress', label: 'In Progress', color: 'bg-indigo-500' },
  { status: 'review', label: 'Review', color: 'bg-amber-500' },
  { status: 'blocked', label: 'Blocked', color: 'bg-red-500' },
  { status: 'done', label: 'Done', color: 'bg-green-500' },
];

const priorityColors: Record<PriorityLevel, string> = {
  urgent: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-blue-500',
  low: 'bg-zinc-400',
  none: 'bg-zinc-300',
};

function WorkItemCard({ item }: { item: WorkItem }) {
  return (
    <Link
      href={`/tasks/${item.id}`}
      className={cn(
        'block p-2 md:p-3 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800',
        'hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-sm transition-all',
        'group cursor-pointer min-h-[44px]'
      )}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="h-4 w-4 text-zinc-300 opacity-0 group-hover:opacity-100 mt-0.5 cursor-grab shrink-0" />
        <div className="flex-1 min-w-0">
          {/* Title & Type */}
          <div className="flex items-start gap-2 mb-2">
            <div className={cn('h-1.5 w-1.5 md:h-2 md:w-2 rounded-full mt-1.5 shrink-0', priorityColors[item.priority])} />
            <span className="font-medium text-xs md:text-sm text-zinc-900 dark:text-zinc-50 line-clamp-2">
              {item.title}
            </span>
          </div>
          
          {/* Labels */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {item.type === 'bug' && (
              <Badge variant="outline" className="text-xs text-red-600 border-red-200 bg-red-50">
                Bug
              </Badge>
            )}
            {item.type === 'feature' && (
              <Badge variant="outline" className="h-4 md:h-5 text-[9px] md:text-[10px] text-purple-600 border-purple-200 bg-purple-50">
                Feature
              </Badge>
            )}
            {item.status === 'blocked' && item.blocked_reason && (
              <Badge variant="outline" className="text-xs text-red-600 border-red-200 bg-red-50">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Blocked
              </Badge>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {item.due_date && (
                <span className={cn(
                  'flex items-center gap-1 text-xs',
                  new Date(item.due_date) < new Date() 
                    ? 'text-red-500' 
                    : 'text-zinc-500'
                )}>
                  <Clock className="h-3 w-3 shrink-0" />
                  <span className="truncate">{new Date(item.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                </span>
              )}
            </div>
            {item.assignee && (
              <Avatar className="h-4 w-4 md:h-5 md:w-5 shrink-0">
                <AvatarFallback className="text-[7px] md:text-[8px]">
                  {item.assignee.full_name?.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

function BoardColumn({ status, label, color, items }: { 
  status: WorkItemStatus; 
  label: string; 
  color: string;
  items: WorkItem[];
}) {
  return (
    <div className="flex flex-col w-full md:w-72 min-w-[280px] shrink-0">
      {/* Column Header */}
      <div className="flex items-center gap-2 px-2 py-2 mb-2">
        <div className={cn('h-1.5 w-1.5 md:h-2 md:w-2 rounded-full shrink-0', color)} />
        <span className="font-medium text-xs md:text-sm text-zinc-900 dark:text-zinc-50 truncate">
          {label}
        </span>
        <span className="text-xs text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 rounded shrink-0">
          {items.length}
        </span>
        <div className="flex-1" />
        <Button variant="ghost" size="icon" className="h-5 w-5 md:h-6 md:w-6 min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0" aria-label="Add task to column">
          <Plus className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-5 w-5 md:h-6 md:w-6 min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0" aria-label="Column options">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </div>

      {/* Cards */}
      <div className="flex-1 space-y-1 md:space-y-2 min-h-[200px] p-0.5 md:p-1 rounded-lg bg-zinc-50/50 dark:bg-zinc-800/20">
        {items.map((item) => (
          <WorkItemCard key={item.id} item={item} />
        ))}
        
        {/* Add Card Button */}
        <Button
          variant="ghost"
          className="w-full justify-start text-zinc-500 h-9 md:h-9 min-h-[44px]"
          size="sm"
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="text-xs md:text-sm">Add task</span>
        </Button>
      </div>
    </div>
  );
}

function AISuggestionStrip() {
  return (
    <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 p-3 mb-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 rounded-lg border border-indigo-100 dark:border-indigo-900/50">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/50 rounded shrink-0">
          <Zap className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs md:text-sm text-zinc-900 dark:text-zinc-50">
            <span className="font-medium">Team capacity is 92% next week</span>
            <span className="hidden md:inline">{' — '}</span>
            <span className="block md:inline text-zinc-600 dark:text-zinc-400">
              Consider moving &quot;Checkout flow redesign&quot; by 2 days
            </span>
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 justify-end">
        <Badge variant="secondary" className="text-[10px] hidden md:inline-flex">
          89% confident
        </Badge>
        <Button size="sm" variant="default" className="h-8 md:h-7 min-h-[44px] md:min-h-0 flex-1 md:flex-none">
          Apply
        </Button>
        <Button size="sm" variant="ghost" className="h-8 md:h-7 min-h-[44px] md:min-h-0 flex-1 md:flex-none">
          Dismiss
        </Button>
      </div>
    </div>
  );
}

export default function ProjectPage() {
  const params = useParams();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('board');
  const { addItem } = useRecentItems();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<WorkItem[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMobile = useMobile();

  const slug = params.slug as string;

  // Fetch project data
  useEffect(() => {
    async function fetchProjectData() {
      if (!user || !slug) return;

      try {
        setLoading(true);
        setError(null);

        // Fetch project
        const { data: projectData, error: projectError } = (await supabase
          .from('foco_projects')
          .select('id, workspace_id, name, slug, description, brief, color, icon, status, owner_id, default_status, settings, is_pinned, archived_at, created_at, updated_at')
          .eq('slug', slug)
          .single()) as { data: Project | null; error: any };

        if (projectError) throw projectError;
        if (!projectData) throw new Error('Project not found');
        setProject(projectData);

        // Track in recent items
        addItem({
          type: 'project',
          id: projectData.id,
          name: projectData.name,
        });

        // Fetch work items (tasks) for this project
        const { data: tasksData, error: tasksError } = (await supabase
          .from('work_items')
          .select('id, project_id, title, description, type, status, priority, assignee_id, due_date, blocked_reason, tags, created_at, updated_at')
          .eq('project_id', projectData.id)
          .order('created_at', { ascending: false })) as { data: any[] | null; error: any };

        if (tasksError) throw tasksError;
        
        // Fetch assignee profiles for work items that have assignees
        const assigneeIds = [...new Set((tasksData || []).map(t => t.assignee_id).filter(Boolean))];
        let assigneeMap: Record<string, any> = {};

        if (assigneeIds.length > 0) {
          const { data: assigneesData } = (await supabase
            .from('user_profiles')
            .select('id, email, full_name')
            .in('id', assigneeIds)) as { data: any[] | null; error: any };

          if (assigneesData) {
            assigneeMap = Object.fromEntries(
              assigneesData.map(a => [a.id, a])
            );
          }
        }

        // Map assignee data to work items
        const tasksWithAssignees = (tasksData || []).map(task => ({
          ...task,
          assignee: task.assignee_id ? assigneeMap[task.assignee_id] : undefined
        }));

        setTasks(tasksWithAssignees);

        // Fetch team members
        const { data: membersData, error: membersError } = (await supabase
          .from('foco_project_members')
          .select('id, project_id, user_id, role, created_at, updated_at')
          .eq('project_id', projectData.id)) as { data: any[] | null; error: any };

        if (membersError) throw membersError;

        // Fetch user profiles for team members
        const memberUserIds = (membersData || []).map(m => m.user_id);
        let memberProfilesMap: Record<string, any> = {};

        if (memberUserIds.length > 0) {
          const { data: profilesData } = (await supabase
            .from('user_profiles')
            .select('id, email, full_name')
            .in('id', memberUserIds)) as { data: any[] | null; error: any };

          if (profilesData) {
            memberProfilesMap = Object.fromEntries(
              profilesData.map(p => [p.id, p])
            );
          }
        }

        // Map user profiles to team members
        const membersWithProfiles = (membersData || []).map(member => ({
          ...member,
          user_profiles: memberProfilesMap[member.user_id]
        }));

        setTeamMembers(membersWithProfiles);

      } catch (err: any) {
        console.error('Error fetching project data:', err);
        setError(err.message || 'Failed to load project');
      } finally {
        setLoading(false);
      }
    }

    fetchProjectData();
  }, [user, slug, addItem]);

  const getItemsByStatus = (status: WorkItemStatus) =>
    tasks.filter(item => item.status === status);

  // Loading state
  if (loading) {
    return (
      <div className="max-w-full">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
            <p className="mt-4 text-sm text-zinc-500">Loading project...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !project) {
    return (
      <div className="max-w-full">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
              {error || 'Project not found'}
            </h2>
            <p className="text-sm text-zinc-500 mb-4">
              The project you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.
            </p>
            <Button asChild>
              <Link href="/projects">Back to Projects</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const completedTasks = tasks.filter(t => t.status === 'done').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
  const blockedTasks = tasks.filter(t => t.status === 'blocked').length;

  return (
    <div className="max-w-full">
      {/* Project Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4 md:mb-6">
        <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
          <div
            className="h-10 w-10 md:h-12 md:w-12 rounded-xl flex items-center justify-center text-white text-base md:text-lg font-bold shrink-0"
            style={{ backgroundColor: project.color || '#6366F1' }}
          >
            {project.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-semibold text-zinc-900 dark:text-zinc-50 truncate">
                {project.name}
              </h1>
            </div>
            <p className="text-zinc-500 mt-0.5 text-sm md:text-base hidden md:block">
              {project.description || 'No description'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Button variant="outline" size="sm" className="flex-1 md:flex-none min-h-[44px]" aria-label="Generate status report">
            <Zap className="h-4 w-4" />
            <span className="hidden md:inline">Generate Status</span>
          </Button>
          <Button size="sm" className="flex-1 md:flex-none min-h-[44px]" aria-label="Add new task">
            <Plus className="h-4 w-4" />
            <span className="hidden md:inline">Add Task</span>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 md:gap-0 mb-4">
          {/* Tabs List - Scrollable on mobile */}
          <div className="relative w-full md:w-auto">
            {/* Scroll fade indicators for mobile */}
            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent pointer-events-none z-1 md:hidden" />
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none z-1 md:hidden" />
            
            <TabsList className="w-full md:w-auto overflow-x-auto scrollbar-hide -mx-6 px-6 md:mx-0 md:px-0" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              <TabsTrigger value="overview" className="px-2 md:px-3 whitespace-nowrap flex-shrink-0 min-h-[44px]">
                Overview
              </TabsTrigger>
              <TabsTrigger value="board" className="gap-1 md:gap-2 px-2 md:px-3 whitespace-nowrap flex-shrink-0 min-h-[44px]">
                <LayoutGrid className="h-3.5 w-3.5 md:h-4 md:w-4" />
                <span>Board</span>
              </TabsTrigger>
              <TabsTrigger value="list" className="gap-1 md:gap-2 px-2 md:px-3 whitespace-nowrap flex-shrink-0 min-h-[44px]">
                <List className="h-3.5 w-3.5 md:h-4 md:w-4" />
                <span>List</span>
              </TabsTrigger>
              <TabsTrigger value="timeline" className="gap-1 md:gap-2 px-2 md:px-3 whitespace-nowrap flex-shrink-0 min-h-[44px]">
                <CalendarIcon className="h-3.5 w-3.5 md:h-4 md:w-4" />
                <span>Timeline</span>
              </TabsTrigger>
              <TabsTrigger value="docs" className="gap-1 md:gap-2 px-2 md:px-3 whitespace-nowrap flex-shrink-0 min-h-[44px]">
                <FileText className="h-3.5 w-3.5 md:h-4 md:w-4" />
                <span>Docs</span>
              </TabsTrigger>
              <TabsTrigger value="people" className="gap-1 md:gap-2 px-2 md:px-3 whitespace-nowrap flex-shrink-0 min-h-[44px]">
                <Users className="h-3.5 w-3.5 md:h-4 md:w-4" />
                <span>People</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-1 md:gap-2 px-2 md:px-3 whitespace-nowrap flex-shrink-0 min-h-[44px]">
                <Settings className="h-3.5 w-3.5 md:h-4 md:w-4" />
                <span>Settings</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Filter/Group Actions - Dropdown on mobile */}
          <div className="flex items-center gap-2">
            {/* Mobile: Single dropdown with both filter and group */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="md:hidden min-h-[44px] flex-1">
                  <Filter className="h-4 w-4" />
                  <span>Actions</span>
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem>
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <span>Group: Status</span>
                </DropdownMenuItem>
                <DropdownMenuItem>Group: Assignee</DropdownMenuItem>
                <DropdownMenuItem>Group: Priority</DropdownMenuItem>
                <DropdownMenuItem>Group: None</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Desktop: Separate buttons */}
            <div className="hidden md:flex items-center gap-2">
              <Button variant="outline" size="sm" className="min-h-[44px]">
                <Filter className="h-4 w-4" />
                Filter
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="min-h-[44px]">
                    Group: Status
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem>Status</DropdownMenuItem>
                  <DropdownMenuItem>Assignee</DropdownMenuItem>
                  <DropdownMenuItem>Priority</DropdownMenuItem>
                  <DropdownMenuItem>None</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* AI Suggestion Strip */}
        <AISuggestionStrip />

        {/* Board View */}
        <TabsContent value="board" className="mt-0">
          <div className="flex gap-2 md:gap-4 overflow-x-auto pb-4 -mx-6 px-6 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {columns.map((column) => (
              <BoardColumn
                key={column.status}
                status={column.status}
                label={column.label}
                color={column.color}
                items={getItemsByStatus(column.status)}
              />
            ))}
          </div>
        </TabsContent>

        {/* Overview */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            <div className="col-span-1 md:col-span-2 space-y-4 md:space-y-6">
              {/* Brief */}
              <div className="p-3 md:p-4 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
                <h3 className="font-medium mb-2 text-sm md:text-base">Project Brief</h3>
                <p className="text-xs md:text-sm text-zinc-600 dark:text-zinc-300">
                  {project.brief || project.description || 'No project brief available.'}
                </p>
              </div>

              {/* Milestones */}
              <div className="p-3 md:p-4 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
                <h3 className="font-medium mb-3 text-sm md:text-base">Milestones</h3>
                <div className="space-y-2 md:space-y-3">
                  <div className="flex items-center justify-between p-2 md:p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg gap-2">
                    <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                      <div className="h-7 w-7 md:h-8 md:w-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                        <Clock className="h-3.5 w-3.5 md:h-4 md:w-4 text-amber-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-xs md:text-sm truncate">Design Phase Complete</p>
                        <p className="text-[10px] md:text-xs text-zinc-500">Due Jan 20, 2026</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 shrink-0 text-[10px] md:text-xs">
                      In Progress
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 md:p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg gap-2">
                    <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                      <div className="h-7 w-7 md:h-8 md:w-8 rounded-full bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center shrink-0">
                        <Clock className="h-3.5 w-3.5 md:h-4 md:w-4 text-zinc-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-xs md:text-sm truncate">Development Complete</p>
                        <p className="text-[10px] md:text-xs text-zinc-500">Due Feb 28, 2026</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="shrink-0 text-[10px] md:text-xs">Upcoming</Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-4 md:space-y-6">
              {/* Quick Stats */}
              <div className="p-3 md:p-4 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
                <h3 className="font-medium mb-3 text-sm md:text-base">Progress</h3>
                <div className="space-y-2 md:space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs md:text-sm text-zinc-500">Completed</span>
                    <span className="font-medium text-sm md:text-base">{completedTasks} / {tasks.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs md:text-sm text-zinc-500">In Progress</span>
                    <span className="font-medium text-sm md:text-base">{inProgressTasks}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs md:text-sm text-zinc-500">Blocked</span>
                    <span className="font-medium text-sm md:text-base text-red-500">{blockedTasks}</span>
                  </div>
                </div>
              </div>

              {/* Team */}
              <div className="p-3 md:p-4 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
                <h3 className="font-medium mb-3 text-sm md:text-base">Team</h3>
                <div className="space-y-2">
                  {teamMembers.length === 0 ? (
                    <p className="text-xs md:text-sm text-zinc-500">No team members yet</p>
                  ) : (
                    teamMembers.map((member) => (
                      <div key={member.id} className="flex items-center gap-2">
                        <Avatar className="h-6 w-6 shrink-0">
                          <AvatarFallback className="text-[10px]">
                            {member.user_profiles?.full_name
                              ?.split(' ')
                              .map(n => n[0])
                              .join('') || member.user_profiles?.email.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs md:text-sm truncate">
                          {member.user_profiles?.full_name || member.user_profiles?.email}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* List View Placeholder */}
        <TabsContent value="list">
          <div className="text-center py-12 text-zinc-500">
            List view coming soon
          </div>
        </TabsContent>

        {/* Timeline Placeholder */}
        <TabsContent value="timeline">
          <div className="text-center py-12 text-zinc-500">
            Timeline view coming soon
          </div>
        </TabsContent>

        {/* Docs Placeholder */}
        <TabsContent value="docs">
          <div className="text-center py-12 text-zinc-500">
            Docs view coming soon
          </div>
        </TabsContent>

        {/* People Placeholder */}
        <TabsContent value="people">
          <div className="text-center py-12 text-zinc-500">
            People view coming soon
          </div>
        </TabsContent>

        {/* Settings Placeholder */}
        <TabsContent value="settings">
          <div className="text-center py-12 text-zinc-500">
            Settings view coming soon
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
