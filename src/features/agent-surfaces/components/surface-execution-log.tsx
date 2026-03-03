'use client';

import { useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Loader2,
  Terminal,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SurfaceExecution } from '../types';

interface SurfaceExecutionLogProps {
  executions: SurfaceExecution[];
  className?: string;
}

const STATUS_CONFIG = {
  pending: { icon: Clock, color: 'text-gray-400', bg: 'bg-gray-50' },
  running: { icon: Loader2, color: 'text-blue-400', bg: 'bg-blue-50' },
  complete: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-50' },
  failed: { icon: XCircle, color: 'text-rose-400', bg: 'bg-rose-50' },
  cancelled: { icon: XCircle, color: 'text-gray-400', bg: 'bg-gray-50' },
};

export function SurfaceExecutionLog({ executions, className }: SurfaceExecutionLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [executions]);

  return (
    <div className={cn('border rounded-lg bg-muted/30', className)}>
      <div className="px-3 py-2 border-b bg-muted/50">
        <h4 className="text-xs font-medium flex items-center gap-2">
          <Terminal className="h-3 w-3" />
          Execution Log
          <Badge variant="secondary" className="ml-auto text-[10px]">
            {executions.length}
          </Badge>
        </h4>
      </div>
      
      <ScrollArea className="h-[300px]" ref={scrollRef}>
        <div className="p-3 space-y-2">
          {executions.length === 0 ? (
            <div className="text-center text-muted-foreground text-xs py-8">
              No executions yet
            </div>
          ) : (
            executions.map((execution) => (
              <ExecutionItem key={execution.id} execution={execution} />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function ExecutionItem({ execution }: { execution: SurfaceExecution }) {
  const status = STATUS_CONFIG[execution.status];
  const Icon = status.icon;
  const isRunning = execution.status === 'running';

  const duration = execution.completed_at && execution.started_at
    ? new Date(execution.completed_at).getTime() - new Date(execution.started_at).getTime()
    : null;

  return (
    <div className={cn('rounded-md p-2 text-xs', status.bg)}>
      <div className="flex items-start gap-2">
        <Icon className={cn('h-3.5 w-3.5 mt-0.5', status.color, isRunning && 'animate-spin')} />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium">{execution.action}</span>
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground truncate">{execution.surface_id.slice(0, 8)}</span>
          </div>
          
          {execution.error_message && (
            <p className="text-rose-600 mt-1 truncate">{execution.error_message}</p>
          )}
          
          {execution.output && Object.keys(execution.output).length > 0 && (
            <div className="mt-1 text-muted-foreground">
              <pre className="text-[10px] overflow-hidden">
                {JSON.stringify(execution.output, null, 2).slice(0, 200)}
              </pre>
            </div>
          )}
          
          <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
            <span>{new Date(execution.created_at).toLocaleTimeString()}</span>
            {duration && (
              <>
                <span>·</span>
                <span>{duration}ms</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
