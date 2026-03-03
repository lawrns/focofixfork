'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Loader2, 
  CheckCircle, 
  XCircle, 
  Bot, 
  User, 
  GitMerge,
  HelpCircle,
  Trash2,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { TaskIntakeItem, TaskClassification } from '../types';

interface IntakeQueueProps {
  userId: string;
  className?: string;
}

const CLASSIFICATION_CONFIG: Record<TaskClassification, { 
  label: string; 
  icon: typeof Bot;
  color: string;
  bg: string;
}> = {
  ai: { 
    label: 'AI Completable', 
    icon: Bot, 
    color: 'text-emerald-600',
    bg: 'bg-emerald-50'
  },
  human: { 
    label: 'Needs Human', 
    icon: User, 
    color: 'text-blue-600',
    bg: 'bg-blue-50'
  },
  hybrid: { 
    label: 'Hybrid', 
    icon: GitMerge, 
    color: 'text-amber-600',
    bg: 'bg-amber-50'
  },
  unclear: { 
    label: 'Unclear', 
    icon: HelpCircle, 
    color: 'text-gray-600',
    bg: 'bg-gray-50'
  },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-gray-400' },
  parsed: { label: 'Parsing', color: 'bg-blue-400' },
  classified: { label: 'Classified', color: 'bg-amber-400' },
  dispatched: { label: 'Dispatched', color: 'bg-teal-400' },
  completed: { label: 'Completed', color: 'bg-emerald-400' },
  discarded: { label: 'Discarded', color: 'bg-rose-400' },
};

export function IntakeQueue({ userId, className }: IntakeQueueProps) {
  const [items, setItems] = useState<TaskIntakeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<TaskIntakeItem | null>(null);

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch('/api/task-intake');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setItems(data.items || []);
    } catch (error) {
      console.error('Failed to fetch intake items:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
    // Poll for updates
    const interval = setInterval(fetchItems, 5000);
    return () => clearInterval(interval);
  }, [fetchItems]);

  const handleDiscard = async (id: string) => {
    try {
      const res = await fetch(`/api/task-intake/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'discard' }),
      });
      if (!res.ok) throw new Error('Failed');
      toast.success('Item discarded');
      fetchItems();
    } catch (error) {
      toast.error('Failed to discard');
    }
  };

  const handleConvert = async (id: string) => {
    try {
      const res = await fetch(`/api/task-intake/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'convert' }),
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      toast.success('Task created', {
        description: `View task #${data.taskId?.slice(0, 8)}`,
        action: {
          label: 'View',
          onClick: () => window.open(`/my-work?task=${data.taskId}`, '_blank'),
        },
      });
      fetchItems();
    } catch (error) {
      toast.error('Failed to create task');
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const pendingItems = items.filter(i => 
    ['pending', 'parsed', 'classified'].includes(i.status)
  );

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span>Quick Capture Queue</span>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="font-mono">
              {pendingItems.length} pending
            </Badge>
            <Button variant="ghost" size="sm" onClick={fetchItems}>
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {items.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <p>No captured tasks yet.</p>
                <p className="text-sm">Use Quick Capture to add tasks!</p>
              </div>
            ) : (
              items.map((item) => (
                <IntakeItemCard
                  key={item.id}
                  item={item}
                  isSelected={selectedItem?.id === item.id}
                  onSelect={() => setSelectedItem(item)}
                  onDiscard={() => handleDiscard(item.id)}
                  onConvert={() => handleConvert(item.id)}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

interface IntakeItemCardProps {
  item: TaskIntakeItem;
  isSelected: boolean;
  onSelect: () => void;
  onDiscard: () => void;
  onConvert: () => void;
}

function IntakeItemCard({ item, isSelected, onSelect, onDiscard, onConvert }: IntakeItemCardProps) {
  const classification = CLASSIFICATION_CONFIG[item.classification];
  const status = STATUS_CONFIG[item.status];
  const Icon = classification.icon;

  return (
    <div
      className={cn(
        'border rounded-lg p-3 cursor-pointer transition-colors',
        isSelected ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
      )}
      onClick={onSelect}
    >
      <div className="flex items-start gap-3">
        <div className={cn('p-2 rounded-md', classification.bg)}>
          <Icon className={cn('h-4 w-4', classification.color)} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn('w-2 h-2 rounded-full', status.color)} />
            <span className="text-xs text-muted-foreground">{status.label}</span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground">
              {new Date(item.created_at).toLocaleTimeString()}
            </span>
          </div>
          
          <p className="text-sm line-clamp-2 mb-2">{item.raw_text}</p>
          
          {item.parsed_result?.title && (
            <div className="bg-muted/50 rounded p-2 text-xs space-y-1">
              <p className="font-medium">{item.parsed_result.title}</p>
              {item.parsed_result.priority && (
                <Badge variant="outline" className="text-[10px] h-5">
                  {item.parsed_result.priority}
                </Badge>
              )}
            </div>
          )}

          {item.classification !== 'unclear' && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-muted-foreground">
                Confidence: {Math.round(item.confidence_score * 100)}%
              </span>
            </div>
          )}
        </div>

        {item.status === 'classified' && (
          <div className="flex flex-col gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={(e) => { e.stopPropagation(); onConvert(); }}
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              Create
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-muted-foreground"
              onClick={(e) => { e.stopPropagation(); onDiscard(); }}
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Discard
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
