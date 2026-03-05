'use client';

import {
  LayoutGrid,
  List,
  Calendar as CalendarIcon,
  Users,
  Settings,
  Zap,
  AlertTriangle,
  Workflow,
} from 'lucide-react';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ProjectTabsHeaderProps {
  activeRuns: number;
}

export function ProjectTabsHeader({ activeRuns }: ProjectTabsHeaderProps) {
  return (
    <div className="mb-4">
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
          <TabsTrigger value="workflows" className="gap-1 md:gap-2 px-2 md:px-3 whitespace-nowrap flex-shrink-0 min-h-[44px]">
            <Workflow className="h-3.5 w-3.5 md:h-4 md:w-4" /><span>Workflows</span>
          </TabsTrigger>
          <TabsTrigger value="insights" className="gap-1 md:gap-2 px-2 md:px-3 whitespace-nowrap flex-shrink-0 min-h-[44px]">
            <AlertTriangle className="h-3.5 w-3.5 md:h-4 md:w-4" /><span>Insights</span>
          </TabsTrigger>
        </TabsList>
      </div>
    </div>
  );
}
