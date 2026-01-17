'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/use-auth';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Filter,
  Plus,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

interface TimelineItem {
  id: string;
  title: string;
  project: { name: string; color: string };
  type: 'milestone' | 'task';
  startDate: string;
  endDate: string;
  progress: number;
  status: 'on_track' | 'at_risk' | 'completed' | 'overdue';
  assignee?: string;
}

// Timeline items will be fetched from API

const statusColors = {
  on_track: 'bg-green-500',
  at_risk: 'bg-amber-500',
  completed: 'bg-blue-500',
  overdue: 'bg-red-500',
};

const statusLabels = {
  on_track: 'On Track',
  at_risk: 'At Risk',
  completed: 'Completed',
  overdue: 'Overdue',
};

// Generate dates for January 2026
const generateDates = () => {
  const dates = [];
  for (let i = 1; i <= 31; i++) {
    dates.push(new Date(2026, 0, i));
  }
  return dates;
};

const dates = generateDates();
const today = new Date(2026, 0, 10); // Jan 10, 2026 for demo

function TimelineBar({ item, dates }: { item: TimelineItem; dates: Date[] }) {
  const startDate = new Date(item.startDate);
  const endDate = new Date(item.endDate);
  const firstDate = dates[0];
  const lastDate = dates[dates.length - 1];
  
  const totalDays = (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24);
  const startOffset = Math.max(0, (startDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
  const duration = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
  
  const leftPercent = (startOffset / totalDays) * 100;
  const widthPercent = Math.min((duration / totalDays) * 100, 100 - leftPercent);

  return (
    <div
      className={cn(
        'absolute top-1/2 -translate-y-1/2 h-6 rounded-full cursor-pointer group',
        'hover:shadow-md transition-shadow'
      )}
      style={{
        left: `${leftPercent}%`,
        width: `${widthPercent}%`,
        backgroundColor: item.project.color,
        opacity: item.type === 'milestone' ? 1 : 0.7,
      }}
    >
      {/* Progress indicator */}
      <div
        className="absolute inset-y-0 left-0 rounded-full bg-white/30"
        style={{ width: `${item.progress}%` }}
      />
      
      {/* Label */}
      <div className="absolute inset-0 flex items-center px-2 overflow-hidden">
        <span className="text-[10px] font-medium text-white truncate">
          {item.title}
        </span>
      </div>

      {/* Tooltip */}
      <div className="absolute bottom-full left-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
        <div className="bg-zinc-900 text-white text-xs rounded-lg p-2 shadow-lg whitespace-nowrap">
          <div className="font-medium">{item.title}</div>
          <div className="text-zinc-400 mt-1">
            {new Date(item.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - 
            {new Date(item.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Badge className={cn('h-4 text-[10px]', statusColors[item.status])}>
              {statusLabels[item.status]}
            </Badge>
            <span>{item.progress}% complete</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function AISuggestionBanner({ onPreview, onDismiss }: { onPreview: () => void; onDismiss: () => void }) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss();
  };

  return (
    <div className="flex items-center gap-3 p-3 mb-6 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 rounded-lg border border-indigo-100 dark:border-indigo-900/50">
      <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/50 rounded">
        <Zap className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
      </div>
      <div className="flex-1">
        <p className="text-sm">
          <span className="font-medium text-zinc-900 dark:text-zinc-50">
            Mobile App v2 milestone is at risk
          </span>
          {' — '}
          <span className="text-zinc-600 dark:text-zinc-400">
            3 blocked tasks may delay Beta Release by 5 days. View auto-reschedule preview?
          </span>
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="text-[10px]">94% confident</Badge>
        <Button size="sm" variant="default" className="h-7" onClick={onPreview}>Preview</Button>
        <Button size="sm" variant="ghost" className="h-7" onClick={handleDismiss}>Dismiss</Button>
      </div>
    </div>
  );
}

export default function TimelinePage() {
  const { user } = useAuth();
  const [view, setView] = useState<'month' | 'quarter'>('month');
  const [currentMonth, setCurrentMonth] = useState('January 2026');
  const [currentMonthIndex, setCurrentMonthIndex] = useState(0); // 0 = Jan 2026
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showFilter, setShowFilter] = useState(false);

  // Fetch timeline data from API
  useEffect(() => {
    const fetchTimelineData = async () => {
      if (!user) return;
      
      try {
        // Fetch milestones and work items
        const [milestonesRes, projectsRes] = await Promise.all([
          fetch('/api/milestones', { credentials: 'include' }),
          fetch('/api/projects', { credentials: 'include' })
        ]);
        
        const items: TimelineItem[] = [];
        
        if (milestonesRes.ok) {
          const milestonesData = await milestonesRes.json();
          const milestones = milestonesData.data || [];
          milestones.forEach((m: any) => {
            if (m.start_date && m.end_date) {
              items.push({
                id: m.id,
                title: m.title,
                project: { name: m.project?.name || 'Unknown', color: m.project?.color || '#6366F1' },
                type: 'milestone',
                startDate: m.start_date,
                endDate: m.end_date,
                progress: m.progress_percentage || 0,
                status: m.status === 'completed' ? 'completed' : m.status === 'at_risk' ? 'at_risk' : 'on_track',
              });
            }
          });
        }
        
        setTimelineItems(items);
      } catch (error) {
        console.error('Failed to fetch timeline data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTimelineData();
  }, [user]);

  // Group items by project
  const groupedItems = timelineItems.reduce((acc, item) => {
    const projectName = item.project.name;
    if (!acc[projectName]) {
      acc[projectName] = { color: item.project.color, items: [] };
    }
    acc[projectName].items.push(item);
    return acc;
  }, {} as Record<string, { color: string; items: TimelineItem[] }>);

  const months = [
    'January 2026', 'February 2026', 'March 2026', 'April 2026',
    'May 2026', 'June 2026', 'July 2026', 'August 2026',
    'September 2026', 'October 2026', 'November 2026', 'December 2026'
  ];

  const handlePrevMonth = () => {
    if (currentMonthIndex > 0) {
      setCurrentMonthIndex(prev => prev - 1);
      setCurrentMonth(months[currentMonthIndex - 1]);
    } else {
      toast.info('Already at the beginning of 2026');
    }
  };

  const handleNextMonth = () => {
    if (currentMonthIndex < months.length - 1) {
      setCurrentMonthIndex(prev => prev + 1);
      setCurrentMonth(months[currentMonthIndex + 1]);
    } else {
      toast.info('Already at the end of 2026');
    }
  };

  const handleGoToToday = () => {
    setCurrentMonthIndex(0);
    setCurrentMonth('January 2026');
    toast.success('Jumped to today');
  };

  const handleFilter = () => {
    setShowFilter(!showFilter);
    toast.info(showFilter ? 'Filter closed' : 'Filter options coming soon');
  };

  const handleAIPreview = () => {
    toast.loading('Generating reschedule preview...', { id: 'ai-preview' });
    setTimeout(() => {
      toast.success('Preview generated - see suggested timeline changes', { id: 'ai-preview' });
    }, 1500);
  };

  const handleAIDismiss = () => {
    toast.success('Suggestion dismissed');
  };

  // Show empty state if no timeline items
  if (!isLoading && timelineItems.length === 0) {
    return (
      <div className="max-w-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
              Timeline
            </h1>
            <p className="text-zinc-500 mt-1">
              Visualize project schedules and milestones
            </p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
          <Calendar className="h-12 w-12 text-zinc-300 dark:text-zinc-600 mb-4" />
          <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-50 mb-2">
            No timeline items yet
          </h3>
          <p className="text-zinc-500 text-center max-w-md mb-4">
            Create milestones in your projects to see them visualized here on the timeline.
          </p>
          <Button onClick={() => window.location.href = '/projects'}>
            <Plus className="h-4 w-4 mr-2" />
            Go to Projects
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-full">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            Timeline
          </h1>
          <p className="text-zinc-500 mt-1">
            Visualize project schedules and milestones
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleFilter}>
            <Filter className="h-4 w-4" />
            Filter
          </Button>
          <Select value={view} onValueChange={(v) => setView(v as any)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Month</SelectItem>
              <SelectItem value="quarter">Quarter</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Only show AI suggestion if there are items */}
      {timelineItems.length > 0 && <AISuggestionBanner onPreview={handleAIPreview} onDismiss={handleAIDismiss} />}

      {/* Timeline Navigation */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8 min-h-[44px] min-w-[44px] [@media(pointer:fine)]:min-h-0 [@media(pointer:fine)]:min-w-0" onClick={handlePrevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-medium">{currentMonth}</span>
          <Button variant="outline" size="icon" className="h-8 w-8 min-h-[44px] min-w-[44px] [@media(pointer:fine)]:min-h-0 [@media(pointer:fine)]:min-w-0" onClick={handleNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={handleGoToToday}>
          <Calendar className="h-4 w-4" />
          Today
        </Button>
      </div>

      {/* Timeline Grid */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        {/* Date Header */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800">
          <div className="w-48 shrink-0 p-3 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
            <span className="text-xs font-medium text-zinc-500 uppercase">Project</span>
          </div>
          <div className="flex-1 flex">
            {dates.map((date, i) => {
              const isToday = date.toDateString() === today.toDateString();
              const isWeekend = date.getDay() === 0 || date.getDay() === 6;
              return (
                <div
                  key={i}
                  className={cn(
                    'flex-1 min-w-[30px] text-center py-2 border-r border-zinc-100 dark:border-zinc-800 last:border-r-0',
                    isWeekend && 'bg-zinc-50 dark:bg-zinc-800/30',
                    isToday && 'bg-indigo-50 dark:bg-indigo-950/30'
                  )}
                >
                  <div className="text-[10px] text-zinc-400">
                    {date.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0)}
                  </div>
                  <div className={cn(
                    'text-xs font-medium',
                    isToday ? 'text-indigo-600' : 'text-zinc-600 dark:text-zinc-300'
                  )}>
                    {date.getDate()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Timeline Rows */}
        {Object.entries(groupedItems).map(([projectName, { color, items }]) => (
          <div key={projectName}>
            {/* Project Header */}
            <div className="flex border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
              <div className="w-48 shrink-0 p-3 border-r border-zinc-200 dark:border-zinc-800">
                <Link 
                  href="/projects/website-redesign" 
                  className="flex items-center gap-2 font-medium text-sm hover:text-indigo-600 transition-colors"
                >
                  <div className="h-3 w-3 rounded" style={{ backgroundColor: color }} />
                  {projectName}
                </Link>
              </div>
              <div className="flex-1 relative">
                {/* Today line */}
                <div 
                  className="absolute top-0 bottom-0 w-0.5 bg-indigo-500 z-10"
                  style={{ left: `${((today.getDate() - 1) / 31) * 100}%` }}
                />
              </div>
            </div>

            {/* Items */}
            {items.map((item) => (
              <div key={item.id} className="flex border-b border-zinc-100 dark:border-zinc-800 last:border-b-0">
                <div className="w-48 shrink-0 p-3 border-r border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    {item.type === 'milestone' ? (
                      <div className="h-4 w-4 rotate-45 border-2 shrink-0" style={{ borderColor: color }} />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-zinc-400" />
                    )}
                    <span className="text-sm truncate">{item.title}</span>
                  </div>
                  {item.assignee && (
                    <div className="text-xs text-zinc-400 mt-1 ml-6">{item.assignee}</div>
                  )}
                </div>
                <div className="flex-1 relative h-14">
                  <TimelineBar item={item} dates={dates} />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 mt-4 text-xs text-zinc-500">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rotate-45 border-2 border-zinc-400" />
          <span>Milestone</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-8 rounded-full bg-zinc-300" />
          <span>Task</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-0.5 bg-indigo-500" />
          <span>Today</span>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-4">
          {Object.entries(statusLabels).map(([key, label]) => (
            <div key={key} className="flex items-center gap-1">
              <div className={cn('h-2 w-2 rounded-full', statusColors[key as keyof typeof statusColors])} />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
