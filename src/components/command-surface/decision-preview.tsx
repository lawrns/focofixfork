'use client';

import { Terminal, Cpu, CheckCircle, XCircle, ListTodo, Mail, Calendar, Play, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { CTODecision, COODecision, CommandMode } from './types';

interface DecisionPreviewProps {
  decision: CTODecision | COODecision;
  mode: CommandMode;
  onApprove: () => void;
  onReject: () => void;
}

export function DecisionPreview({ decision, mode, onApprove, onReject }: DecisionPreviewProps) {
  const isCTO = mode === 'cto' && 'tasks' in decision;
  const isCOO = mode === 'coo' && 'crons' in decision;

  return (
    <div className={cn(
      'rounded-lg border p-4 space-y-3',
      isCTO && 'border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20',
      isCOO && 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20'
    )}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className={cn(
          'p-2 rounded-lg',
          isCTO && 'bg-blue-100 dark:bg-blue-900',
          isCOO && 'bg-emerald-100 dark:bg-emerald-900'
        )}>
          {isCTO ? (
            <Terminal className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          ) : (
            <Cpu className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{decision.title}</span>
            <Badge 
              variant="secondary" 
              className={cn(
                'text-xs',
                isCTO && 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
                isCOO && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
              )}
            >
              {decision.type}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{decision.description}</p>
        </div>
      </div>

      {/* CTO Content */}
      {isCTO && (
        <div className="space-y-3">
          {/* Projects Section */}
          {!!(decision as CTODecision).projects?.length && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <FolderOpen className="h-4 w-4" />
                Projects to Create ({(decision as CTODecision).projects!.length})
              </div>
              <div className="space-y-1.5">
                {(decision as CTODecision).projects!.map((project, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-sm px-3 py-2 bg-white dark:bg-black/20 rounded border"
                  >
                    <span className="font-medium truncate">{project.name}</span>
                    <span className="text-xs text-muted-foreground truncate">{project.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tasks Section */}
          {(decision as CTODecision).tasks.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <ListTodo className="h-4 w-4" />
                Tasks to Create ({(decision as CTODecision).tasks.length})
              </div>
              <div className="space-y-1.5">
                {(decision as CTODecision).tasks.map((task, i) => (
                  <div 
                    key={i} 
                    className="flex items-center gap-2 text-sm px-3 py-2 bg-white dark:bg-black/20 rounded border"
                  >
                    <Badge 
                      variant="outline" 
                      className={cn(
                        'text-xs',
                        task.priority === 'urgent' && 'border-red-200 text-red-600',
                        task.priority === 'high' && 'border-orange-200 text-orange-600',
                        task.priority === 'medium' && 'border-blue-200 text-blue-600',
                        task.priority === 'low' && 'border-gray-200 text-gray-600'
                      )}
                    >
                      {task.priority}
                    </Badge>
                    <span className="flex-1 truncate">{task.title}</span>
                    <span className="text-xs text-muted-foreground">~{task.estimatedHours}h</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Runs Section */}
          {(decision as CTODecision).runs.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Play className="h-4 w-4" />
                Agent Runs ({(decision as CTODecision).runs.length})
              </div>
              <div className="space-y-1.5">
                {(decision as CTODecision).runs.map((run, i) => (
                  <div 
                    key={i} 
                    className="flex items-center gap-2 text-sm px-3 py-2 bg-white dark:bg-black/20 rounded border"
                  >
                    <Badge variant="outline" className="text-xs font-mono">
                      {run.runner}
                    </Badge>
                    <span className="truncate">{run.task}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* COO Content */}
      {isCOO && (
        <div className="space-y-3">
          {/* Crons Section */}
          {(decision as COODecision).crons.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Calendar className="h-4 w-4" />
                Scheduled Jobs ({(decision as COODecision).crons.length})
              </div>
              <div className="space-y-1.5">
                {(decision as COODecision).crons.map((cron, i) => (
                  <div 
                    key={i} 
                    className="flex items-center gap-2 text-sm px-3 py-2 bg-white dark:bg-black/20 rounded border"
                  >
                    <Badge variant="outline" className="text-xs font-mono">
                      {cron.schedule}
                    </Badge>
                    <span className="flex-1 truncate">{cron.name}</span>
                    <span className="text-xs text-muted-foreground font-mono">{cron.handler}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Emails Section */}
          {(decision as COODecision).emails.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Mail className="h-4 w-4" />
                Emails to Send ({(decision as COODecision).emails.length})
              </div>
              <div className="space-y-1.5">
                {(decision as COODecision).emails.map((email, i) => (
                  <div 
                    key={i} 
                    className="flex items-center gap-2 text-sm px-3 py-2 bg-white dark:bg-black/20 rounded border"
                  >
                    <span className="text-xs text-muted-foreground">to:</span>
                    <span className="truncate font-mono text-xs">{email.to.join(', ')}</span>
                    <span className="flex-1 truncate">{email.subject}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t">
        <Button variant="outline" size="sm" onClick={onReject}>
          <XCircle className="h-4 w-4 mr-1" />
          Reject
        </Button>
        <Button 
          size="sm" 
          onClick={onApprove}
          className={cn(
            isCTO && 'bg-blue-600 hover:bg-blue-700',
            isCOO && 'bg-emerald-600 hover:bg-emerald-700'
          )}
        >
          <CheckCircle className="h-4 w-4 mr-1" />
          Approve & Execute
        </Button>
      </div>
    </div>
  );
}
