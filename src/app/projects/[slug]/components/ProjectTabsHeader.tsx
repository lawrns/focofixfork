'use client';

import {
  LayoutGrid,
  List,
  Calendar as CalendarIcon,
  FileText,
  Users,
  Settings,
  Filter,
  MoreHorizontal,
  ChevronDown,
  Zap,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface ProjectTabsHeaderProps {
  activeRuns: number;
  groupBy: 'status' | 'assignee' | 'priority' | 'none';
  onGroupChange: (group: 'status' | 'assignee' | 'priority' | 'none') => void;
}

const GROUP_LABELS: Record<string, string> = {
  status: 'Group: Status',
  assignee: 'Group: Assignee',
  priority: 'Group: Priority',
  none: 'Group: None',
};

export function ProjectTabsHeader({ activeRuns, groupBy, onGroupChange }: ProjectTabsHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 md:gap-0 mb-4">
      <div className="relative w-full md:w-auto">
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent pointer-events-none z-1 md:hidden" />
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none z-1 md:hidden" />
        <TabsList className="w-full md:w-auto overflow-x-auto scrollbar-hide -mx-6 px-6 md:mx-0 md:px-0" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <TabsTrigger value="overview" className="px-2 md:px-3 whitespace-nowrap flex-shrink-0 min-h-[44px]">Overview</TabsTrigger>
          <TabsTrigger value="board" className="gap-1 md:gap-2 px-2 md:px-3 whitespace-nowrap flex-shrink-0 min-h-[44px]">
            <LayoutGrid className="h-3.5 w-3.5 md:h-4 md:w-4" /><span>Board</span>
          </TabsTrigger>
          <TabsTrigger value="list" className="gap-1 md:gap-2 px-2 md:px-3 whitespace-nowrap flex-shrink-0 min-h-[44px]">
            <List className="h-3.5 w-3.5 md:h-4 md:w-4" /><span>List</span>
          </TabsTrigger>
          <TabsTrigger value="timeline" className="gap-1 md:gap-2 px-2 md:px-3 whitespace-nowrap flex-shrink-0 min-h-[44px]">
            <CalendarIcon className="h-3.5 w-3.5 md:h-4 md:w-4" /><span>Timeline</span>
          </TabsTrigger>
          <TabsTrigger value="docs" className="gap-1 md:gap-2 px-2 md:px-3 whitespace-nowrap flex-shrink-0 min-h-[44px]">
            <FileText className="h-3.5 w-3.5 md:h-4 md:w-4" /><span>Docs</span>
          </TabsTrigger>
          <TabsTrigger value="people" className="gap-1 md:gap-2 px-2 md:px-3 whitespace-nowrap flex-shrink-0 min-h-[44px]">
            <Users className="h-3.5 w-3.5 md:h-4 md:w-4" /><span>People</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-1 md:gap-2 px-2 md:px-3 whitespace-nowrap flex-shrink-0 min-h-[44px]">
            <Settings className="h-3.5 w-3.5 md:h-4 md:w-4" /><span>Settings</span>
          </TabsTrigger>
          <TabsTrigger value="fleet" className="gap-1 md:gap-2 px-2 md:px-3 whitespace-nowrap flex-shrink-0 min-h-[44px]">
            <Zap className="h-3.5 w-3.5 md:h-4 md:w-4" /><span>Fleet</span>
            {activeRuns > 0 && (
              <span className="ml-1 relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="insights" className="gap-1 md:gap-2 px-2 md:px-3 whitespace-nowrap flex-shrink-0 min-h-[44px]">
            <AlertTriangle className="h-3.5 w-3.5 md:h-4 md:w-4" /><span>Insights</span>
          </TabsTrigger>
        </TabsList>
      </div>

      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="md:hidden min-h-[44px] flex-1">
              <Filter className="h-4 w-4" /><span>Actions</span><ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => toast.info('Task filtering coming soon')}>
              <Filter className="h-4 w-4 mr-2" />Filter
            </DropdownMenuItem>
            {(['status', 'assignee', 'priority', 'none'] as const).map(g => (
              <DropdownMenuItem key={g} onClick={() => onGroupChange(g)}>Group: {g.charAt(0).toUpperCase() + g.slice(1)}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="hidden md:flex items-center gap-2">
          <Button variant="outline" size="sm" className="min-h-[44px]" onClick={() => toast.info('Task filtering coming soon')}>
            <Filter className="h-4 w-4" />Filter
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="min-h-[44px]">
                {GROUP_LABELS[groupBy]}<ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {(['status', 'assignee', 'priority', 'none'] as const).map(g => (
                <DropdownMenuItem key={g} onClick={() => onGroupChange(g)}>{g.charAt(0).toUpperCase() + g.slice(1)}</DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
