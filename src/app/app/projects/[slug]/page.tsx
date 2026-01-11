'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
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

// Mock project data
const project = {
  id: '1',
  name: 'Website Redesign',
  slug: 'website-redesign',
  description: 'Complete overhaul of the company website with modern design and improved UX',
  brief: 'Launch a new website that improves conversion by 25% and reduces bounce rate by 40%. Key deliverables include new homepage, product pages, and checkout flow.',
  color: '#6366F1',
  isPinned: true,
};

// Mock work items
const workItems: WorkItem[] = [
  // Backlog
  { id: '1', workspace_id: '1', project_id: '1', type: 'feature', title: 'Add dark mode support', status: 'backlog', priority: 'low', position: 0, created_at: '', updated_at: '', ai_context_sources: [], metadata: {} },
  { id: '2', workspace_id: '1', project_id: '1', type: 'task', title: 'Mobile responsive audit', status: 'backlog', priority: 'medium', position: 1, created_at: '', updated_at: '', ai_context_sources: [], metadata: {} },
  
  // Next
  { id: '3', workspace_id: '1', project_id: '1', type: 'task', title: 'Product page templates', status: 'next', priority: 'medium', due_date: '2026-01-18', position: 0, created_at: '', updated_at: '', ai_context_sources: [], metadata: {}, assignee: { id: '1', email: '', full_name: 'Sarah Chen' } as any },
  { id: '4', workspace_id: '1', project_id: '1', type: 'task', title: 'Checkout flow redesign', status: 'next', priority: 'high', due_date: '2026-01-22', position: 1, created_at: '', updated_at: '', ai_context_sources: [], metadata: {}, assignee: { id: '2', email: '', full_name: 'Mike Johnson' } as any },
  
  // In Progress
  { id: '5', workspace_id: '1', project_id: '1', type: 'task', title: 'Design homepage mockups', status: 'in_progress', priority: 'high', due_date: '2026-01-15', position: 0, created_at: '', updated_at: '', ai_context_sources: [], metadata: {}, assignee: { id: '1', email: '', full_name: 'Sarah Chen' } as any },
  
  // Review
  { id: '6', workspace_id: '1', project_id: '1', type: 'bug', title: 'Fix navigation dropdown on Safari', status: 'review', priority: 'urgent', due_date: '2026-01-12', position: 0, created_at: '', updated_at: '', ai_context_sources: [], metadata: {}, assignee: { id: '3', email: '', full_name: 'Alex Kim' } as any },
  
  // Blocked
  { id: '7', workspace_id: '1', project_id: '1', type: 'task', title: 'SEO optimization audit', status: 'blocked', priority: 'medium', due_date: '2026-01-28', blocked_reason: 'Waiting for design mockups', position: 0, created_at: '', updated_at: '', ai_context_sources: [], metadata: {} },
  
  // Done
  { id: '8', workspace_id: '1', project_id: '1', type: 'task', title: 'Create homepage wireframes', status: 'done', priority: 'high', position: 0, created_at: '', updated_at: '', ai_context_sources: [], metadata: {}, assignee: { id: '1', email: '', full_name: 'Sarah Chen' } as any },
  { id: '9', workspace_id: '1', project_id: '1', type: 'task', title: 'Content migration plan', status: 'done', priority: 'high', position: 1, created_at: '', updated_at: '', ai_context_sources: [], metadata: {} },
];

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
      href={`/app/tasks/${item.id}`}
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
          <Plus className="h-3.5 w-3.5 mr-1" />
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
            Consider moving "Checkout flow redesign" by 2 days
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
  const [activeTab, setActiveTab] = useState('board');

  const getItemsByStatus = (status: WorkItemStatus) => 
    workItems.filter(item => item.status === status);

  return (
    <div className="max-w-full">
      {/* Project Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div
            className="h-12 w-12 rounded-xl flex items-center justify-center text-white text-lg font-bold"
            style={{ backgroundColor: project.color }}
          >
            W
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                {project.name}
              </h1>
              {project.isPinned && (
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              )}
            </div>
            <p className="text-zinc-500 mt-0.5">
              {project.description}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Zap className="h-4 w-4 mr-1" />
            Generate Status
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Add Task
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="board">
              <LayoutGrid className="h-4 w-4 mr-1" />
              Board
            </TabsTrigger>
            <TabsTrigger value="list">
              <List className="h-4 w-4 mr-1" />
              List
            </TabsTrigger>
            <TabsTrigger value="timeline">
              <CalendarIcon className="h-4 w-4 mr-1" />
              Timeline
            </TabsTrigger>
            <TabsTrigger value="docs">
              <FileText className="h-4 w-4 mr-1" />
              Docs
            </TabsTrigger>
            <TabsTrigger value="people">
              <Users className="h-4 w-4 mr-1" />
              People
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="h-4 w-4 mr-1" />
              Settings
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-1" />
              Filter
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Group: Status
                  <ChevronDown className="h-3 w-3 ml-1" />
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
                  {project.brief}
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
                    <span className="font-medium">12 / 26</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-500">In Progress</span>
                    <span className="font-medium">5</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-500">Blocked</span>
                    <span className="font-medium text-red-500">1</span>
                  </div>
                </div>
              </div>

              {/* Team */}
              <div className="p-4 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
                <h3 className="font-medium mb-3">Team</h3>
                <div className="space-y-2">
                  {['Sarah Chen', 'Mike Johnson', 'Alex Kim', 'Lisa Park'].map((name) => (
                    <div key={name} className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-[10px]">
                          {name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{name}</span>
                    </div>
                  ))}
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
