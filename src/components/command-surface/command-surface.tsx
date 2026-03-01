'use client';

import { useState, useCallback } from 'react';
import { Send, Bot, Cpu, Sparkles, CheckCircle, XCircle, Loader2, Terminal, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { CommandSurfaceProps, CommandMode, CTODecision, COODecision } from './types';
import { useCommandPipeline } from './use-command-pipeline';
import { DecisionPreview } from './decision-preview';

const MODE_CONFIG: Record<CommandMode, { label: string; icon: React.ReactNode; color: string; description: string }> = {
  cto: {
    label: 'CTO',
    icon: <Terminal className="h-4 w-4" />,
    color: 'text-blue-500',
    description: 'Architecture & Implementation'
  },
  coo: {
    label: 'COO',
    icon: <Cpu className="h-4 w-4" />,
    color: 'text-emerald-500',
    description: 'Operations & Scheduling'
  },
  auto: {
    label: 'Auto',
    icon: <Sparkles className="h-4 w-4" />,
    color: 'text-amber-500',
    description: 'Smart detection'
  }
};

export function CommandSurface({ 
  context = 'dashboard', 
  contextId,
  defaultMode = 'auto',
  onExecutionComplete,
  className 
}: CommandSurfaceProps) {
  const [prompt, setPrompt] = useState('');
  const [mode, setMode] = useState<CommandMode>(defaultMode);
  const [showModeSelector, setShowModeSelector] = useState(false);
  const [pendingDecision, setPendingDecision] = useState<CTODecision | COODecision | null>(null);
  const [pendingPlan, setPendingPlan] = useState<ReturnType<typeof analyzePrompt>['plan'] | null>(null);
  
  const { execution, isProcessing, analyzePrompt, executeCommand } = useCommandPipeline();

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isProcessing) return;

    const analysis = analyzePrompt(prompt, mode);
    setPendingPlan(analysis.plan);
    
    if (analysis.decision) {
      setPendingDecision(analysis.decision);
      return; // Wait for user approval
    }

    // Auto-execute if no approval needed
    const result = await executeCommand(prompt, analysis.mode, analysis.plan);
    
    if (result.status === 'completed') {
      toast.success('Command executed successfully');
    } else {
      toast.error(result.error || 'Command failed');
    }
    
    onExecutionComplete?.(result);
    setPrompt('');
  }, [prompt, mode, isProcessing, analyzePrompt, executeCommand, onExecutionComplete]);

  const handleApprove = useCallback(async () => {
    if (!pendingDecision || !pendingPlan) return;

    const result = await executeCommand(prompt, mode, pendingPlan, pendingDecision);
    
    if (result.status === 'completed') {
      toast.success(`${mode.toUpperCase()} decision executed successfully`);
    } else {
      toast.error(result.error || 'Execution failed');
    }
    
    onExecutionComplete?.(result);
    setPendingDecision(null);
    setPendingPlan(null);
    setPrompt('');
  }, [pendingDecision, pendingPlan, prompt, mode, executeCommand, onExecutionComplete]);

  const handleReject = useCallback(() => {
    setPendingDecision(null);
    setPendingPlan(null);
    toast.info('Decision rejected');
  }, []);

  const currentMode = MODE_CONFIG[mode];

  return (
    <Card className={cn('overflow-hidden', className)}>
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <span className="font-semibold">Command Surface</span>
            {context !== 'dashboard' && (
              <Badge variant="secondary" className="text-xs">
                {context}
              </Badge>
            )}
          </div>
          
          {/* Mode Selector */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              className={cn('gap-2', currentMode.color)}
              onClick={() => setShowModeSelector(!showModeSelector)}
            >
              {currentMode.icon}
              {currentMode.label}
              <ChevronDown className={cn('h-3 w-3 transition-transform', showModeSelector && 'rotate-180')} />
            </Button>
            
            {showModeSelector && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-popover border rounded-md shadow-lg z-10 py-1">
                {(Object.keys(MODE_CONFIG) as CommandMode[]).map((m) => (
                  <button
                    key={m}
                    className={cn(
                      'w-full px-3 py-2 flex items-center gap-2 hover:bg-accent text-left',
                      mode === m && 'bg-accent'
                    )}
                    onClick={() => {
                      setMode(m);
                      setShowModeSelector(false);
                    }}
                  >
                    <span className={MODE_CONFIG[m].color}>{MODE_CONFIG[m].icon}</span>
                    <div>
                      <div className="text-sm font-medium">{MODE_CONFIG[m].label}</div>
                      <div className="text-xs text-muted-foreground">{MODE_CONFIG[m].description}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Decision Preview */}
        {pendingDecision && (
          <DecisionPreview
            decision={pendingDecision}
            mode={mode}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        )}

        {/* Execution Status */}
        {execution && !pendingDecision && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              {execution.status === 'executing' && (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-muted-foreground">Executing... {execution.plan.steps[execution.currentStepIndex]?.description}</span>
                </>
              )}
              {execution.status === 'completed' && (
                <>
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  <span className="text-emerald-600">Completed</span>
                </>
              )}
              {execution.status === 'failed' && (
                <>
                  <XCircle className="h-4 w-4 text-red-500" />
                  <span className="text-red-600">Failed: {execution.error}</span>
                </>
              )}
            </div>
            
            {/* Progress bar */}
            {execution.status === 'executing' && (
              <div className="h-1 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300"
                  style={{ 
                    width: `${((execution.currentStepIndex + 1) / execution.plan.steps.length) * 100}%` 
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            placeholder={
              mode === 'cto' 
                ? "e.g., Fix hydration errors in login page..."
                : mode === 'coo'
                ? "e.g., Send daily 7am summary email..."
                : "What would you like me to do?"
            }
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isProcessing || !!pendingDecision}
            className="flex-1"
          />
          <Button 
            type="submit" 
            disabled={isProcessing || !prompt.trim() || !!pendingDecision}
            size="icon"
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>

        {/* Quick Suggestions */}
        {!prompt && !execution && !pendingDecision && (
          <div className="flex flex-wrap gap-2">
            {mode === 'cto' ? (
              <>
                <button
                  className="text-xs px-2 py-1 bg-blue-500/10 text-blue-600 rounded hover:bg-blue-500/20 transition-colors"
                  onClick={() => setPrompt('Fix hydration errors in the dashboard')}
                >
                  Fix hydration errors
                </button>
                <button
                  className="text-xs px-2 py-1 bg-blue-500/10 text-blue-600 rounded hover:bg-blue-500/20 transition-colors"
                  onClick={() => setPrompt('Create task to implement dark mode toggle')}
                >
                  Implement dark mode
                </button>
                <button
                  className="text-xs px-2 py-1 bg-blue-500/10 text-blue-600 rounded hover:bg-blue-500/20 transition-colors"
                  onClick={() => setPrompt('Refactor API client for better error handling')}
                >
                  Refactor API client
                </button>
              </>
            ) : mode === 'coo' ? (
              <>
                <button
                  className="text-xs px-2 py-1 bg-emerald-500/10 text-emerald-600 rounded hover:bg-emerald-500/20 transition-colors"
                  onClick={() => setPrompt('Send daily 7am summary email')}
                >
                  Daily 7am summary
                </button>
                <button
                  className="text-xs px-2 py-1 bg-emerald-500/10 text-emerald-600 rounded hover:bg-emerald-500/20 transition-colors"
                  onClick={() => setPrompt('Schedule weekly report every Monday')}
                >
                  Weekly Monday report
                </button>
                <button
                  className="text-xs px-2 py-1 bg-emerald-500/10 text-emerald-600 rounded hover:bg-emerald-500/20 transition-colors"
                  onClick={() => setPrompt('Monitor system health every hour')}
                >
                  Hourly health check
                </button>
              </>
            ) : (
              <>
                <button
                  className="text-xs px-2 py-1 bg-amber-500/10 text-amber-600 rounded hover:bg-amber-500/20 transition-colors"
                  onClick={() => setPrompt('Create a new project')}
                >
                  Create project
                </button>
                <button
                  className="text-xs px-2 py-1 bg-amber-500/10 text-amber-600 rounded hover:bg-amber-500/20 transition-colors"
                  onClick={() => setPrompt('Schedule a reminder')}
                >
                  Schedule reminder
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
