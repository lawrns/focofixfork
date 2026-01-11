'use client';

import { useState } from 'react';
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
  Trash2,
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

const mockInboxItems: InboxItemData[] = [
  {
    id: '1',
    type: 'mention',
    title: 'Sarah mentioned you in a comment',
    body: '"@John can you review the new checkout flow designs?"',
    actor: { name: 'Sarah Chen' },
    project: { name: 'Website Redesign', color: '#6366F1' },
    workItem: { title: 'Checkout flow redesign' },
    isRead: false,
    createdAt: '5 minutes ago',
  },
  {
    id: '2',
    type: 'assigned',
    title: 'Mike assigned you to a task',
    actor: { name: 'Mike Johnson' },
    project: { name: 'Mobile App v2', color: '#10B981' },
    workItem: { title: 'Fix memory leak in image gallery' },
    isRead: false,
    createdAt: '1 hour ago',
  },
  {
    id: '3',
    type: 'ai_flag',
    title: 'AI detected a potential risk',
    body: 'Mobile App v2 milestone is trending 3 days late based on current velocity',
    actor: { name: 'Foco AI' },
    project: { name: 'Mobile App v2', color: '#10B981' },
    isRead: false,
    createdAt: '2 hours ago',
  },
  {
    id: '4',
    type: 'comment',
    title: 'New comment on your task',
    body: '"The wireframes look great! Just a few minor suggestions..."',
    actor: { name: 'Lisa Park' },
    project: { name: 'Website Redesign', color: '#6366F1' },
    workItem: { title: 'Create homepage wireframes' },
    isRead: true,
    createdAt: '4 hours ago',
  },
  {
    id: '5',
    type: 'status_change',
    title: 'Task moved to Review',
    actor: { name: 'Alex Kim' },
    project: { name: 'API Platform', color: '#F59E0B' },
    workItem: { title: 'OAuth2 implementation' },
    isRead: true,
    createdAt: 'Yesterday',
  },
  {
    id: '6',
    type: 'due_soon',
    title: 'Task due tomorrow',
    actor: { name: 'System' },
    project: { name: 'Website Redesign', color: '#6366F1' },
    workItem: { title: 'Design homepage mockups' },
    isRead: true,
    createdAt: 'Yesterday',
  },
];

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

function InboxItem({ item, selected, onSelect }: { 
  item: InboxItemData; 
  selected: boolean;
  onSelect: (id: string) => void;
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
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem>
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Mark as done
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Clock className="h-4 w-4 mr-2" />
            Snooze
          </DropdownMenuItem>
          <DropdownMenuItem>
            <ArrowRight className="h-4 w-4 mr-2" />
            Convert to task
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <Archive className="h-4 w-4 mr-2" />
            Archive
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default function InboxPage() {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'all' | 'unread' | 'mentions' | 'ai'>('all');

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
    if (selectedItems.size === mockInboxItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(mockInboxItems.map(i => i.id)));
    }
  };

  const filteredItems = mockInboxItems.filter(item => {
    if (filter === 'unread') return !item.isRead;
    if (filter === 'mentions') return item.type === 'mention';
    if (filter === 'ai') return item.type === 'ai_flag';
    return true;
  });

  const unreadCount = mockInboxItems.filter(i => !i.isRead).length;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            Inbox
          </h1>
          <p className="text-zinc-500 mt-1">
            {unreadCount} unread notifications
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Mark all read
          </Button>
        </div>
      </div>

      {/* Tabs */}
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

      {/* Bulk Actions */}
      {selectedItems.size > 0 && (
        <div className="flex items-center gap-2 p-3 mb-4 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
          <span className="text-sm font-medium">
            {selectedItems.size} selected
          </span>
          <div className="flex-1" />
          <Button variant="ghost" size="sm">
            <CheckCircle2 className="h-4 w-4 mr-1" />
            Done
          </Button>
          <Button variant="ghost" size="sm">
            <Clock className="h-4 w-4 mr-1" />
            Snooze
          </Button>
          <Button variant="ghost" size="sm">
            <Archive className="h-4 w-4 mr-1" />
            Archive
          </Button>
        </div>
      )}

      {/* Inbox List */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        {/* List Header */}
        <div className="flex items-center gap-3 px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
          <Checkbox
            checked={selectedItems.size === mockInboxItems.length}
            onCheckedChange={handleSelectAll}
          />
          <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
            {filteredItems.length} notifications
          </span>
        </div>

        {/* Items */}
        {filteredItems.length === 0 ? (
          <div className="py-12 text-center">
            <Bell className="h-8 w-8 text-zinc-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
              All caught up!
            </p>
            <p className="text-sm text-zinc-500 mt-1">
              No notifications to show
            </p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <InboxItem
              key={item.id}
              item={item}
              selected={selectedItems.has(item.id)}
              onSelect={handleSelect}
            />
          ))
        )}
      </div>

      {/* Help Text */}
      <p className="text-xs text-zinc-400 text-center mt-4">
        Pro tip: Press <kbd className="px-1 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded">E</kbd> to mark as done, 
        <kbd className="px-1 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded ml-1">S</kbd> to snooze
      </p>
    </div>
  );
}
