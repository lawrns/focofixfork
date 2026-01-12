'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useRecentItems } from '@/hooks/useRecentItems';
import { useAuth } from '@/lib/hooks/use-auth';
import { supabase } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
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
  organization_id: string;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  due_date?: string;
  assigned_to?: string;
  project_id: string;
  created_at: string;
  updated_at: string;
  assignee?: {
    id: string;
    email: string;
    full_name: string;
  };
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
        'block p-3 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800',
        'hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-sm transition-all',
        'group cursor-pointer'
      )}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="h-4 w-4 text-zinc-300 opacity-0 group-hover:opacity-100 mt-0.5 cursor-grab" />
        <div className="flex-1 min-w-0">
          {/* Title & Type */}
          <div className="flex items-start gap-2 mb-2">
            <div className={cn('h-2 w-2 rounded-full mt-1.5 shrink-0', priorityColors[item.priority])} />
            <span className="font-medium text-sm text-zinc-900 dark:text-zinc-50 line-clamp-2">
              {item.title}
            </span>
          </div>
          
          {/* Labels */}
          <div className="flex items-center gap-1.5 mb-2">
            {item.type === 'bug' && (
              <Badge variant="outline" className="h-5 text-[10px] text-red-600 border-red-200 bg-red-50">
                Bug
              </Badge>
            )}
            {item.type === 'feature' && (
              <Badge variant="outline" className="h-5 text-[10px] text-purple-600 border-purple-200 bg-purple-50">
                Feature
              </Badge>
            )}
            {item.status === 'blocked' && item.blocked_reason && (
              <Badge variant="outline" className="h-5 text-[10px] text-red-600 border-red-200 bg-red-50">
                <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                Blocked
              </Badge>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {item.due_date && (
                <span className={cn(
                  'flex items-center gap-1 text-xs',
                  new Date(item.due_date) < new Date() 
                    ? 'text-red-500' 
                    : 'text-zinc-500'
                )}>
                  <Clock className="h-3 w-3" />
                  {new Date(item.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              )}
            </div>
            {item.assignee && (
              <Avatar className="h-5 w-5">
                <AvatarFallback className="text-[8px]">
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
    <div className="flex flex-col w-72 shrink-0">
      {/* Column Header */}
      <div className="flex items-center gap-2 px-2 py-2 mb-2">
        <div className={cn('h-2 w-2 rounded-full', color)} />
        <span className="font-medium text-sm text-zinc-900 dark:text-zinc-50">
          {label}
        </span>
        <span className="text-xs text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 rounded">
          {items.length}
        </span>
        <div className="flex-1" />
        <Button variant="ghost" size="icon" className="h-6 w-6">
          <Plus className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-6 w-6">
          <MoreHorizontal className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Cards */}
      <div className="flex-1 space-y-2 min-h-[200px] p-1 rounded-lg bg-zinc-50/50 dark:bg-zinc-800/20">
        {items.map((item) => (
          <WorkItemCard key={item.id} item={item} />
        ))}
        
        {/* Add Card Button */}
        <Button
          variant="ghost"
          className="w-full justify-start text-zinc-500 h-9"
          size="sm"
        >
          <Plus className="h-3.5 w-3.5" />
          Add task
        </Button>
      </div>
    </div>
  );
}

function AISuggestionStrip() {
  return (
    <div className="flex items-center gap-3 p-3 mb-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 rounded-lg border border-indigo-100 dark:border-indigo-900/50">
      <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/50 rounded">
        <Zap className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
      </div>
      <div className="flex-1">
        <p className="text-sm text-zinc-900 dark:text-zinc-50">
          <span className="font-medium">Team capacity is 92% next week</span>
          {' — '}
          <span className="text-zinc-600 dark:text-zinc-400">
            Consider moving &quot;Checkout flow redesign&quot; by 2 days
          </span>
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="text-[10px]">
          89% confident
        </Badge>
        <Button size="sm" variant="default" className="h-7">
          Apply
        </Button>
        <Button size="sm" variant="ghost" className="h-7">
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
  const [tasks, setTasks] = useState<Task[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const slug = params.slug as string;

  // Fetch project data
  useEffect(() => {
    async function fetchProjectData() {
      if (!user || !slug) return;

      try {
        setLoading(true);
        setError(null);

        // Fetch project
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('*')
          .eq('slug', slug)
          .single();

        if (projectError) throw projectError;
        if (!projectData) throw new Error('Project not found');

        setProject(projectData);

        // Track in recent items
        addItem({
          type: 'project',
          id: projectData.id,
          name: projectData.name,
        });

        // Fetch tasks for this project
        const { data: tasksData, error: tasksError } = await supabase
          .from('tasks')
          .select(`
            *,
            assignee:user_profiles!tasks_assigned_to_fkey(id, email, full_name)
          `)
          .eq('project_id', projectData.id)
          .order('created_at', { ascending: false });

        if (tasksError) throw tasksError;
        setTasks(tasksData || []);

        // Fetch team members
        const { data: membersData, error: membersError } = await supabase
          .from('project_members')
          .select(`
            *,
            user_profiles(full_name, email)
          `)
          .eq('project_id', projectData.id);

        if (membersError) throw membersError;
        setTeamMembers(membersData || []);

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
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div
            className="h-12 w-12 rounded-xl flex items-center justify-center text-white text-lg font-bold"
            style={{ backgroundColor: project.color || '#6366F1' }}
          >
            {project.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                {project.name}
              </h1>
            </div>
            <p className="text-zinc-500 mt-0.5">
              {project.description || 'No description'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Zap className="h-4 w-4" />
            Generate Status
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4" />
            Add Task
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="board" className="gap-2">
              <LayoutGrid className="h-4 w-4" />
              Board
            </TabsTrigger>
            <TabsTrigger value="list" className="gap-2">
              <List className="h-4 w-4" />
              List
            </TabsTrigger>
            <TabsTrigger value="timeline" className="gap-2">
              <CalendarIcon className="h-4 w-4" />
              Timeline
            </TabsTrigger>
            <TabsTrigger value="docs" className="gap-2">
              <FileText className="h-4 w-4" />
              Docs
            </TabsTrigger>
            <TabsTrigger value="people" className="gap-2">
              <Users className="h-4 w-4" />
              People
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4" />
              Filter
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
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

        {/* AI Suggestion Strip */}
        <AISuggestionStrip />

        {/* Board View */}
        <TabsContent value="board" className="mt-0">
          <div className="flex gap-4 overflow-x-auto pb-4 -mx-6 px-6">
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
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 space-y-6">
              {/* Brief */}
              <div className="p-4 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
                <h3 className="font-medium mb-2">Project Brief</h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-300">
                  {project.brief || project.description || 'No project brief available.'}
                </p>
              </div>

              {/* Milestones */}
              <div className="p-4 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
                <h3 className="font-medium mb-3">Milestones</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                        <Clock className="h-4 w-4 text-amber-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Design Phase Complete</p>
                        <p className="text-xs text-zinc-500">Due Jan 20, 2026</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
                      In Progress
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center">
                        <Clock className="h-4 w-4 text-zinc-500" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Development Complete</p>
                        <p className="text-xs text-zinc-500">Due Feb 28, 2026</p>
                      </div>
                    </div>
                    <Badge variant="outline">Upcoming</Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quick Stats */}
              <div className="p-4 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
                <h3 className="font-medium mb-3">Progress</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-500">Completed</span>
                    <span className="font-medium">{completedTasks} / {tasks.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-500">In Progress</span>
                    <span className="font-medium">{inProgressTasks}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-500">Blocked</span>
                    <span className="font-medium text-red-500">{blockedTasks}</span>
                  </div>
                </div>
              </div>

              {/* Team */}
              <div className="p-4 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
                <h3 className="font-medium mb-3">Team</h3>
                <div className="space-y-2">
                  {teamMembers.length === 0 ? (
                    <p className="text-sm text-zinc-500">No team members yet</p>
                  ) : (
                    teamMembers.map((member) => (
                      <div key={member.id} className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-[10px]">
                            {member.user_profiles?.full_name
                              ?.split(' ')
                              .map(n => n[0])
                              .join('') || member.user_profiles?.email.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">
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
