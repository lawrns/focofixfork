'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Calendar as CalendarIcon,
  User,
  Clock,
  Plus,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { PriorityIndicator } from '@/features/tasks/components/priority-indicator';
import { statusOptions, priorityOptions } from './task-constants';
import type { WorkItem, WorkItemStatus, PriorityLevel } from '@/types/foco';

interface InspectorProps {
  item: WorkItem;
  onUpdate: (updates: Partial<WorkItem>) => Promise<void>;
  teamMembers: Array<{ id: string; full_name: string }>;
  inSheet?: boolean;
}

export function Inspector({ item, onUpdate, teamMembers, inSheet = false }: InspectorProps) {
  const [status, setStatus] = useState(item.status);
  const [priority, setPriority] = useState(item.priority);
  const [dueDate, setDueDate] = useState<Date | undefined>(
    item.due_date ? new Date(item.due_date) : undefined
  );
  const [estimateHours, setEstimateHours] = useState<string>(
    item.estimate_hours?.toString() || ''
  );
  const [dueDateOpen, setDueDateOpen] = useState(false);
  const [assigneeOpen, setAssigneeOpen] = useState(false);
  const [estimateOpen, setEstimateOpen] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);

  const currentStatus = statusOptions.find(s => s.value === status);

  useEffect(() => {
    setStatus(item.status);
    setPriority(item.priority);
    setDueDate(item.due_date ? new Date(item.due_date) : undefined);
    setEstimateHours(item.estimate_hours?.toString() || '');
  }, [item]);

  const handleStatusChange = async (newStatus: WorkItemStatus) => {
    setStatus(newStatus);
    setUpdating('status');
    try {
      await onUpdate({ status: newStatus });
      toast.success('Status updated');
    } catch (error) {
      setStatus(item.status);
      toast.error('Failed to update status');
    } finally {
      setUpdating(null);
    }
  };

  const handlePriorityChange = async (newPriority: PriorityLevel) => {
    setPriority(newPriority);
    setUpdating('priority');
    try {
      await onUpdate({ priority: newPriority });
      toast.success('Priority updated');
    } catch (error) {
      setPriority(item.priority);
      toast.error('Failed to update priority');
    } finally {
      setUpdating(null);
    }
  };

  const handleDueDateChange = async (date: Date | undefined) => {
    setDueDate(date);
    setDueDateOpen(false);
    setUpdating('due_date');
    try {
      await onUpdate({ due_date: date ? date.toISOString().split('T')[0] : null } as Partial<WorkItem>);
      toast.success(date ? 'Due date updated' : 'Due date cleared');
    } catch (error) {
      setDueDate(item.due_date ? new Date(item.due_date) : undefined);
      toast.error('Failed to update due date');
    } finally {
      setUpdating(null);
    }
  };

  const handleAssigneeChange = async (assigneeId: string | null) => {
    setAssigneeOpen(false);
    setUpdating('assignee');
    try {
      await onUpdate({ assignee_id: assigneeId } as Partial<WorkItem>);
      toast.success(assigneeId ? 'Assignee updated' : 'Assignee removed');
    } catch (error) {
      toast.error('Failed to update assignee');
    } finally {
      setUpdating(null);
    }
  };

  const handleEstimateSubmit = async () => {
    setEstimateOpen(false);
    const hours = estimateHours ? parseFloat(estimateHours) : null;
    if (estimateHours && isNaN(hours as number)) {
      toast.error('Please enter a valid number');
      return;
    }
    setUpdating('estimate');
    try {
      await onUpdate({ estimate_hours: hours } as Partial<WorkItem>);
      toast.success(hours ? 'Estimate updated' : 'Estimate cleared');
    } catch (error) {
      setEstimateHours(item.estimate_hours?.toString() || '');
      toast.error('Failed to update estimate');
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className={cn(
      "space-y-6 overflow-y-auto",
      inSheet ? "w-full p-0" : "w-80 border-l border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-4"
    )}>
      {/* Status */}
      <div>
        <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider block mb-2">
          Status
        </label>
        <Select
          value={status}
          onValueChange={(v) => handleStatusChange(v as WorkItemStatus)}
          disabled={updating === 'status'}
        >
          <SelectTrigger>
            <div className="flex items-center gap-2">
              {updating === 'status' && <Loader2 className="h-3 w-3 animate-spin" />}
              <div className={cn('h-2 w-2 rounded-full', currentStatus?.color)} />
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex items-center gap-2">
                  <div className={cn('h-2 w-2 rounded-full', option.color)} />
                  {option.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Assignee */}
      <div>
        <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider block mb-2">
          Assignee
        </label>
        <Popover open={assigneeOpen} onOpenChange={setAssigneeOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-start"
              disabled={updating === 'assignee'}
            >
              {updating === 'assignee' && <Loader2 className="h-3 w-3 animate-spin mr-2" />}
              {item.assignee ? (
                <div className="flex items-center gap-2">
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="text-[10px]">
                      {item.assignee.full_name?.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  {item.assignee.full_name}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-zinc-400">
                  <User className="h-4 w-4" />
                  Unassigned
                </div>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2">
            <div className="space-y-1">
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => handleAssigneeChange(null)}
              >
                <User className="h-4 w-4 mr-2 text-zinc-400" />
                Unassigned
              </Button>
              {teamMembers.map((member) => (
                <Button
                  key={member.id}
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => handleAssigneeChange(member.id)}
                >
                  <Avatar className="h-5 w-5 mr-2">
                    <AvatarFallback className="text-[10px]">
                      {member.full_name?.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  {member.full_name}
                </Button>
              ))}
              {teamMembers.length === 0 && (
                <p className="text-xs text-zinc-400 p-2">No team members found</p>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Priority */}
      <div>
        <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider block mb-2">
          Priority
        </label>
        <div className="flex items-center gap-2 mb-2">
          <PriorityIndicator
            priority={priority as any}
            variant="badge"
          />
        </div>
        <Select
          value={priority}
          onValueChange={(v) => handlePriorityChange(v as PriorityLevel)}
          disabled={updating === 'priority'}
        >
          <SelectTrigger>
            {updating === 'priority' && <Loader2 className="h-3 w-3 animate-spin mr-2" />}
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {priorityOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex items-center gap-2">
                  <PriorityIndicator
                    priority={option.value as any}
                    variant="dot"
                  />
                  {option.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Due Date */}
      <div>
        <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider block mb-2">
          Due Date
        </label>
        <Popover open={dueDateOpen} onOpenChange={setDueDateOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-start"
              disabled={updating === 'due_date'}
            >
              {updating === 'due_date' && <Loader2 className="h-3 w-3 animate-spin mr-2" />}
              <CalendarIcon className="h-4 w-4 mr-2" />
              {dueDate
                ? dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : 'No due date'
              }
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dueDate}
              onSelect={handleDueDateChange}
              initialFocus
            />
            {dueDate && (
              <div className="p-2 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-red-600"
                  onClick={() => handleDueDateChange(undefined)}
                >
                  Clear due date
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>

      {/* Labels */}
      <div>
        <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider block mb-2">
          Labels
        </label>
        <div className="flex flex-wrap gap-1">
          {item.labels?.map((label) => (
            <Badge
              key={label.id}
              variant="outline"
              style={{ borderColor: label.color, backgroundColor: `${label.color}20` }}
            >
              {label.name}
            </Badge>
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2"
            onClick={() => console.log('Labels management clicked')}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Estimate */}
      <div>
        <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider block mb-2">
          Estimate
        </label>
        <Popover open={estimateOpen} onOpenChange={setEstimateOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-start"
              disabled={updating === 'estimate'}
            >
              {updating === 'estimate' && <Loader2 className="h-3 w-3 animate-spin mr-2" />}
              <Clock className="h-4 w-4 mr-2" />
              {item.estimate_hours ? `${item.estimate_hours}h estimated` : 'No estimate'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-3" align="start">
            <div className="space-y-2">
              <label className="text-xs font-medium">Hours</label>
              <Input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.5"
                placeholder="e.g., 4"
                value={estimateHours}
                onChange={(e) => setEstimateHours(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleEstimateSubmit()}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleEstimateSubmit}>
                  Save
                </Button>
                {estimateHours && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEstimateHours('');
                      handleEstimateSubmit();
                    }}
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Time Tracked */}
      {item.actual_hours && (
        <div>
          <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider block mb-2">
            Time Tracked
          </label>
          <div className="text-sm">
            {item.actual_hours}h / {item.estimate_hours}h
          </div>
        </div>
      )}

      <Separator />

      {/* Project */}
      <div>
        <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider block mb-2">
          Project
        </label>
        <Link
          href={`/projects/${(item.project as any)?.slug}`}
          className="flex items-center gap-2 text-sm hover:text-[color:var(--foco-teal)] transition-colors"
        >
          <div
            className="h-3 w-3 rounded"
            style={{ backgroundColor: (item.project as any)?.color }}
          />
          {(item.project as any)?.name}
        </Link>
      </div>

      {/* Reporter */}
      <div>
        <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider block mb-2">
          Reporter
        </label>
        <div className="flex items-center gap-2 text-sm">
          <Avatar className="h-5 w-5">
            <AvatarFallback className="text-[10px]">
              {item.reporter?.full_name?.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          {item.reporter?.full_name}
        </div>
      </div>

      {/* Created */}
      <div>
        <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider block mb-2">
          Created
        </label>
        <div className="text-sm text-zinc-600">
          {new Date(item.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </div>
      </div>
    </div>
  );
}
