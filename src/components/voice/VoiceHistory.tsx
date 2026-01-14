'use client';

/**
 * VoiceHistory Component
 * Command history sidebar showing past voice commands and their status
 */

import React, { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import type { VoiceCommand, VoiceStatus } from '@/lib/crico/types';

interface VoiceHistoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VoiceHistory({ open, onOpenChange }: VoiceHistoryProps) {
  const [commands, setCommands] = useState<VoiceCommand[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load command history when opened
  useEffect(() => {
    if (open) {
      loadHistory();
    }
  }, [open]);

  const loadHistory = async () => {
    try {
      setIsLoading(true);
      // In a real implementation, this would fetch from an API
      // For now, we'll use localStorage
      const stored = localStorage.getItem('voice_command_history');
      if (stored) {
        const parsed = JSON.parse(stored);
        setCommands(parsed);
      }
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearHistory = () => {
    localStorage.removeItem('voice_command_history');
    setCommands([]);
  };

  const getStatusIcon = (status: VoiceStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-gray-600" />;
      case 'awaiting_confirmation':
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      case 'executing':
        return <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: VoiceStatus) => {
    const variants: Record<VoiceStatus, string> = {
      completed: 'bg-green-100 text-green-700',
      failed: 'bg-red-100 text-red-700',
      cancelled: 'bg-gray-100 text-gray-700',
      awaiting_confirmation: 'bg-yellow-100 text-yellow-700',
      executing: 'bg-blue-100 text-blue-700',
      confirmed: 'bg-blue-100 text-blue-700',
      parsed: 'bg-purple-100 text-purple-700',
      validating: 'bg-orange-100 text-orange-700',
      captured: 'bg-gray-100 text-gray-700',
    };

    return (
      <Badge
        variant="secondary"
        className={cn('text-xs', variants[status])}
      >
        {status.replace(/_/g, ' ')}
      </Badge>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-96">
        <SheetHeader>
          <SheetTitle>Voice Command History</SheetTitle>
          <SheetDescription>
            View your recent voice commands and their status
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Actions */}
          <div className="flex items-center justify-between">
            <button
              onClick={loadHistory}
              disabled={isLoading}
              className="text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
            >
              <RefreshCw
                className={cn('w-4 h-4 inline mr-1', isLoading && 'animate-spin')}
              />
              Refresh
            </button>
            <button
              onClick={clearHistory}
              disabled={commands.length === 0}
              className="text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4 inline mr-1" />
              Clear All
            </button>
          </div>

          {/* Command List */}
          <ScrollArea className="h-[calc(100vh-200px)]">
            {commands.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  No command history yet
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Try using voice commands to see them here
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {commands.map((command) => (
                  <div
                    key={command.id}
                    className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(command.status)}
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(command.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                      {getStatusBadge(command.status)}
                    </div>

                    {/* Transcript */}
                    <p className="text-sm mb-2">{command.rawTranscript}</p>

                    {/* Intent details */}
                    {command.parsedIntent && (
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2 text-xs">
                          <span className="text-muted-foreground">Domain:</span>
                          <span className="font-medium">
                            {command.parsedIntent.domain}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 text-xs">
                          <span className="text-muted-foreground">Action:</span>
                          <span className="font-medium">
                            {command.parsedIntent.action}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Confidence */}
                    {command.intentConfidence !== undefined && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-muted-foreground">Confidence</span>
                          <span className="font-medium">
                            {Math.round(command.intentConfidence * 100)}%
                          </span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn(
                              'h-full transition-all',
                              command.intentConfidence >= 0.8
                                ? 'bg-green-500'
                                : command.intentConfidence >= 0.6
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                            )}
                            style={{ width: `${command.intentConfidence * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}
