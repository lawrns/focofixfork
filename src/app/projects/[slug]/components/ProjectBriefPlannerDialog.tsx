'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import type { DraftPlanResult } from '@/features/task-intake/types';

interface ProjectBriefPlannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onTasksCreated: () => Promise<void> | void;
}

export function ProjectBriefPlannerDialog({
  open,
  onOpenChange,
  projectId,
  onTasksCreated,
}: ProjectBriefPlannerDialogProps) {
  const [sourceText, setSourceText] = useState('');
  const [draftId, setDraftId] = useState<string | null>(null);
  const [draftPlan, setDraftPlan] = useState<DraftPlanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [approving, setApproving] = useState(false);

  const reset = () => {
    setSourceText('');
    setDraftId(null);
    setDraftPlan(null);
    setLoading(false);
    setApproving(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) reset();
    onOpenChange(nextOpen);
  };

  const handleGenerate = async () => {
    if (!sourceText.trim()) {
      toast.error('Paste a project brief first');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/task-intake/project-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          sourceText,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to generate draft plan');
      }

      setDraftId(payload.draft_id);
      setDraftPlan(payload.draft_plan);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate draft plan');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!draftId) return;

    setApproving(true);
    try {
      const response = await fetch(`/api/task-intake/project-brief/${draftId}/approve`, {
        method: 'POST',
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to approve plan');
      }

      toast.success(`Created ${payload.createdTaskIds.length} board tasks`);
      await onTasksCreated();
      handleOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to approve plan');
    } finally {
      setApproving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Plan From Brief</DialogTitle>
          <DialogDescription>
            Paste a large project brief. The system will decompose it into board tasks for review before creating anything.
          </DialogDescription>
        </DialogHeader>

        {!draftPlan ? (
          <div className="space-y-4">
            <Textarea
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              placeholder="Paste the eventual goals, constraints, deliverables, and any context that should be decomposed into project tasks."
              className="min-h-[260px]"
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
              <Button onClick={handleGenerate} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Generate Draft Plan
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-medium">{draftPlan.title}</h3>
                  <p className="text-sm text-zinc-500">{draftPlan.summary}</p>
                </div>
                <Badge variant="outline">{Math.round(draftPlan.confidence_score * 100)}% confidence</Badge>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {draftPlan.tasks.map((task) => (
                <div key={task.id} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-sm">{task.title}</p>
                    <Badge variant="outline">{task.recommended_execution}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">{task.description}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                    <Badge variant="secondary">{task.status}</Badge>
                    <Badge variant="secondary">{task.priority}</Badge>
                    {task.recommended_agent ? <Badge variant="secondary">{task.recommended_agent}</Badge> : null}
                  </div>
                  <p className="mt-2 text-[11px] text-zinc-500">
                    Verify: {task.verification_steps.join(' ')}
                  </p>
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => { setDraftPlan(null); setDraftId(null); }}>Back</Button>
              <Button onClick={handleApprove} disabled={approving}>
                {approving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Approve And Create Tasks
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
