'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle, XCircle, Sparkles, ListTodo, ClipboardCheck, FileText, ArrowRight, AlertTriangle, Clock, Search } from 'lucide-react'
import type { TaskActionType } from '@/lib/services/task-action-service'

interface AiPreviewModalProps {
  open: boolean
  action: TaskActionType | null
  preview: {
    explanation: string
    proposed_changes: unknown
  } | null
  onApply: () => Promise<void>
  onCancel: () => void
}

const ACTION_TITLES: Record<TaskActionType, string> = {
  suggest_subtasks: 'Suggested Subtasks',
  draft_acceptance: 'Draft Acceptance Criteria',
  summarize_thread: 'Task Summary',
  propose_next_step: 'Proposed Next Step',
  detect_blockers: 'Detected Blockers',
  break_into_subtasks: 'Break Into Subtasks',
  draft_update: 'Draft Status Update',
  estimate_time: 'Time Estimate',
  find_similar: 'Similar Tasks Search Criteria'
}

const ACTION_ICONS: Record<TaskActionType, typeof Sparkles> = {
  suggest_subtasks: ListTodo,
  draft_acceptance: ClipboardCheck,
  summarize_thread: FileText,
  propose_next_step: ArrowRight,
  detect_blockers: AlertTriangle,
  break_into_subtasks: ListTodo,
  draft_update: FileText,
  estimate_time: Clock,
  find_similar: Search
}

export function AiPreviewModal({
  open,
  action,
  preview,
  onApply,
  onCancel
}: AiPreviewModalProps) {
  const [applying, setApplying] = useState(false)
  const [applied, setApplied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleApply = async () => {
    setApplying(true)
    setError(null)
    try {
      await onApply()
      setApplied(true)
      // Auto-close after showing success
      setTimeout(() => {
        setApplied(false)
        onCancel()
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply changes')
    } finally {
      setApplying(false)
    }
  }

  const handleClose = () => {
    setApplied(false)
    setError(null)
    onCancel()
  }

  if (!action || !preview) return null

  const Icon = ACTION_ICONS[action]
  const title = ACTION_TITLES[action]

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {preview.explanation}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <PreviewContent action={action} data={preview.proposed_changes} />
        </div>

        {error && (
          <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-md">
            <XCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {applied && (
          <div className="flex items-center gap-2 text-green-600 text-sm bg-green-50 dark:bg-green-950 p-3 rounded-md">
            <CheckCircle className="h-4 w-4" />
            Changes applied successfully!
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={applying}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={applying || applied}>
            {applying ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Applying...
              </>
            ) : applied ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Applied!
              </>
            ) : (
              'Apply Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface PreviewContentProps {
  action: TaskActionType
  data: unknown
}

function PreviewContent({ action, data }: PreviewContentProps) {
  switch (action) {
    case 'suggest_subtasks':
    case 'break_into_subtasks':
      return <SubtasksList data={data} />

    case 'draft_acceptance':
      return <AcceptanceCriteriaList data={data} />

    case 'summarize_thread':
    case 'draft_update':
      return <TextContent data={data} />

    case 'propose_next_step':
      return <NextStepContent data={data} />

    case 'detect_blockers':
      return <BlockersList data={data} />

    case 'estimate_time':
      return <TimeEstimateContent data={data} />

    case 'find_similar':
      return <SearchCriteriaContent data={data} />

    default:
      return <pre className="text-sm bg-muted p-4 rounded-md overflow-auto">{JSON.stringify(data, null, 2)}</pre>
  }
}

function SubtasksList({ data }: { data: unknown }) {
  const subtasks = Array.isArray(data) ? data : []

  if (subtasks.length === 0) {
    return <p className="text-muted-foreground">No subtasks generated</p>
  }

  return (
    <div className="space-y-3">
      {subtasks.map((subtask: { title: string; description?: string }, index: number) => (
        <div key={index} className="border rounded-lg p-3 bg-card">
          <div className="font-medium flex items-center gap-2">
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
              {index + 1}
            </span>
            {subtask.title}
          </div>
          {subtask.description && (
            <p className="text-sm text-muted-foreground mt-1">{subtask.description}</p>
          )}
        </div>
      ))}
      <p className="text-xs text-muted-foreground">
        Clicking Apply will create {subtasks.length} subtask{subtasks.length !== 1 ? 's' : ''}.
      </p>
    </div>
  )
}

function AcceptanceCriteriaList({ data }: { data: unknown }) {
  const criteria = Array.isArray(data) ? data : []

  if (criteria.length === 0) {
    return <p className="text-muted-foreground">No acceptance criteria generated</p>
  }

  return (
    <div className="space-y-3">
      {criteria.map((item: { criterion: string }, index: number) => (
        <div key={index} className="border rounded-lg p-3 bg-card">
          <div className="flex items-start gap-2">
            <ClipboardCheck className="h-4 w-4 mt-0.5 text-primary" />
            <p className="text-sm">{item.criterion}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function TextContent({ data }: { data: unknown }) {
  const text = typeof data === 'string' ? data : JSON.stringify(data)

  return (
    <div className="border rounded-lg p-4 bg-card">
      <p className="text-sm whitespace-pre-wrap">{text}</p>
    </div>
  )
}

function NextStepContent({ data }: { data: unknown }) {
  const step = data as { action?: string; rationale?: string } | null

  if (!step) {
    return <p className="text-muted-foreground">No next step proposed</p>
  }

  return (
    <div className="border rounded-lg p-4 bg-card space-y-3">
      <div>
        <span className="text-xs font-medium text-muted-foreground uppercase">Recommended Action</span>
        <p className="font-medium mt-1">{step.action}</p>
      </div>
      {step.rationale && (
        <div>
          <span className="text-xs font-medium text-muted-foreground uppercase">Rationale</span>
          <p className="text-sm text-muted-foreground mt-1">{step.rationale}</p>
        </div>
      )}
    </div>
  )
}

function BlockersList({ data }: { data: unknown }) {
  const blockers = Array.isArray(data) ? data : []

  if (blockers.length === 0) {
    return (
      <div className="flex items-center gap-2 text-green-600 bg-green-50 dark:bg-green-950 p-4 rounded-lg">
        <CheckCircle className="h-5 w-5" />
        <span>No blockers detected</span>
      </div>
    )
  }

  const severityColors = {
    high: 'text-red-600 bg-red-50 dark:bg-red-950',
    medium: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950',
    low: 'text-blue-600 bg-blue-50 dark:bg-blue-950'
  }

  return (
    <div className="space-y-3">
      {blockers.map((blocker: { issue: string; severity?: string; suggestion?: string }, index: number) => (
        <div key={index} className="border rounded-lg p-3 bg-card">
          <div className="flex items-start gap-2">
            <AlertTriangle className={`h-4 w-4 mt-0.5 ${blocker.severity === 'high' ? 'text-red-500' : blocker.severity === 'medium' ? 'text-yellow-500' : 'text-blue-500'}`} />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm">{blocker.issue}</p>
                <span className={`text-xs px-2 py-0.5 rounded ${severityColors[blocker.severity as keyof typeof severityColors] || severityColors.medium}`}>
                  {blocker.severity || 'medium'}
                </span>
              </div>
              {blocker.suggestion && (
                <p className="text-sm text-muted-foreground mt-1">Suggestion: {blocker.suggestion}</p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function TimeEstimateContent({ data }: { data: unknown }) {
  const estimate = data as { hours_low?: number; hours_high?: number; confidence?: string; factors?: string[] } | null

  if (!estimate) {
    return <p className="text-muted-foreground">No estimate generated</p>
  }

  return (
    <div className="border rounded-lg p-4 bg-card space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-medium text-muted-foreground uppercase">Estimated Time</span>
          <p className="text-2xl font-bold mt-1">
            {estimate.hours_low}-{estimate.hours_high} hours
          </p>
        </div>
        {estimate.confidence && (
          <span className={`text-xs px-2 py-1 rounded ${
            estimate.confidence === 'high' ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400' :
            estimate.confidence === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400' :
            'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'
          }`}>
            {estimate.confidence} confidence
          </span>
        )}
      </div>
      {estimate.factors && estimate.factors.length > 0 && (
        <div>
          <span className="text-xs font-medium text-muted-foreground uppercase">Factors Considered</span>
          <ul className="mt-1 text-sm text-muted-foreground list-disc list-inside">
            {estimate.factors.map((factor, index) => (
              <li key={index}>{factor}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function SearchCriteriaContent({ data }: { data: unknown }) {
  const criteria = data as { keywords?: string[]; task_types?: string[]; similarity_factors?: string[] } | null

  if (!criteria) {
    return <p className="text-muted-foreground">No search criteria generated</p>
  }

  return (
    <div className="border rounded-lg p-4 bg-card space-y-3">
      {criteria.keywords && criteria.keywords.length > 0 && (
        <div>
          <span className="text-xs font-medium text-muted-foreground uppercase">Keywords to Search</span>
          <div className="flex flex-wrap gap-2 mt-1">
            {criteria.keywords.map((keyword, index) => (
              <span key={index} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                {keyword}
              </span>
            ))}
          </div>
        </div>
      )}
      {criteria.task_types && criteria.task_types.length > 0 && (
        <div>
          <span className="text-xs font-medium text-muted-foreground uppercase">Task Types</span>
          <div className="flex flex-wrap gap-2 mt-1">
            {criteria.task_types.map((type, index) => (
              <span key={index} className="text-xs bg-muted px-2 py-1 rounded">
                {type}
              </span>
            ))}
          </div>
        </div>
      )}
      {criteria.similarity_factors && criteria.similarity_factors.length > 0 && (
        <div>
          <span className="text-xs font-medium text-muted-foreground uppercase">Similarity Factors</span>
          <ul className="mt-1 text-sm text-muted-foreground list-disc list-inside">
            {criteria.similarity_factors.map((factor, index) => (
              <li key={index}>{factor}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
