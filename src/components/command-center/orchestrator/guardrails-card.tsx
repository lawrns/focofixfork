'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ShieldAlert, Info } from 'lucide-react'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { useCommandCenterStore } from '@/lib/stores/command-center-store'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

const MODE_DESCRIPTIONS: Record<string, { description: string; policies: string[] }> = {
  Reactive: {
    description: 'Respond to events as they occur. Limited guardrails, faster execution.',
    policies: [
      'Immediate action on triggers',
      'P1+ decisions require human approval',
      'Auto-rollback on errors',
    ],
  },
  Predictive: {
    description: 'Anticipate system needs and pre-stage resources. Balanced safety and performance.',
    policies: [
      'Predictive resource scaling',
      'P0+ decisions require human approval',
      'Validation before execution',
      'Audit all changes',
    ],
  },
  Guarded: {
    description: 'Maximum safety. All significant actions require explicit approval.',
    policies: [
      'All decisions logged and auditable',
      'P0+ decisions require human approval',
      'Sandbox all experiments',
      ' 2-person review for production',
      'Full rollback capability required',
    ],
  },
}

export function GuardrailsCard() {
  const store = useCommandCenterStore()
  const [policyDialogOpen, setPolicyDialogOpen] = useState(false)

  const modeConfig = MODE_DESCRIPTIONS[store.mode]
  const agentCount = store.agents.length
  const resourceUsage = Math.min(100, (agentCount / 10) * 100)

  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold">Guardrails</h3>
        <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400">
          {store.mode}
        </Badge>
      </div>

      {/* Mode description */}
      <div className="space-y-2 text-[12px]">
        <p className="text-muted-foreground leading-relaxed">{modeConfig.description}</p>
        <div className="space-y-1">
          {modeConfig.policies.map((policy, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground">{policy}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Resource limiter */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="space-y-1.5 pt-2 border-t">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-muted-foreground">Resource limiter</span>
              <span className="text-foreground">{agentCount}/10 agents</span>
            </div>
            <div className="w-full h-2 rounded-full bg-muted-foreground/20 overflow-hidden">
              <div
                className={cn(
                  'h-full transition-all duration-300',
                  resourceUsage <= 50 ? 'bg-emerald-500' :
                  resourceUsage <= 80 ? 'bg-amber-500' :
                  'bg-rose-500'
                )}
                style={{ width: `${resourceUsage}%` }}
              />
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent className="text-xs">Agent count vs. safety limit (max 10)</TooltipContent>
      </Tooltip>

      {/* Escalation ladder */}
      <div className="space-y-1.5 pt-2 border-t">
        <div className="text-[11px] font-mono text-muted-foreground">Escalation ladder</div>
        <div className="space-y-1 text-[11px]">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 p-2 rounded bg-muted/50">
                <span className="font-mono text-emerald-600 dark:text-emerald-400">→</span>
                <span className="text-muted-foreground">Telegram alert</span>
              </div>
            </TooltipTrigger>
            <TooltipContent className="text-xs">First response — immediate Telegram notification</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 p-2 rounded bg-muted/50">
                <span className="font-mono text-amber-600 dark:text-amber-400">→</span>
                <span className="text-muted-foreground">Email escalation</span>
              </div>
            </TooltipTrigger>
            <TooltipContent className="text-xs">After 30 min unacknowledged — email sent</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 p-2 rounded bg-muted/50">
                <span className="font-mono text-rose-600 dark:text-rose-400">→</span>
                <span className="text-muted-foreground">SMS critical alert</span>
              </div>
            </TooltipTrigger>
            <TooltipContent className="text-xs">After 1 hour unacknowledged — SMS sent</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 p-2 rounded bg-muted/50">
                <span className="font-mono text-rose-700 dark:text-rose-300">⚠</span>
                <span className="text-muted-foreground">4-hour SLA breach</span>
              </div>
            </TooltipTrigger>
            <TooltipContent className="text-xs">SLA breach — all agents paused, full incident review</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* P0 Policy dialog */}
      <div className="pt-2 border-t">
        <Dialog open={policyDialogOpen} onOpenChange={setPolicyDialogOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className="w-full gap-2 text-[12px] h-8"
              title="View policy for destructive actions"
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              View P0 policy
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>P0 — Destructive Actions Policy</DialogTitle>
              <DialogDescription>
                Actions that modify or delete critical data
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 text-[12px]">
              <p>
                <strong>Definition:</strong> Any action involving database schema changes, deployment changes, or data deletion.
              </p>
              <p>
                <strong>Requirements:</strong>
              </p>
              <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                <li>Explicit human approval required</li>
                <li>Confidence score must be ≥ 0.85</li>
                <li>Rollback plan must exist and be tested</li>
                <li>In production: 2-person review + backup confirmation</li>
                <li>Full audit trail required</li>
              </ul>
              <p className="text-muted-foreground italic">
                In case of conflict, human judgment overrides all automation.
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
