'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Brain, ChevronDown, ChevronRight, Database, FileText, BookOpen, Cpu, Code } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MemorySegment, MemoryStats, MemoryTopic } from '../types';

interface MemoryPanelProps {
  projectId: string;
}

const TOPIC_ICONS: Record<MemoryTopic, typeof Brain> = {
  debugging: Code,
  patterns: BookOpen,
  architecture: Cpu,
  api_contracts: FileText,
  general: Database,
};

const TOPIC_COLORS: Record<MemoryTopic, string> = {
  debugging: 'bg-red-500/10 text-red-600 border-red-200',
  patterns: 'bg-blue-500/10 text-blue-600 border-blue-200',
  architecture: 'bg-purple-500/10 text-purple-600 border-purple-200',
  api_contracts: 'bg-amber-500/10 text-amber-600 border-amber-200',
  general: 'bg-gray-500/10 text-gray-600 border-gray-200',
};

export function MemoryPanel({ projectId }: MemoryPanelProps) {
  const [segments, setSegments] = useState<MemorySegment[]>([]);
  const [stats, setStats] = useState<MemoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedTopics, setExpandedTopics] = useState<Set<MemoryTopic>>(new Set());
  const [selectedSegment, setSelectedSegment] = useState<MemorySegment | null>(null);

  useEffect(() => {
    loadMemoryData();
  }, [projectId]);

  const loadMemoryData = async () => {
    try {
      setLoading(true);
      const [segmentsRes, statsRes] = await Promise.all([
        fetch(`/api/memory?projectId=${projectId}`),
        fetch(`/api/memory/${projectId}/index`),
      ]);

      if (segmentsRes.ok) {
        const data = await segmentsRes.json();
        setSegments(data.segments || []);
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to load memory data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTopic = (topic: MemoryTopic) => {
    const newExpanded = new Set(expandedTopics);
    if (newExpanded.has(topic)) {
      newExpanded.delete(topic);
    } else {
      newExpanded.add(topic);
    }
    setExpandedTopics(newExpanded);
  };

  const segmentsByTopic = segments.reduce((acc, segment) => {
    if (!acc[segment.topic]) {
      acc[segment.topic] = [];
    }
    acc[segment.topic].push(segment);
    return acc;
  }, {} as Record<MemoryTopic, MemorySegment[]>);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Brain className="h-4 w-4" />
            Project Memory
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Project Memory
          </div>
          {stats && (
            <Badge variant="secondary" className="font-mono text-xs">
              {stats.totalSegments} segments · {(stats.totalTokens / 1000).toFixed(1)}k tokens
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Topic list */}
        {(['patterns', 'architecture', 'api_contracts', 'debugging', 'general'] as MemoryTopic[]).map((topic) => {
          const topicSegments = segmentsByTopic[topic] || [];
          const count = topicSegments.length;
          const Icon = TOPIC_ICONS[topic];

          if (count === 0) return null;

          return (
            <Collapsible
              key={topic}
              open={expandedTopics.has(topic)}
              onOpenChange={() => toggleTopic(topic)}
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    'w-full justify-between h-auto py-2 px-3',
                    TOPIC_COLORS[topic]
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <span className="capitalize">{topic.replace('_', ' ')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs opacity-70">{count}</span>
                    {expandedTopics.has(topic) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </div>
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <ScrollArea className="h-48 mt-2">
                  <div className="space-y-2 pr-3">
                    {topicSegments.map((segment) => (
                      <button
                        key={segment.id}
                        onClick={() => setSelectedSegment(segment)}
                        className={cn(
                          'w-full text-left p-2 rounded-md text-xs transition-colors',
                          selectedSegment?.id === segment.id
                            ? 'bg-primary/10'
                            : 'hover:bg-muted'
                        )}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <Badge variant="outline" className="text-[10px] h-5">
                            {(segment.relevance_score * 100).toFixed(0)}%
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {segment.source}
                          </span>
                        </div>
                        <p className="line-clamp-3 text-muted-foreground">
                          {segment.content.slice(0, 150)}...
                        </p>
                        <div className="mt-1 text-[10px] text-muted-foreground">
                          {segment.token_count} tokens
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </CollapsibleContent>
            </Collapsible>
          );
        })}

        {segments.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-4">
            No memory segments yet. Run indexing to populate.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
