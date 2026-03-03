'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  GitBranch, 
  Loader2, 
  Coins, 
  Database, 
  Clock,
  Play,
  RotateCcw,
} from 'lucide-react';
import { useOrchestrationStore } from '../stores/orchestration-store';
import { PhaseCard } from './phase-card';
import { WorkflowList } from './workflow-list';
import { CreateWorkflowDialog } from './create-workflow-dialog';
import { PHASE_ORDER, OrchestrationWorkflow } from '../types';

interface WorkflowOrchestratorProps {
  projects: { id: string; name: string }[];
}

export function WorkflowOrchestrator({ projects }: WorkflowOrchestratorProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  
  const {
    workflows,
    activeWorkflow,
    isLoading,
    error,
    fetchWorkflows,
    fetchWorkflow,
    advancePhase,
    skipPhase,
    deleteWorkflow,
    setActiveWorkflow,
  } = useOrchestrationStore();

  // Initial fetch
  useEffect(() => {
    fetchWorkflows(selectedProjectId === 'all' ? undefined : selectedProjectId);
  }, [selectedProjectId, fetchWorkflows]);

  // Handle workflow selection
  const handleSelectWorkflow = async (workflow: OrchestrationWorkflow) => {
    if (activeWorkflow?.id === workflow.id) {
      setActiveWorkflow(null);
    } else {
      await fetchWorkflow(workflow.id);
    }
  };

  // Handle phase advancement
  const handleAdvancePhase = async () => {
    if (!activeWorkflow) return;
    await advancePhase(activeWorkflow.id);
  };

  // Handle phase skip
  const handleSkipPhase = async () => {
    if (!activeWorkflow) return;
    await skipPhase(activeWorkflow.id);
  };

  // Filter workflows by selected project
  const filteredWorkflows = selectedProjectId === 'all' 
    ? workflows 
    : workflows.filter(w => w.project_id === selectedProjectId);

  return (
    <div className="space-y-6">
      {/* Header with filters and create button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Select
            value={selectedProjectId}
            onValueChange={setSelectedProjectId}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchWorkflows(selectedProjectId === 'all' ? undefined : selectedProjectId)}
            disabled={isLoading}
          >
            <RotateCcw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </Button>
        </div>

        <CreateWorkflowDialog 
          projects={projects} 
          defaultProjectId={selectedProjectId !== 'all' ? selectedProjectId : undefined}
        />
      </div>

      {/* Error display */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Workflow list */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Workflows
          </h3>
          <WorkflowList
            workflows={filteredWorkflows}
            selectedId={activeWorkflow?.id}
            onSelect={handleSelectWorkflow}
            onDelete={deleteWorkflow}
          />
        </div>

        {/* Phase stepper */}
        <div className="lg:col-span-2 space-y-4">
          {activeWorkflow ? (
            <>
              {/* Workflow header */}
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl">{activeWorkflow.title}</CardTitle>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline">
                          Phase {activeWorkflow.current_phase_idx + 1} of {PHASE_ORDER.length}
                        </Badge>
                        {activeWorkflow.project && (
                          <Badge variant="secondary">
                            {activeWorkflow.project.name}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {/* Cost tracker */}
                    <div className="text-right">
                      <div className="flex items-center justify-end gap-2 text-sm">
                        <Coins className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          ${activeWorkflow.total_cost_usd.toFixed(4)}
                        </span>
                      </div>
                      <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground mt-1">
                        <Database className="h-3 w-3" />
                        <span>
                          {(activeWorkflow.total_tokens_in + activeWorkflow.total_tokens_out).toLocaleString()} tokens
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-4">
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          'h-full transition-all duration-500',
                          activeWorkflow.status === 'complete' && 'bg-green-500',
                          activeWorkflow.status === 'running' && 'bg-blue-500',
                          activeWorkflow.status === 'failed' && 'bg-red-500',
                          activeWorkflow.status === 'draft' && 'bg-gray-400',
                        )}
                        style={{ 
                          width: `${(activeWorkflow.current_phase_idx / PHASE_ORDER.length) * 100}%` 
                        }}
                      />
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {/* Phase stepper */}
              <ScrollArea className="h-[calc(100vh-400px)]">
                <div className="space-y-3 pr-4">
                  {activeWorkflow.phases?.map((phase, index) => (
                    <PhaseCard
                      key={phase.id}
                      phase={phase}
                      isActive={index === activeWorkflow.current_phase_idx}
                      onAdvance={handleAdvancePhase}
                      onSkip={handleSkipPhase}
                      disabled={isLoading || activeWorkflow.status === 'running'}
                    />
                  ))}
                </div>
              </ScrollArea>

              {/* Global actions */}
              {activeWorkflow.status === 'draft' && (
                <div className="flex justify-end">
                  <Button
                    onClick={handleAdvancePhase}
                    disabled={isLoading}
                    className="gap-2"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    Start Workflow
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-300px)] border rounded-lg bg-muted/50">
              <GitBranch className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground">
                Select a workflow
              </h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm text-center">
                Choose a workflow from the list to view and manage its phases, or create a new one.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
