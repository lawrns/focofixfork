'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { 
  Rss, 
  Globe, 
  Webhook, 
  Scissors,
  Bot,
  Pause,
  Play,
  AlertCircle,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { ContentSource, ContentSourceType } from '../types';

interface ContentSourceCardProps {
  source: ContentSource;
  onToggleStatus: (id: string, status: 'active' | 'paused') => void;
  onEdit: (source: ContentSource) => void;
  onDelete: (id: string) => void;
  onPoll: (id: string) => void;
}

const typeIcons: Record<ContentSourceType, typeof Rss> = {
  rss: Rss,
  api: Globe,
  webhook: Webhook,
  scrape: Scissors,
  apify: Bot,
};

const typeLabels: Record<ContentSourceType, string> = {
  rss: 'RSS Feed',
  api: 'API Endpoint',
  webhook: 'Webhook',
  scrape: 'Scraper',
  apify: 'Apify Actor',
};

const statusColors = {
  active: 'bg-green-500',
  paused: 'bg-yellow-500',
  error: 'bg-red-500',
};

const statusLabels = {
  active: 'Active',
  paused: 'Paused',
  error: 'Error',
};

export function ContentSourceCard({
  source,
  onToggleStatus,
  onEdit,
  onDelete,
  onPoll,
}: ContentSourceCardProps) {
  const [isPolling, setIsPolling] = useState(false);
  const TypeIcon = typeIcons[source.type];

  const handlePoll = async () => {
    setIsPolling(true);
    try {
      await onPoll(source.id);
    } finally {
      setIsPolling(false);
    }
  };

  const handleToggle = () => {
    onToggleStatus(source.id, source.status === 'active' ? 'paused' : 'active');
  };

  return (
    <Card className="relative overflow-hidden">
      {/* Status indicator */}
      <div className={cn(
        'absolute left-0 top-0 bottom-0 w-1',
        statusColors[source.status]
      )} />

      <CardHeader className="pb-3 pl-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-secondary">
              <TypeIcon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <h4 className="font-medium text-sm">{source.name}</h4>
              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                {source.url}
              </p>
            </div>
          </div>
          <Badge 
            variant={source.status === 'active' ? 'default' : 'secondary'}
            className="text-[10px]"
          >
            {statusLabels[source.status]}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-0 pl-5">
        <div className="space-y-3">
          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <TypeIcon className="h-3 w-3" />
              {typeLabels[source.type]}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Every {source.poll_interval_minutes}m
            </span>
            {source.last_checked_at && (
              <span className="flex items-center gap-1">
                <RefreshCw className="h-3 w-3" />
                {formatDistanceToNow(new Date(source.last_checked_at), { addSuffix: true })}
              </span>
            )}
          </div>

          {/* Error display */}
          {source.error_count > 0 && (
            <div className="flex items-center gap-2 text-xs text-red-500">
              <AlertCircle className="h-3 w-3" />
              <span>{source.error_count} errors</span>
              {source.last_error && (
                <span className="truncate max-w-[200px]">{source.last_error}</span>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={handlePoll}
                    disabled={isPolling || source.status !== 'active'}
                  >
                    <RefreshCw className={cn('h-3 w-3 mr-1', isPolling && 'animate-spin')} />
                    Poll Now
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Manually trigger a poll</p>
                </TooltipContent>
              </Tooltip>

              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => onEdit(source)}
              >
                Edit
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-destructive hover:text-destructive"
                onClick={() => onDelete(source.id)}
              >
                Delete
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {source.status === 'active' ? 'Active' : 'Paused'}
              </span>
              <Switch
                checked={source.status === 'active'}
                onCheckedChange={handleToggle}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
