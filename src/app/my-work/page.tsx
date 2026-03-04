'use client';

import { cn } from '@/lib/utils';
import { Zap, TrendingUp, TrendingDown } from 'lucide-react';
import { DragDropContext } from '@hello-pangea/dnd';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useFocusModeStore } from '@/lib/stores/foco-store';
import { TaskFilterPopover } from '@/components/filters/task-filter-popover';
import { PageShell } from '@/components/layout/page-shell';
import { PageHeader } from '@/components/layout/page-header';
import { WorkItemCard } from './components/work-item-card';
import { KanbanColumn } from './components/kanban-column';
import { DoneColumn } from './components/done-column';
import { BatchToolbar } from './components/batch-toolbar';
import { FocusMode } from './components/focus-mode';
import { useMyWork, sectionConfig } from './use-my-work';

type SectionType = 'now' | 'next' | 'later' | 'waiting' | 'done';

export default function MyWorkPage() {
  const { isActive, currentWorkItem, activate, deactivate } = useFocusModeStore();
  const {
    isLoading,
    filters,
    setFilters,
    isPlanning,
    projects,
    selectedProjectId,
    selectedIds,
    velocityStats,
    fetchWorkItems,
    handleProjectChange,
    handlePlanMyDay,
    handleQuickAdd,
    handleMoveToSection,
    handleDragEnd,
    handleRemoveFromMyWork,
    handleToggleSelect,
    handleClearSelection,
    handleBatchComplete,
    handleBatchMove,
    getItemsBySection,
  } = useMyWork();

  if (isActive && currentWorkItem) {
    return <FocusMode item={currentWorkItem} onExit={deactivate} onRefresh={fetchWorkItems} />;
  }

  const openItems = getItemsBySection('now').length
    + getItemsBySection('next').length
    + getItemsBySection('later').length
    + getItemsBySection('waiting').length;
  const blockedCount = getItemsBySection('waiting').length;

  if (isLoading) {
    return (
      <PageShell maxWidth="4xl">
        <PageHeader title="Execution Board" subtitle="Loading tasks..." />
        <div className="hidden md:flex gap-4 mt-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex-1 min-w-[220px] space-y-3">
              <div className="h-5 w-20 bg-zinc-100 dark:bg-zinc-800 animate-pulse rounded" />
              {[...Array(3)].map((_, j) => (
                <div key={j} className="h-16 w-full bg-zinc-50 dark:bg-zinc-900 animate-pulse rounded-lg" />
              ))}
            </div>
          ))}
        </div>
        <div className="md:hidden space-y-8 mt-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-4">
              <div className="h-6 w-24 bg-zinc-100 dark:bg-zinc-800 animate-pulse rounded" />
              <div className="space-y-2">
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="h-12 w-full bg-zinc-50 dark:bg-zinc-900 animate-pulse rounded" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Execution Board"
        subtitle={`${openItems} open • ${getItemsBySection('done').length} completed`}
        primaryAction={
          <div className="flex items-center gap-2">
            <Select value={selectedProjectId} onValueChange={handleProjectChange}>
              <SelectTrigger className="h-8 w-[160px] text-xs">
                <SelectValue placeholder="Project..." />
              </SelectTrigger>
              <SelectContent>
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <TaskFilterPopover filters={filters} onFiltersChange={setFilters} />
            {openItems > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handlePlanMyDay}
                disabled={isPlanning}
              >
                <Zap className="h-4 w-4" />
                {isPlanning ? 'Planning...' : 'Plan my day'}
              </Button>
            )}
          </div>
        }
      />

      <div className="flex items-center gap-3 text-sm text-zinc-500 mb-4 px-1">
        <span className="flex items-center gap-1.5">
          <strong className="text-zinc-900 dark:text-zinc-100">
            {velocityStats.completedThisWeek}
          </strong>{' '}
          this week
          {velocityStats.completedThisWeek > velocityStats.lastWeek ? (
            <span className="flex items-center gap-0.5 text-emerald-500 text-xs">
              <TrendingUp className="h-3 w-3" />
              {velocityStats.completedThisWeek - velocityStats.lastWeek}
            </span>
          ) : velocityStats.completedThisWeek < velocityStats.lastWeek ? (
            <span className="flex items-center gap-0.5 text-rose-500 text-xs">
              <TrendingDown className="h-3 w-3" />
              {velocityStats.lastWeek - velocityStats.completedThisWeek}
            </span>
          ) : (
            <span className="text-zinc-400 text-xs">→ same</span>
          )}
        </span>
        <span className="text-zinc-300 dark:text-zinc-600">·</span>
        <span className="flex items-center gap-1.5">
          <strong className="text-zinc-900 dark:text-zinc-100">{blockedCount}</strong> blocked
        </span>
      </div>

      <div className="hidden md:block -mx-6 -mb-6 overflow-x-auto">
        <div className="px-6 pb-6">
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="flex gap-4">
              {(['now', 'next', 'later', 'waiting'] as const).map(section => (
                <KanbanColumn
                  key={section}
                  section={section}
                  items={getItemsBySection(section)}
                  onStartFocus={activate}
                  onQuickAdd={handleQuickAdd}
                  onMoveToSection={handleMoveToSection}
                  onRemoveFromMyWork={handleRemoveFromMyWork}
                  selectedIds={selectedIds}
                  onToggleSelect={handleToggleSelect}
                />
              ))}
              <DoneColumn
                items={getItemsBySection('done')}
                onStartFocus={activate}
                onMoveToSection={handleMoveToSection}
                onRemoveFromMyWork={handleRemoveFromMyWork}
                selectedIds={selectedIds}
                onToggleSelect={handleToggleSelect}
              />
            </div>
          </DragDropContext>
        </div>
      </div>

      <div className="md:hidden space-y-6">
        {(['now', 'next', 'later', 'waiting', 'done'] as SectionType[]).map(section => {
          const sectionItems = getItemsBySection(section);
          const config = sectionConfig[section];
          return (
            <div key={section}>
              <div className="flex items-center gap-2 mb-3">
                <div className={cn('h-2.5 w-2.5 rounded-full', config.badgeColor)} />
                <h3 className="font-semibold text-sm">{config.label}</h3>
                <Badge variant="secondary" className="text-xs ml-auto">{sectionItems.length}</Badge>
              </div>
              <div className="space-y-2">
                {sectionItems.map(item => (
                  <WorkItemCard
                    key={item.id}
                    item={item}
                    onStartFocus={activate}
                    onMoveToSection={handleMoveToSection}
                    onRemoveFromMyWork={handleRemoveFromMyWork}
                    isReadOnly={section === 'done'}
                    isSelected={selectedIds.has(item.id)}
                    onToggleSelect={handleToggleSelect}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <BatchToolbar
        selectedIds={selectedIds}
        onClear={handleClearSelection}
        onBatchComplete={handleBatchComplete}
        onBatchMove={handleBatchMove}
      />
    </PageShell>
  );
}
