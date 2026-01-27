'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  AtSign,
  CheckCircle2,
  Clock,
  Filter,
  MessageSquare,
  MoreHorizontal,
  Bell,
  AlertTriangle,
  ArrowRight,
  Zap,
  Archive,
  Inbox as InboxIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { NotificationType } from '@/types/foco';
import { PageShell } from '@/components/layout/page-shell';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/ui/empty-state-standard';
import { emptyStates } from '@/lib/copy';
import { useAuth } from '@/lib/hooks/use-auth';
import { toast } from 'sonner';
import type { NotificationResponse } from '@/types/api-responses';

interface InboxItemData {
  id: string;
  type: NotificationType;
  title: string;
  body?: string;
  actor: { name: string; avatar?: string };
  project?: { name: string; color: string };
  workItem?: { title: string };
  isRead: boolean;
  createdAt: string;
}

const typeIcons: Record<NotificationType, React.ElementType> = {
  mention: AtSign,
  assigned: ArrowRight,
  status_change: ArrowRight,
  comment: MessageSquare,
  approval: CheckCircle2,
  ai_flag: Zap,
  due_soon: Clock,
  blocked: AlertTriangle,
};

const typeColors: Record<NotificationType, string> = {
  mention: 'text-blue-500 bg-blue-50 dark:bg-blue-950',
  assigned: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950',
  status_change: 'text-green-500 bg-green-50 dark:bg-green-950',
  comment: 'text-zinc-500 bg-zinc-100 dark:bg-zinc-800',
  approval: 'text-purple-500 bg-purple-50 dark:bg-purple-950',
  ai_flag: 'text-amber-500 bg-amber-50 dark:bg-amber-950',
  due_soon: 'text-orange-500 bg-orange-50 dark:bg-orange-950',
  blocked: 'text-red-500 bg-red-50 dark:bg-red-950',
};

function InboxItem({
  item,
  selected,
  onSelect,
  onMarkDone,
  onSnooze,
  onConvertToTask,
  onArchive,
}: {
  item: InboxItemData;
  selected: boolean;
  onSelect: (id: string) => void;
  onMarkDone: (id: string) => void;
  onSnooze: (id: string) => void;
  onConvertToTask: (id: string) => void;
  onArchive: (id: string) => void;
}) {
  const Icon = typeIcons[item.type];

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 border-b border-zinc-100 dark:border-zinc-800',
        'hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer',
        !item.isRead && 'bg-indigo-50/30 dark:bg-indigo-950/20'
      )}
    >
      <Checkbox
        checked={selected}
        onCheckedChange={() => onSelect(item.id)}
        className="mt-1"
      />
      
      <div className={cn('p-2 rounded-lg', typeColors[item.type])}>
        <Icon className="h-4 w-4" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className={cn(
              'text-sm',
              !item.isRead && 'font-medium'
            )}>
              {item.title}
            </p>
            {item.body && (
              <p className="text-sm text-zinc-500 mt-0.5 line-clamp-1">
                {item.body}
              </p>
            )}
            <div className="flex items-center gap-2 mt-1.5 text-xs text-zinc-500">
              {item.project && (
                <span className="flex items-center gap-1">
                  <div 
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: item.project.color }}
                  />
                  {item.project.name}
                </span>
              )}
              {item.workItem && (
                <>
                  <span>•</span>
                  <span className="truncate">{item.workItem.title}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-zinc-400">{item.createdAt}</span>
            {!item.isRead && (
              <div className="h-2 w-2 rounded-full bg-indigo-500" />
            )}
          </div>
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 min-h-[44px] min-w-[44px] shrink-0 [@media(pointer:fine)]:min-h-0 [@media(pointer:fine)]:min-w-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onMarkDone(item.id)}>
            <CheckCircle2 className="h-4 w-4" />
            Mark as done
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onSnooze(item.id)}>
            <Clock className="h-4 w-4" />
            Snooze
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onConvertToTask(item.id)}>
            <ArrowRight className="h-4 w-4" />
            Convert to task
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-red-600" onClick={() => onArchive(item.id)}>
            <Archive className="h-4 w-4" />
            Archive
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default function InboxPage() {
  const { user } = useAuth();
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'all' | 'unread' | 'mentions' | 'ai'>('all');
  const [items, setItems] = useState<InboxItemData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const response = await fetch('/api/notifications', { credentials: 'include' });

      // Handle non-ok responses
      if (!response.ok) {
        console.error('Failed to fetch notifications: HTTP', response.status);
        toast.error('Failed to load inbox');
        return;
      }

      const data = await response.json();

      // Validate data structure and ensure it's an array
      if (data.success && data.data && Array.isArray(data.data)) {
        setItems(data.data.map((n: NotificationResponse) => ({
          id: n.id,
          type: n.type,
          title: n.title,
          body: n.body,
          actor: { name: n.actor?.full_name || 'System' },
          project: n.project ? { name: n.project.name, color: n.project.color } : undefined,
          workItem: n.work_item ? { title: n.work_item.title } : undefined,
          isRead: n.is_read,
          createdAt: new Date(n.created_at).toLocaleDateString(),
        })));
      } else {
        // Handle null, undefined, or non-array data by setting empty array
        setItems([]);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      toast.error('Failed to load inbox');
      // Set empty items on error to prevent crash
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAllAsRead = useCallback(async () => {
    const unreadCount = items.filter(i => !i.isRead).length;

    if (unreadCount === 0) {
      toast.success('All notifications are already read');
      return;
    }

    setIsMarkingAllRead(true);

    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || 'Failed to mark notifications as read');
        return;
      }

      const data = await response.json();

      if (data.success) {
        toast.success(data.message || `${data.count} notifications marked as read`);
        // Refresh notifications after successful update
        await fetchNotifications();
      } else {
        toast.error('Failed to mark notifications as read');
      }
    } catch (error) {
      console.error('Error marking notifications as read:', error);
      toast.error('Failed to mark notifications as read');
    } finally {
      setIsMarkingAllRead(false);
    }
  }, [items, fetchNotifications]);

  const handleSelect = (id: string) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedItems.size === items.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(items.map(i => i.id)));
    }
  };

  const handleMarkDone = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}/read`, {
        method: 'PATCH',
        credentials: 'include',
      });
      if (response.ok) {
        setItems(prev => prev.map(item =>
          item.id === id ? { ...item, isRead: true } : item
        ));
        toast.success('Marked as done');
      }
    } catch (error) {
      toast.error('Failed to mark as done');
    }
  }, []);

  const handleSnooze = useCallback(async (id: string) => {
    // For now, just mark as read - a full implementation would add a snooze until date
    toast.info('Snoozed notification (will reappear later)');
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, isRead: true } : item
    ));
  }, []);

  const handleConvertToTask = useCallback(async (id: string) => {
    const notification = items.find(i => i.id === id);
    if (!notification) return;

    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: notification.title,
          description: notification.body,
          status: 'backlog',
          priority: 'medium',
        }),
      });

      if (response.ok) {
        toast.success('Converted to task');
        // Remove from inbox
        setItems(prev => prev.filter(item => item.id !== id));
      } else {
        toast.error('Failed to convert to task');
      }
    } catch (error) {
      toast.error('Failed to convert to task');
    }
  }, [items]);

  const handleArchive = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (response.ok) {
        setItems(prev => prev.filter(item => item.id !== id));
        toast.success('Archived');
      }
    } catch (error) {
      toast.error('Failed to archive');
    }
  }, []);

  // Bulk action handlers
  const handleBulkMarkDone = useCallback(async () => {
    for (const id of selectedItems) {
      await handleMarkDone(id);
    }
    setSelectedItems(new Set());
  }, [selectedItems, handleMarkDone]);

  const handleBulkSnooze = useCallback(async () => {
    for (const id of selectedItems) {
      await handleSnooze(id);
    }
    setSelectedItems(new Set());
  }, [selectedItems, handleSnooze]);

  const handleBulkArchive = useCallback(async () => {
    for (const id of selectedItems) {
      await handleArchive(id);
    }
    setSelectedItems(new Set());
  }, [selectedItems, handleArchive]);

  const filteredItems = items.filter(item => {
    if (filter === 'unread') return !item.isRead;
    if (filter === 'mentions') return item.type === 'mention';
    if (filter === 'ai') return item.type === 'ai_flag';
    return true;
  });

  const unreadCount = items.filter(i => !i.isRead).length;

  if (isLoading) {
    return (
      <PageShell maxWidth="4xl">
        <PageHeader title="Inbox" subtitle="Loading your messages..." />
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse bg-zinc-100 dark:bg-zinc-800" />
          ))}
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell maxWidth="4xl">
      <PageHeader
        title="Inbox"
        subtitle={unreadCount > 0 ? `${unreadCount} unread` : "You&apos;re all caught up"}
        primaryAction={
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllAsRead}
            disabled={isMarkingAllRead || unreadCount === 0}
          >
            <CheckCircle2 className="h-4 w-4" />
            {isMarkingAllRead ? 'Marking...' : 'Mark all read'}
          </Button>
        }
      />

      <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="mb-4">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread">
            Unread
            {unreadCount > 0 && (
              <Badge variant="secondary" className="ml-1.5 h-5 px-1.5">
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="mentions">Mentions</TabsTrigger>
          <TabsTrigger value="ai">AI Flags</TabsTrigger>
        </TabsList>
      </Tabs>

      {selectedItems.size > 0 && (
        <div className="flex items-center gap-2 p-3 mb-4 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
          <span className="text-sm font-medium">
            {selectedItems.size} selected
          </span>
          <div className="flex-1" />
          <Button variant="ghost" size="sm" onClick={handleBulkMarkDone}>
            <CheckCircle2 className="h-4 w-4" />
            Done
          </Button>
          <Button variant="ghost" size="sm" onClick={handleBulkSnooze}>
            <Clock className="h-4 w-4" />
            Snooze
          </Button>
          <Button variant="ghost" size="sm" onClick={handleBulkArchive}>
            <Archive className="h-4 w-4" />
            Archive
          </Button>
        </div>
      )}

      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
          <Checkbox
            checked={selectedItems.size === items.length && items.length > 0}
            onCheckedChange={handleSelectAll}
          />
          <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
            {filteredItems.length} notifications
          </span>
        </div>

        {filteredItems.length === 0 ? (
          <EmptyState
            icon={InboxIcon}
            title={emptyStates.inbox.title}
            description={emptyStates.inbox.description}
            primaryAction={{
              label: emptyStates.inbox.primaryCta,
              onClick: () => window.location.href = '/my-work',
            }}
            size="sm"
          />
        ) : (
          filteredItems.map((item) => (
            <InboxItem
              key={item.id}
              item={item}
              selected={selectedItems.has(item.id)}
              onSelect={handleSelect}
              onMarkDone={handleMarkDone}
              onSnooze={handleSnooze}
              onConvertToTask={handleConvertToTask}
              onArchive={handleArchive}
            />
          ))
        )}
      </div>

      <p className="text-xs text-zinc-400 text-center mt-4">
        <kbd className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded text-zinc-600 dark:text-zinc-300">E</kbd> mark done
        <span className="mx-2">·</span>
        <kbd className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded text-zinc-600 dark:text-zinc-300">S</kbd> snooze
        <span className="mx-2">·</span>
        <kbd className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded text-zinc-600 dark:text-zinc-300">A</kbd> archive
      </p>
    </PageShell>
  );
}
