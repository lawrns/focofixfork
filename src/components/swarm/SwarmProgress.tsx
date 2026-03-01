'use client'

import React, { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Terminal, 
  FileEdit, 
  Zap, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Loader2,
  GitBranch,
  MessageSquare,
  Bug
} from 'lucide-react'
import { cn } from '@/lib/utils'

export type StepType = 
  | 'tool_use' 
  | 'file_edit' 
  | 'thinking' 
  | 'code_review'
  | 'git_operation'
  | 'test_execution'
  | 'llm_call'
  | 'user_input'
  | 'error'
  | 'complete'

export type StepStatus = 'pending' | 'running' | 'completed' | 'error' | 'skipped'

export interface SwarmStep {
  id: string
  type: StepType
  status: StepStatus
  label: string
  description?: string
  startedAt?: string
  completedAt?: string
  duration?: number
  metadata?: Record<string, unknown>
}

export interface SwarmProgressProps {
  steps: SwarmStep[]
  className?: string
  variant?: 'compact' | 'detailed' | 'timeline'
  showDurations?: boolean
  onStepClick?: (step: SwarmStep) => void
}

const stepIcons: Record<StepType, React.ElementType> = {
  tool_use: Terminal,
  file_edit: FileEdit,
  thinking: Zap,
  code_review: GitBranch,
  git_operation: GitBranch,
  test_execution: CheckCircle2,
  llm_call: MessageSquare,
  user_input: MessageSquare,
  error: Bug,
  complete: CheckCircle2,
}

const stepLabels: Record<StepType, string> = {
  tool_use: 'Tool Execution',
  file_edit: 'File Edit',
  thinking: 'Processing',
  code_review: 'Code Review',
  git_operation: 'Git Operation',
  test_execution: 'Tests',
  llm_call: 'AI Call',
  user_input: 'Waiting',
  error: 'Error',
  complete: 'Complete',
}

const statusStyles: Record<StepStatus, { bg: string; border: string; icon: string }> = {
  pending: {
    bg: 'bg-muted/50',
    border: 'border-border',
    icon: 'text-muted-foreground',
  },
  running: {
    bg: 'bg-primary/10',
    border: 'border-primary/50',
    icon: 'text-primary',
  },
  completed: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/50',
    icon: 'text-emerald-500',
  },
  error: {
    bg: 'bg-destructive/10',
    border: 'border-destructive/50',
    icon: 'text-destructive',
  },
  skipped: {
    bg: 'bg-muted/30',
    border: 'border-border/50',
    icon: 'text-muted-foreground',
  },
}

function formatDuration(ms: number): string {
  if (ms < 1000) return ms + 'ms'
  if (ms < 60000) return (ms / 1000).toFixed(1) + 's'
  const minutes = Math.floor(ms / 60000)
  const seconds = ((ms % 60000) / 1000).toFixed(0)
  return minutes + 'm ' + seconds + 's'
}

function getStepProgress(steps: SwarmStep[]): number {
  if (steps.length === 0) return 0
  const completed = steps.filter(s => s.status === 'completed' || s.status === 'skipped').length
  const running = steps.filter(s => s.status === 'running').length
  return Math.round(((completed + running * 0.5) / steps.length) * 100)
}

interface StepNodeProps {
  step: SwarmStep
  index: number
  isLast: boolean
  variant: SwarmProgressProps['variant']
  showDuration: boolean
  onClick?: () => void
}

function StepNode({ step, index, isLast, variant, showDuration, onClick }: StepNodeProps) {
  const Icon = stepIcons[step.type]
  const styles = statusStyles[step.status]
  const isClickable = !!onClick

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.05 }}
      className={cn(
        'relative flex items-start gap-3',
        variant === 'compact' && 'gap-2',
        isClickable && 'cursor-pointer'
      )}
      onClick={onClick}
    >
      {!isLast && (
        <motion.div
          className="absolute left-[19px] top-10 w-px bg-border"
          initial={{ height: 0 }}
          animate={{ height: 'calc(100% - 24px)' }}
          transition={{ duration: 0.3, delay: index * 0.05 }}
        />
      )}

      <motion.div
        className={cn(
          'relative z-10 flex-shrink-0 w-10 h-10 rounded-full border-2 flex items-center justify-center',
          styles.bg,
          styles.border,
          variant === 'compact' && 'w-8 h-8'
        )}
        animate={step.status === 'running' ? {
          scale: [1, 1.05, 1],
          boxShadow: [
            '0 0 0 0 rgba(var(--foco-teal-rgb), 0)',
            '0 0 0 4px rgba(var(--foco-teal-rgb), 0.2)',
            '0 0 0 0 rgba(var(--foco-teal-rgb), 0)',
          ],
        } : {}}
        transition={{ duration: 1.5, repeat: step.status === 'running' ? Infinity : 0 }}
      >
        {step.status === 'running' ? (
          <Loader2 className={cn('animate-spin', styles.icon, variant === 'compact' ? 'h-4 w-4' : 'h-5 w-5')} />
        ) : step.status === 'error' ? (
          <XCircle className={cn(styles.icon, variant === 'compact' ? 'h-4 w-4' : 'h-5 w-5')} />
        ) : step.status === 'completed' ? (
          <CheckCircle2 className={cn(styles.icon, variant === 'compact' ? 'h-4 w-4' : 'h-5 w-5')} />
        ) : (
          <Icon className={cn(styles.icon, variant === 'compact' ? 'h-4 w-4' : 'h-5 w-5')} />
        )}
      </motion.div>

      <div className={cn('flex-1 min-w-0 pb-4', variant === 'compact' && 'pb-2')}>
        <div className="flex items-center gap-2">
          <span className={cn(
            'font-medium',
            variant === 'compact' ? 'text-sm' : 'text-base',
            step.status === 'pending' && 'text-muted-foreground'
          )}>
            {step.label || stepLabels[step.type]}
          </span>
          {showDuration && step.duration && step.status !== 'pending' && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDuration(step.duration)}
            </span>
          )}
        </div>
        
        {variant === 'detailed' && step.description && (
          <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
        )}

        {variant === 'detailed' && step.metadata && Object.keys(step.metadata).length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {Object.entries(step.metadata).slice(0, 3).map(([key, value]) => (
              <span
                key={key}
                className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-secondary text-secondary-foreground"
              >
                {key}: {String(value).slice(0, 20)}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}

export function SwarmProgress({
  steps,
  className,
  variant = 'detailed',
  showDurations = true,
  onStepClick,
}: SwarmProgressProps) {
  const progress = useMemo(() => getStepProgress(steps), [steps])
  const activeSteps = useMemo(() => steps.filter(s => s.status !== 'pending').length, [steps])

  if (steps.length === 0) {
    return (
      <div className={cn('p-8 text-center text-muted-foreground', className)}>
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No steps recorded yet</p>
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Progress</span>
          <span className="text-xs text-muted-foreground">
            {activeSteps} of {steps.length} steps
          </span>
        </div>
        <span className="text-sm font-mono text-primary">{progress}%</span>
      </div>

      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-primary rounded-full"
          initial={{ width: 0 }}
          animate={{ width: progress + '%' }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        />
      </div>

      <div className="space-y-0">
        <AnimatePresence mode="popLayout">
          {steps.map((step, index) => (
            <StepNode
              key={step.id}
              step={step}
              index={index}
              isLast={index === steps.length - 1}
              variant={variant}
              showDuration={showDurations}
              onClick={onStepClick ? () => onStepClick(step) : undefined}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

export function SwarmProgressCompact({ steps, className }: { steps: SwarmStep[]; className?: string }) {
  const currentStep = steps.find(s => s.status === 'running')
  const progress = getStepProgress(steps)

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-primary rounded-full"
          initial={{ width: 0 }}
          animate={{ width: progress + '%' }}
          transition={{ duration: 0.3 }}
        />
      </div>
      {currentStep && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin text-primary" />
          <span className="truncate max-w-[120px]">{currentStep.label}</span>
        </div>
      )}
    </div>
  )
}

export function SwarmProgressDots({ steps, className }: { steps: SwarmStep[]; className?: string }) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      {steps.map((step, index) => (
        <motion.div
          key={step.id}
          className={cn(
            'w-2 h-2 rounded-full transition-colors duration-200',
            step.status === 'completed' && 'bg-emerald-500',
            step.status === 'running' && 'bg-primary',
            step.status === 'error' && 'bg-destructive',
            step.status === 'pending' && 'bg-muted-foreground/30'
          )}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: index * 0.03 }}
        />
      ))}
    </div>
  )
}

export default SwarmProgress
