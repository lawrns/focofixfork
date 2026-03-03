'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Send, 
  Sparkles, 
  Loader2, 
  Mic,
  Plus,
  X,
  ChevronDown,
  CheckCircle,
  Bot,
  User,
  GitMerge,
  Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { TaskIntakeItem, ParsedTaskResult } from '../types';

interface QuickCaptureProps {
  userId?: string;
  projectId?: string;
  projects?: Array<{ id: string; name: string; slug: string }>;
  onCapture?: (item: TaskIntakeItem) => void;
  compact?: boolean;
  className?: string;
}

export function QuickCapture({ userId, projectId: propProjectId, projects = [], onCapture, compact, className }: QuickCaptureProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [rawText, setRawText] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>(propProjectId || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [livePreview, setLivePreview] = useState<Partial<ParsedTaskResult> | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();

  // Live preview with SSE streaming (Module 2)
  useEffect(() => {
    if (!rawText.trim() || rawText.length < 10) {
      setLivePreview(null);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsParsing(true);
      try {
        const res = await fetch('/api/task-intake/parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            raw_text: rawText,
            project_context: selectedProjectId 
          }),
        });

        if (!res.ok) throw new Error('Parse failed');

        // Read SSE stream
        const reader = res.body?.getReader();
        if (!reader) return;

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const event = JSON.parse(line.slice(6));
                if (event.type === 'parsed' && event.result) {
                  setLivePreview(event.result);
                }
              } catch {
                // Ignore parse errors
              }
            }
          }
        }
      } catch (error) {
        // Silently fail - preview is non-critical
      } finally {
        setIsParsing(false);
      }
    }, 500); // Debounce 500ms

    return () => clearTimeout(timeoutId);
  }, [rawText, selectedProjectId]);

  const handleSubmit = useCallback(async () => {
    if (!rawText.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/task-intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawText: rawText.trim(),
          projectId: selectedProjectId || undefined,
        }),
      });

      if (!res.ok) throw new Error('Failed to submit');

      const data = await res.json();
      
      toast.success('Task captured', {
        description: 'AI is analyzing your input...',
      });

      setRawText('');
      setIsExpanded(false);
      onCapture?.(data.item);
    } catch (error) {
      toast.error('Failed to capture task');
    } finally {
      setIsSubmitting(false);
    }
  }, [rawText, selectedProjectId, onCapture]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit();
    }
    if (e.key === 'Escape') {
      setIsExpanded(false);
    }
  };

  if (!isExpanded) {
    return (
      <Button
        variant="outline"
        className={cn(
          'w-full justify-start gap-2 text-muted-foreground hover:text-foreground',
          className
        )}
        onClick={() => {
          setIsExpanded(true);
          setTimeout(() => textareaRef.current?.focus(), 100);
        }}
      >
        <Plus className="h-4 w-4" />
        <span>Quick capture... (⌘K)</span>
        <Sparkles className="h-3 w-3 ml-auto text-amber-500" />
      </Button>
    );
  }

  return (
    <Card className={cn('border-primary/20 shadow-lg', className)}>
      <CardContent className="p-4 space-y-3">
        {/* Project selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Project:</span>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="text-sm bg-transparent border-none focus:ring-0 text-foreground cursor-pointer"
          >
            <option value="">Auto-detect</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Textarea */}
        <Textarea
          ref={textareaRef}
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe what you need to do... e.g., 'Fix the login bug where users can't reset passwords - should be done by Friday'"
          className="min-h-[100px] resize-none border-0 focus-visible:ring-0 p-0 text-base"
          disabled={isSubmitting}
        />

        {/* Live Preview (Module 2 - SSE streaming) */}
        {livePreview && (
          <div className="bg-muted/50 rounded-md p-3 text-sm">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Live Preview</span>
              {isParsing && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
            </div>
            {livePreview.title && (
              <p className="font-medium">{livePreview.title}</p>
            )}
            <div className="flex flex-wrap gap-2 mt-2">
              {livePreview.priority && (
                <Badge variant="outline" className="text-[10px] h-5 capitalize">
                  {livePreview.priority}
                </Badge>
              )}
              {livePreview.estimated_hours && (
                <Badge variant="outline" className="text-[10px] h-5">
                  ~{livePreview.estimated_hours}h
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-muted-foreground"
              disabled={isSubmitting}
            >
              <Mic className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground">
              {rawText.length} chars
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!rawText.trim() || isSubmitting}
              className="gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Capture
            </Button>
          </div>
        </div>

        {/* Tips */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>Tips: Include priority words (urgent, ASAP), deadlines (by Friday), and estimates (2 hours)</p>
          <p className="opacity-70">Press ⌘Enter to submit, ESC to close</p>
        </div>
      </CardContent>
    </Card>
  );
}
