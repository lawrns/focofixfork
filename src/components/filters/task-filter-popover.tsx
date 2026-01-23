'use client';

import { useState, useCallback } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Filter,
  X,
  ChevronDown,
  Calendar as CalendarIcon,
  User,
  Flag,
  Tag,
  Circle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TaskFilters {
  status: string[];
  priority: string[];
  assignee: string[];
  dueDate: {
    from?: Date;
    to?: Date;
    preset?: 'today' | 'week' | 'month' | 'overdue' | 'none';
  } | null;
  labels: string[];
}

interface TaskFilterPopoverProps {
  filters: TaskFilters;
  onFiltersChange: (filters: TaskFilters) => void;
  teamMembers?: { id: string; name: string; avatar?: string }[];
  labels?: { id: string; name: string; color: string }[];
  className?: string;
}

const statusOptions = [
  { value: 'backlog', label: 'Backlog', color: 'bg-zinc-400' },
  { value: 'todo', label: 'To Do', color: 'bg-slate-400' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-blue-500' },
  { value: 'review', label: 'Review', color: 'bg-amber-500' },
  { value: 'blocked', label: 'Blocked', color: 'bg-red-500' },
  { value: 'done', label: 'Done', color: 'bg-green-500' },
];

const priorityOptions = [
  { value: 'urgent', label: 'Urgent', color: 'bg-red-500' },
  { value: 'high', label: 'High', color: 'bg-orange-500' },
  { value: 'medium', label: 'Medium', color: 'bg-blue-500' },
  { value: 'low', label: 'Low', color: 'bg-zinc-400' },
  { value: 'none', label: 'None', color: 'bg-zinc-300' },
];

const dueDatePresets = [
  { value: 'today', label: 'Due today' },
  { value: 'week', label: 'Due this week' },
  { value: 'month', label: 'Due this month' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'none', label: 'No due date' },
];

export function TaskFilterPopover({
  filters,
  onFiltersChange,
  teamMembers = [],
  labels = [],
  className,
}: TaskFilterPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const activeFilterCount =
    filters.status.length +
    filters.priority.length +
    filters.assignee.length +
    (filters.dueDate ? 1 : 0) +
    filters.labels.length;

  const handleStatusChange = useCallback(
    (status: string, checked: boolean) => {
      const newStatus = checked
        ? [...filters.status, status]
        : filters.status.filter((s) => s !== status);
      onFiltersChange({ ...filters, status: newStatus });
    },
    [filters, onFiltersChange]
  );

  const handlePriorityChange = useCallback(
    (priority: string, checked: boolean) => {
      const newPriority = checked
        ? [...filters.priority, priority]
        : filters.priority.filter((p) => p !== priority);
      onFiltersChange({ ...filters, priority: newPriority });
    },
    [filters, onFiltersChange]
  );

  const handleAssigneeChange = useCallback(
    (assigneeId: string, checked: boolean) => {
      const newAssignee = checked
        ? [...filters.assignee, assigneeId]
        : filters.assignee.filter((a) => a !== assigneeId);
      onFiltersChange({ ...filters, assignee: newAssignee });
    },
    [filters, onFiltersChange]
  );

  const handleDueDatePreset = useCallback(
    (preset: string) => {
      if (filters.dueDate?.preset === preset) {
        onFiltersChange({ ...filters, dueDate: null });
      } else {
        onFiltersChange({
          ...filters,
          dueDate: { preset: preset as 'today' | 'week' | 'month' | 'overdue' | 'none' },
        });
      }
    },
    [filters, onFiltersChange]
  );

  const handleLabelChange = useCallback(
    (labelId: string, checked: boolean) => {
      const newLabels = checked
        ? [...filters.labels, labelId]
        : filters.labels.filter((l) => l !== labelId);
      onFiltersChange({ ...filters, labels: newLabels });
    },
    [filters, onFiltersChange]
  );

  const clearAllFilters = useCallback(() => {
    onFiltersChange({
      status: [],
      priority: [],
      assignee: [],
      dueDate: null,
      labels: [],
    });
  }, [onFiltersChange]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn('gap-2', className)}
        >
          <Filter className="h-4 w-4" />
          Filter
          {activeFilterCount > 0 && (
            <Badge
              variant="secondary"
              className="h-5 min-w-[20px] px-1.5 text-xs"
            >
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
          <span className="font-medium text-sm">Filters</span>
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="h-7 text-xs text-zinc-500 hover:text-zinc-900"
            >
              Clear all
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-[400px]">
          <div className="p-2">
            {/* Status Filter */}
            <div className="mb-2">
              <button
                className="w-full flex items-center justify-between px-2 py-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                onClick={() =>
                  setActiveSection(activeSection === 'status' ? null : 'status')
                }
              >
                <div className="flex items-center gap-2">
                  <Circle className="h-4 w-4 text-zinc-500" />
                  <span className="text-sm font-medium">Status</span>
                </div>
                <div className="flex items-center gap-2">
                  {filters.status.length > 0 && (
                    <Badge variant="secondary" className="h-5 text-xs">
                      {filters.status.length}
                    </Badge>
                  )}
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 text-zinc-400 transition-transform',
                      activeSection === 'status' && 'rotate-180'
                    )}
                  />
                </div>
              </button>
              {activeSection === 'status' && (
                <div className="pl-8 pr-2 py-2 space-y-1">
                  {statusOptions.map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center gap-2 py-1.5 cursor-pointer"
                    >
                      <Checkbox
                        checked={filters.status.includes(option.value)}
                        onCheckedChange={(checked) =>
                          handleStatusChange(option.value, checked as boolean)
                        }
                      />
                      <div
                        className={cn('h-2 w-2 rounded-full', option.color)}
                      />
                      <span className="text-sm">{option.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Priority Filter */}
            <div className="mb-2">
              <button
                className="w-full flex items-center justify-between px-2 py-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                onClick={() =>
                  setActiveSection(
                    activeSection === 'priority' ? null : 'priority'
                  )
                }
              >
                <div className="flex items-center gap-2">
                  <Flag className="h-4 w-4 text-zinc-500" />
                  <span className="text-sm font-medium">Priority</span>
                </div>
                <div className="flex items-center gap-2">
                  {filters.priority.length > 0 && (
                    <Badge variant="secondary" className="h-5 text-xs">
                      {filters.priority.length}
                    </Badge>
                  )}
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 text-zinc-400 transition-transform',
                      activeSection === 'priority' && 'rotate-180'
                    )}
                  />
                </div>
              </button>
              {activeSection === 'priority' && (
                <div className="pl-8 pr-2 py-2 space-y-1">
                  {priorityOptions.map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center gap-2 py-1.5 cursor-pointer"
                    >
                      <Checkbox
                        checked={filters.priority.includes(option.value)}
                        onCheckedChange={(checked) =>
                          handlePriorityChange(option.value, checked as boolean)
                        }
                      />
                      <div
                        className={cn('h-2 w-2 rounded-full', option.color)}
                      />
                      <span className="text-sm">{option.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Assignee Filter */}
            <div className="mb-2">
              <button
                className="w-full flex items-center justify-between px-2 py-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                onClick={() =>
                  setActiveSection(
                    activeSection === 'assignee' ? null : 'assignee'
                  )
                }
              >
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-zinc-500" />
                  <span className="text-sm font-medium">Assignee</span>
                </div>
                <div className="flex items-center gap-2">
                  {filters.assignee.length > 0 && (
                    <Badge variant="secondary" className="h-5 text-xs">
                      {filters.assignee.length}
                    </Badge>
                  )}
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 text-zinc-400 transition-transform',
                      activeSection === 'assignee' && 'rotate-180'
                    )}
                  />
                </div>
              </button>
              {activeSection === 'assignee' && (
                <div className="pl-8 pr-2 py-2 space-y-1">
                  <label className="flex items-center gap-2 py-1.5 cursor-pointer">
                    <Checkbox
                      checked={filters.assignee.includes('unassigned')}
                      onCheckedChange={(checked) =>
                        handleAssigneeChange('unassigned', checked as boolean)
                      }
                    />
                    <span className="text-sm text-zinc-500">Unassigned</span>
                  </label>
                  {teamMembers.map((member) => (
                    <label
                      key={member.id}
                      className="flex items-center gap-2 py-1.5 cursor-pointer"
                    >
                      <Checkbox
                        checked={filters.assignee.includes(member.id)}
                        onCheckedChange={(checked) =>
                          handleAssigneeChange(member.id, checked as boolean)
                        }
                      />
                      <span className="text-sm">{member.name}</span>
                    </label>
                  ))}
                  {teamMembers.length === 0 && (
                    <p className="text-xs text-zinc-400 py-2">
                      No team members found
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Due Date Filter */}
            <div className="mb-2">
              <button
                className="w-full flex items-center justify-between px-2 py-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                onClick={() =>
                  setActiveSection(
                    activeSection === 'dueDate' ? null : 'dueDate'
                  )
                }
              >
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-zinc-500" />
                  <span className="text-sm font-medium">Due Date</span>
                </div>
                <div className="flex items-center gap-2">
                  {filters.dueDate && (
                    <Badge variant="secondary" className="h-5 text-xs">
                      1
                    </Badge>
                  )}
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 text-zinc-400 transition-transform',
                      activeSection === 'dueDate' && 'rotate-180'
                    )}
                  />
                </div>
              </button>
              {activeSection === 'dueDate' && (
                <div className="pl-8 pr-2 py-2 space-y-1">
                  {dueDatePresets.map((preset) => (
                    <button
                      key={preset.value}
                      onClick={() => handleDueDatePreset(preset.value)}
                      className={cn(
                        'w-full text-left px-2 py-1.5 rounded text-sm transition-colors',
                        filters.dueDate?.preset === preset.value
                          ? 'bg-indigo-100 text-indigo-900 dark:bg-indigo-900/30 dark:text-indigo-100'
                          : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
                      )}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Labels Filter */}
            {labels.length > 0 && (
              <div className="mb-2">
                <button
                  className="w-full flex items-center justify-between px-2 py-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  onClick={() =>
                    setActiveSection(
                      activeSection === 'labels' ? null : 'labels'
                    )
                  }
                >
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-zinc-500" />
                    <span className="text-sm font-medium">Labels</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {filters.labels.length > 0 && (
                      <Badge variant="secondary" className="h-5 text-xs">
                        {filters.labels.length}
                      </Badge>
                    )}
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 text-zinc-400 transition-transform',
                        activeSection === 'labels' && 'rotate-180'
                      )}
                    />
                  </div>
                </button>
                {activeSection === 'labels' && (
                  <div className="pl-8 pr-2 py-2 space-y-1">
                    {labels.map((label) => (
                      <label
                        key={label.id}
                        className="flex items-center gap-2 py-1.5 cursor-pointer"
                      >
                        <Checkbox
                          checked={filters.labels.includes(label.id)}
                          onCheckedChange={(checked) =>
                            handleLabelChange(label.id, checked as boolean)
                          }
                        />
                        <div
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: label.color }}
                        />
                        <span className="text-sm">{label.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Active Filters Summary */}
        {activeFilterCount > 0 && (
          <div className="px-4 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
            <div className="flex flex-wrap gap-1">
              {filters.status.map((s) => (
                <Badge
                  key={s}
                  variant="secondary"
                  className="text-xs gap-1 pr-1"
                >
                  {statusOptions.find((o) => o.value === s)?.label}
                  <button
                    onClick={() => handleStatusChange(s, false)}
                    className="hover:bg-zinc-300 dark:hover:bg-zinc-700 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {filters.priority.map((p) => (
                <Badge
                  key={p}
                  variant="secondary"
                  className="text-xs gap-1 pr-1"
                >
                  {priorityOptions.find((o) => o.value === p)?.label}
                  <button
                    onClick={() => handlePriorityChange(p, false)}
                    className="hover:bg-zinc-300 dark:hover:bg-zinc-700 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {filters.dueDate && (
                <Badge variant="secondary" className="text-xs gap-1 pr-1">
                  {dueDatePresets.find(
                    (p) => p.value === filters.dueDate?.preset
                  )?.label || 'Custom date'}
                  <button
                    onClick={() =>
                      onFiltersChange({ ...filters, dueDate: null })
                    }
                    className="hover:bg-zinc-300 dark:hover:bg-zinc-700 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

export const defaultFilters: TaskFilters = {
  status: [],
  priority: [],
  assignee: [],
  dueDate: null,
  labels: [],
};
