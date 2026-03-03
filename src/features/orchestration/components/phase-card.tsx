'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Brain, FileText, Search, Compass, Layers, Code, 
  TestTube, Eye, BookOpen, Rocket, Activity, History,
  Play, SkipForward, CheckCircle2, XCircle, Clock,
  ChevronDown, ChevronUp, Coins, Database
} from 'lucide-react';
import { WorkflowPhase, PHASE_DEFINITIONS, OrchestrationPhaseType } from '../types';

interface PhaseCardProps {
  phase: WorkflowPhase;
  isActive: boolean;
  onAdvance?: () => void;
  onSkip?: () => void;
  disabled?: boolean;
}

const iconMap: Record<OrchestrationPhaseType, React.ElementType> = {
  brain_dump: Brain,
  prd: FileText,
  research: Search,
  discovery: Compass,
  architecture: Layers,
  implementation: Code,
  testing: TestTube,
  review: Eye,
  documentation: BookOpen,
  deployment: Rocket,
  monitoring: Activity,
  retrospective: History,
};

const statusConfig = {
  pending: { 
    label: 'Pending', 
    variant: 'secondary' as const,
    icon: Clock,
    color: 'text-muted-foreground'
  },
  running: { 
    label: 'Running', 
    variant: 'default' as const,
    icon: Activity,
    color: 'text-blue-500'
  },
  complete: { 
    label: 'Complete', 
    variant: 'default' as const,
    icon: CheckCircle2,
    color: 'text-green-500'
  },
  skipped: { 
    label: 'Skipped', 
    variant: 'outline' as const,
    icon: SkipForward,
    color: 'text-gray-400'
  },
  failed: { 
    label: 'Failed', 
    variant: 'destructive' as const,
    icon: XCircle,
    color: 'text-red-500'
  },
};

export function PhaseCard({ 
  phase, 
  isActive, 
  onAdvance, 
  onSkip, 
  disabled 
}: PhaseCardProps) {
  const [expanded, setExpanded] = useState(false);
  
  const phaseDef = PHASE_DEFINITIONS[phase.phase_type];
  const Icon = iconMap[phase.phase_type];
  const status = statusConfig[phase.status];
  const StatusIcon = status.icon;

  const hasArtifact = phase.artifact && Object.keys(phase.artifact).length > 0;
  const hasResult = phase.result && Object.keys(phase.result).length > 0;

  return (
    <Card 
      className={cn(
        'transition-all duration-200',
        isActive && 'ring-2 ring-[color:var(--foco-teal)] ring-offset-2',
        phase.status === 'running' && 'border-blue-500/50',
        phase.status === 'complete' && 'border-green-500/30',
        phase.status === 'failed' && 'border-red-500/50',
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              'p-2 rounded-lg',
              phase.status === 'complete' && 'bg-green-500/10',
              phase.status === 'running' && 'bg-blue-500/10',
              phase.status === 'failed' && 'bg-red-500/10',
              phase.status === 'pending' && 'bg-muted',
              phase.status === 'skipped' && 'bg-gray-500/10',
            )}>
              <Icon className={cn('h-5 w-5', status.color)} />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">
                {phaseDef.label}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {phaseDef.description}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant={status.variant} className="gap-1">
              <StatusIcon className="h-3 w-3" />
              {status.label}
            </Badge>
            
            {(hasArtifact || hasResult) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Token stats */}
        {(phase.tokens_in > 0 || phase.tokens_out > 0) && (
          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Database className="h-3 w-3" />
              <span>{phase.tokens_in.toLocaleString()} in</span>
            </div>
            <div className="flex items-center gap-1">
              <Database className="h-3 w-3" />
              <span>{phase.tokens_out.toLocaleString()} out</span>
            </div>
            {phase.cost_usd > 0 && (
              <div className="flex items-center gap-1">
                <Coins className="h-3 w-3" />
                <span>${phase.cost_usd.toFixed(4)}</span>
              </div>
            )}
            {phase.model && (
              <Badge variant="outline" className="text-[10px]">
                {phase.model}
              </Badge>
            )}
          </div>
        )}

        {/* Action buttons for active phase */}
        {isActive && phase.status === 'pending' && (
          <div className="flex items-center gap-2 mt-3">
            <Button
              size="sm"
              onClick={onAdvance}
              disabled={disabled}
              className="gap-1"
            >
              <Play className="h-3.5 w-3.5" />
              Start Phase
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onSkip}
              disabled={disabled}
            >
              <SkipForward className="h-3.5 w-3.5 mr-1" />
              Skip
            </Button>
          </div>
        )}

        {/* Running indicator */}
        {phase.status === 'running' && (
          <div className="flex items-center gap-2 mt-3">
            <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
              <Activity className="h-4 w-4 animate-pulse" />
              <span>Executing...</span>
            </div>
          </div>
        )}
      </CardHeader>

      {/* Expandable artifact/result preview */}
      {expanded && (hasArtifact || hasResult) && (
        <CardContent className="pt-0">
          <ScrollArea className="h-64 rounded-md border bg-muted/50 p-4">
            <pre className="text-xs font-mono whitespace-pre-wrap">
              {JSON.stringify(phase.artifact || phase.result, null, 2)}
            </pre>
          </ScrollArea>
        </CardContent>
      )}
    </Card>
  );
}
