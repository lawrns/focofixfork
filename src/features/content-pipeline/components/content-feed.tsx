'use client';

import { useState, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { 
  Check, 
  Archive, 
  Sparkles,
  Tag,
  ExternalLink,
  Loader2,
  Filter,
  Inbox,
  CheckCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { ContentItem } from '../types';

type ItemStatus = 'unread' | 'read' | 'archived' | 'actioned';

interface ContentFeedProps {
  items: ContentItem[];
  isLoading: boolean;
  onItemsChange: () => void;
}

const statusConfig: Record<ItemStatus, { label: string; icon: typeof Check; color: string }> = {
  unread: { label: 'Unread', icon: Inbox, color: 'text-blue-500' },
  read: { label: 'Read', icon: Check, color: 'text-muted-foreground' },
  archived: { label: 'Archived', icon: Archive, color: 'text-muted-foreground' },
  actioned: { label: 'Actioned', icon: CheckCheck, color: 'text-green-500' },
};

function RelevanceBadge({ score }: { score: number }) {
  let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'secondary';
  let label = 'Low';

  if (score >= 0.8) {
    variant = 'default';
    label = 'High';
  } else if (score >= 0.5) {
    variant = 'outline';
    label = 'Medium';
  }

  return (
    <Badge variant={variant} className="text-[10px]">
      {label} ({Math.round(score * 100)}%)
    </Badge>
  );
}

interface ContentItemCardProps {
  item: ContentItem;
  onStatusChange: (id: string, status: ItemStatus) => void;
}

function ContentItemCard({ item, onStatusChange }: ContentItemCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const status = statusConfig[item.status];
  const StatusIcon = status.icon;

  const handleStatusChange = (newStatus: ItemStatus) => {
    onStatusChange(item.id, newStatus);
  };

  return (
    <Card className={cn(
      'transition-all',
      item.status === 'unread' && 'border-l-4 border-l-blue-500'
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <StatusIcon className={cn('h-3 w-3', status.color)} />
              <span className={cn(
                'text-sm font-medium',
                item.status === 'unread' ? 'text-foreground' : 'text-muted-foreground'
              )}>
                {item.title || 'Untitled'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</span>
              {item.published_at && (
                <>
                  <span>•</span>
                  <span>Published {formatDistanceToNow(new Date(item.published_at), { addSuffix: true })}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <RelevanceBadge score={item.relevance_score} />
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* AI Summary */}
        {item.ai_summary ? (
          <div className="mb-3 p-3 bg-secondary/50 rounded-md">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-3 w-3 text-amber-500" />
              <span className="text-xs font-medium text-muted-foreground">AI Summary</span>
            </div>
            <p className="text-sm text-muted-foreground">{item.ai_summary}</p>
          </div>
        ) : (
          <div className="mb-3 p-3 bg-secondary/50 rounded-md">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Sparkles className="h-3 w-3" />
              <span className="text-xs">Analyzing...</span>
            </div>
          </div>
        )}

        {/* AI Tags */}
        {item.ai_tags && item.ai_tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {item.ai_tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-[10px]">
                <Tag className="h-2 w-2 mr-1" />
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Raw Content Preview */}
        <div className={cn(
          'text-sm text-muted-foreground overflow-hidden transition-all',
          isExpanded ? 'max-h-none' : 'max-h-20'
        )}>
          {item.raw_content}
        </div>

        {item.raw_content.length > 100 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-primary hover:underline mt-2"
          >
            {isExpanded ? 'Show less' : 'Show more'}
          </button>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t">
          {item.status === 'unread' && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => handleStatusChange('read')}
            >
              <Check className="h-3 w-3 mr-1" />
              Mark Read
            </Button>
          )}

          {item.status !== 'archived' && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => handleStatusChange('archived')}
            >
              <Archive className="h-3 w-3 mr-1" />
              Archive
            </Button>
          )}

          {item.status !== 'actioned' && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => handleStatusChange('actioned')}
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Actioned
            </Button>
          )}

          {item.status === 'archived' && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => handleStatusChange('unread')}
            >
              <Inbox className="h-3 w-3 mr-1" />
              Unarchive
            </Button>
          )}

          {item.status === 'read' && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => handleStatusChange('unread')}
            >
              <Inbox className="h-3 w-3 mr-1" />
              Mark Unread
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function ContentFeed({ items, isLoading, onItemsChange }: ContentFeedProps) {
  const [activeFilter, setActiveFilter] = useState<ItemStatus | 'all'>('all');

  const filteredItems = items.filter((item) => {
    if (activeFilter === 'all') return true;
    return item.status === activeFilter;
  });

  const handleStatusChange = useCallback(async (id: string, status: ItemStatus) => {
    try {
      const res = await fetch('/api/content-pipeline/items', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });

      if (!res.ok) {
        throw new Error('Failed to update item status');
      }

      onItemsChange();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  }, [onItemsChange]);

  const unreadCount = items.filter((i) => i.status === 'unread').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="font-medium">Content Feed</h3>
          {unreadCount > 0 && (
            <Badge variant="default" className="text-[10px]">
              {unreadCount} unread
            </Badge>
          )}
        </div>

        <Tabs value={activeFilter} onValueChange={(v) => setActiveFilter(v as ItemStatus | 'all')}>
          <TabsList className="h-8">
            <TabsTrigger value="all" className="text-xs px-3">All</TabsTrigger>
            <TabsTrigger value="unread" className="text-xs px-3">Unread</TabsTrigger>
            <TabsTrigger value="read" className="text-xs px-3">Read</TabsTrigger>
            <TabsTrigger value="archived" className="text-xs px-3">Archived</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Filter className="h-8 w-8 mx-auto mb-3 opacity-50" />
          <p className="text-sm">
            {activeFilter === 'all' 
              ? 'No content items yet' 
              : `No ${activeFilter} items`
            }
          </p>
          <p className="text-xs mt-1">
            {activeFilter === 'all' 
              ? 'Add a source and poll for content'
              : 'Try a different filter'
            }
          </p>
        </div>
      ) : (
        <ScrollArea className="h-[600px]">
          <div className="space-y-3 pr-4">
            {filteredItems.map((item) => (
              <ContentItemCard
                key={item.id}
                item={item}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
