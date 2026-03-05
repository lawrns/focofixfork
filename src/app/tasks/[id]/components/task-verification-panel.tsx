'use client';

import { useState } from 'react';
import { CheckCircle2, FlaskConical, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import type { TaskVerification } from '@/types/foco';
import { toast } from 'sonner';

interface TaskVerificationPanelProps {
  taskId: string;
  verifications: TaskVerification[];
  onCreated: () => Promise<void> | void;
}

export function TaskVerificationPanel({ taskId, verifications, onCreated }: TaskVerificationPanelProps) {
  const [verificationType, setVerificationType] = useState<'unit' | 'integration' | 'e2e' | 'manual' | 'smoke'>('manual');
  const [status, setStatus] = useState<'passed' | 'failed' | 'needs_follow_up'>('passed');
  const [command, setCommand] = useState('');
  const [summary, setSummary] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!summary.trim()) return;
    setSubmitting(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}/verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verification_type: verificationType,
          status,
          command: command.trim() || null,
          summary: summary.trim(),
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to save verification');
      }

      setCommand('');
      setSummary('');
      await onCreated();
      toast.success('Verification saved');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save verification');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mb-8 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="mb-4 flex items-center gap-2">
        <FlaskConical className="h-4 w-4 text-zinc-500" />
        <h2 className="font-semibold">Verification</h2>
        <span className="text-xs text-zinc-400">{verifications.length} records</span>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Select value={verificationType} onValueChange={(value) => setVerificationType(value as typeof verificationType)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="manual">Manual</SelectItem>
            <SelectItem value="unit">Unit</SelectItem>
            <SelectItem value="integration">Integration</SelectItem>
            <SelectItem value="e2e">E2E</SelectItem>
            <SelectItem value="smoke">Smoke</SelectItem>
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={(value) => setStatus(value as typeof status)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="passed">Passed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="needs_follow_up">Needs Follow Up</SelectItem>
          </SelectContent>
        </Select>

        <Input
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          placeholder="Command or checklist"
        />
      </div>

      <Textarea
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        placeholder="Summarize what was tested or verified."
        className="mt-3 min-h-[84px]"
      />

      <div className="mt-3 flex justify-end">
        <Button onClick={handleSubmit} disabled={submitting || !summary.trim()}>
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Save Verification
        </Button>
      </div>

      <div className="mt-4 space-y-2">
        {verifications.map((verification) => (
          <div key={verification.id} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{verification.verification_type}</Badge>
                <Badge variant="secondary">{verification.status}</Badge>
              </div>
              <span className="text-xs text-zinc-400">
                {new Date(verification.created_at).toLocaleString()}
              </span>
            </div>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">{verification.summary}</p>
            {verification.command ? (
              <p className="mt-2 text-xs font-mono text-zinc-500">{verification.command}</p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
