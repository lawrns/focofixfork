'use client';

import { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useUIPreferencesStore } from '@/lib/stores/foco-store';
import {
  Play,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Zap,
  RefreshCw,
  MoreHorizontal,
  Calendar,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import type { WorkItem, PriorityLevel } from '@/types/foco';

// Mock data for demo
const todayTasks: WorkItem[] = [
  {
    id: '1',
    workspace_id: '1',
    project_id: '1',
    type: 'task',
    title: 'Design homepage mockups',
    status: 'in_progress',
    priority: 'high',
    due_date: '2026-01-10',
    position: 0,
    created_at: '',
    updated_at: '',
    ai_context_sources: [],
    metadata: {},
    project: { id: '1', name: 'Website Redesign', color: '#6366F1' } as any,
  },
  {
    id: '2',
    workspace_id: '1',
    project_id: '2',
    type: 'bug',
    title: 'Fix navigation dropdown on Safari',
    status: 'review',
    priority: 'urgent',
    due_date: '2026-01-10',
    position: 1,
    created_at: '',
    updated_at: '',
    ai_context_sources: [],
    metadata: {},
    project: { id: '2', name: 'Mobile App v2', color: '#10B981' } as any,
  },
  {
    id: '3',
    workspace_id: '1',
    project_id: '1',
    type: 'task',
    title: 'Review PR for checkout flow',
    status: 'next',
    priority: 'medium',
    due_date: '2026-01-10',
    position: 2,
    created_at: '',
    updated_at: '',
    ai_context_sources: [],
    metadata: {},
    project: { id: '1', name: 'Website Redesign', color: '#6366F1' } as any,
  },
];

const projectPulse = [
  { id: '1', name: 'Website Redesign', progress: 45, status: 'on_track', tasksCompleted: 12, totalTasks: 26 },
  { id: '2', name: 'Mobile App v2', progress: 68, status: 'at_risk', tasksCompleted: 22, totalTasks: 32 },
  { id: '3', name: 'API Platform', progress: 23, status: 'on_track', tasksCompleted: 7, totalTasks: 30 },
];

const aiSuggestions = [
  {
    id: '1',
    title: 'Team capacity is 92% next week',
    description: 'Consider moving "Design Review" by 2 days to balance workload',
    confidence: 0.89,
    type: 'capacity',
  },
  {
    id: '2',
    title: 'Mobile App v2 milestone at risk',
    description: '3 tasks are blocked and need attention before the Feb 1 deadline',
    confidence: 0.94,
    type: 'risk',
  },
];

const priorityColors: Record<PriorityLevel, string> = {
  urgent: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-blue-500',
  low: 'bg-zinc-400',
  none: 'bg-zinc-300',
};

function PriorityDot({ priority }: { priority: PriorityLevel }) {
  return (
    <div className={cn('h-2 w-2 rounded-full', priorityColors[priority])} />
  );
}

function TodayStack() {
  const { density } = useUIPreferencesStore();
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Calendar className="h-4 w-4 text-zinc-500" />
            Today
          </CardTitle>
          <Button variant="ghost" size="sm" className="h-8">
            <Play className="h-3.5 w-3.5 mr-1" />
            Start Focus
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        {todayTasks.map((task) => (
          <Link
            key={task.id}
            href={`/app/tasks/${task.id}`}
            className={cn(
              'flex items-center gap-3 p-3 -mx-2 rounded-lg',
              'hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors',
              'group'
            )}
          >
            <PriorityDot priority={task.priority} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-zinc-900 dark:text-zinc-50 truncate">
                  {task.title}
                </span>
                {task.type === 'bug' && (
                  <Badge variant="outline" className="h-5 text-[10px] text-red-600 border-red-200">
                    Bug
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <span 
                  className="flex items-center gap-1"
                  style={{ color: task.project?.color }}
                >
                  <div 
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: task.project?.color }}
                  />
                  {task.project?.name}
                </span>
                <span>•</span>
                <span className="capitalize">{task.status.replace('_', ' ')}</span>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
        ))}
        
        <div className="pt-2">
          <Button variant="ghost" size="sm" className="w-full justify-start text-zinc-500">
            <Clock className="h-3.5 w-3.5 mr-2" />
            View all due today (8 items)
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AIDailyBrief() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1500);
  };

  return (
    <Card className="border-indigo-100 dark:border-indigo-900/50 bg-gradient-to-br from-indigo-50/50 to-white dark:from-indigo-950/20 dark:to-zinc-950">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-500" />
            AI Daily Brief
          </CardTitle>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={handleRefresh}
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          Good morning! You have <strong>8 tasks</strong> due today, <strong>2 blocked items</strong> need attention, 
          and <strong>Mobile App v2</strong> milestone is at risk.
        </p>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Due Today', value: 8, icon: Calendar },
            { label: 'In Progress', value: 5, icon: Play },
            { label: 'Blocked', value: 2, icon: AlertTriangle, highlight: true },
            { label: 'Completed', value: 3, icon: CheckCircle2 },
          ].map((stat) => (
            <div 
              key={stat.label}
              className={cn(
                'p-2 rounded-lg text-center',
                stat.highlight 
                  ? 'bg-amber-50 dark:bg-amber-950/30' 
                  : 'bg-zinc-50 dark:bg-zinc-800/50'
              )}
            >
              <div className={cn(
                'text-lg font-semibold',
                stat.highlight ? 'text-amber-600' : 'text-zinc-900 dark:text-zinc-50'
              )}>
                {stat.value}
              </div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* AI Suggestions */}
        <div className="space-y-2">
          <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
            Suggestions
          </div>
          {aiSuggestions.map((suggestion) => (
            <div
              key={suggestion.id}
              className={cn(
                'p-3 rounded-lg border',
                suggestion.type === 'risk' 
                  ? 'bg-amber-50/50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800/50'
                  : 'bg-white border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800'
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                    {suggestion.title}
                  </div>
                  <div className="text-xs text-zinc-500 mt-0.5">
                    {suggestion.description}
                  </div>
                </div>
                <Badge 
                  variant="secondary" 
                  className="text-[10px] shrink-0"
                >
                  {Math.round(suggestion.confidence * 100)}% confident
                </Badge>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Button size="sm" variant="default" className="h-7 text-xs">
                  Apply
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs">
                  Explain why
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ProjectPulse() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-zinc-500" />
            Project Pulse
          </CardTitle>
          <Button variant="ghost" size="sm" className="h-8" asChild>
            <Link href="/app/projects">
              View all
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {projectPulse.map((project) => (
          <Link
            key={project.id}
            href={`/app/projects/${project.id}`}
            className="block group"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-medium text-sm text-zinc-900 dark:text-zinc-50 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                {project.name}
              </span>
              <div className="flex items-center gap-2">
                {project.status === 'at_risk' && (
                  <Badge variant="outline" className="h-5 text-[10px] text-amber-600 border-amber-200 bg-amber-50">
                    At Risk
                  </Badge>
                )}
                <span className="text-xs text-zinc-500">
                  {project.tasksCompleted}/{project.totalTasks}
                </span>
              </div>
            </div>
            <Progress 
              value={project.progress} 
              className={cn(
                'h-1.5',
                project.status === 'at_risk' && '[&>div]:bg-amber-500'
              )}
            />
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}

function RecentActivity() {
  const activities = [
    { id: '1', user: 'Sarah', action: 'completed', target: 'Create wireframes', time: '2m ago', avatar: 'S' },
    { id: '2', user: 'Mike', action: 'commented on', target: 'API Documentation', time: '15m ago', avatar: 'M' },
    { id: '3', user: 'You', action: 'moved', target: 'Homepage mockups', extra: 'to In Progress', time: '1h ago', avatar: 'Y' },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Users className="h-4 w-4 text-zinc-500" />
            Team Activity
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-start gap-3">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="text-xs">{activity.avatar}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm">
                <span className="font-medium">{activity.user}</span>
                {' '}{activity.action}{' '}
                <span className="font-medium">{activity.target}</span>
                {activity.extra && <span className="text-zinc-500">{' '}{activity.extra}</span>}
              </p>
              <p className="text-xs text-zinc-500">{activity.time}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default function HomePage() {
  return (
    <div className="max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Good morning, John
        </h1>
        <p className="text-zinc-500 mt-1">
          Here's what needs your attention today.
        </p>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Column - Today */}
        <div className="lg:col-span-3 space-y-6">
          <TodayStack />
          <ProjectPulse />
        </div>

        {/* Right Column - AI & Activity */}
        <div className="lg:col-span-2 space-y-6">
          <AIDailyBrief />
          <RecentActivity />
        </div>
      </div>
    </div>
  );
}
