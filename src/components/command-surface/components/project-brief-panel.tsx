'use client'

import { Lightbulb } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

type ProjectBriefDraft = {
  name: string
  goal: string
  scope: string
  timeline: string
  owner: string
}

export function ProjectBriefPanel({
  projectBrief,
  setProjectBrief,
  onCancel,
  onContinue,
}: {
  projectBrief: ProjectBriefDraft
  setProjectBrief: React.Dispatch<React.SetStateAction<ProjectBriefDraft>>
  onCancel: () => void
  onContinue: () => void
}) {
  return (
    <div className="space-y-4 rounded-xl border border-amber-200 bg-amber-50/50 p-5 dark:border-amber-800 dark:bg-amber-950/20">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/50">
          <Lightbulb className="h-4 w-4 text-amber-600" />
        </div>
        <div>
          <p className="text-sm font-semibold">Before I create this project, define the brief</p>
          <p className="mt-1 text-xs text-muted-foreground">
            This keeps creation actionable instead of generating a generic implementation plan.
          </p>
        </div>
      </div>
      <div className="grid gap-3">
        <Input placeholder="Project name" value={projectBrief.name} onChange={(e) => setProjectBrief((prev) => ({ ...prev, name: e.target.value }))} className="bg-background/50" />
        <Textarea placeholder="Primary goal (what success looks like)" value={projectBrief.goal} onChange={(e) => setProjectBrief((prev) => ({ ...prev, goal: e.target.value }))} rows={2} className="resize-none bg-background/50" />
        <Textarea placeholder="Scope (key deliverables, constraints)" value={projectBrief.scope} onChange={(e) => setProjectBrief((prev) => ({ ...prev, scope: e.target.value }))} rows={2} className="resize-none bg-background/50" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input placeholder="Timeline (e.g. 2 weeks)" value={projectBrief.timeline} onChange={(e) => setProjectBrief((prev) => ({ ...prev, timeline: e.target.value }))} className="bg-background/50" />
          <Input placeholder="Owner" value={projectBrief.owner} onChange={(e) => setProjectBrief((prev) => ({ ...prev, owner: e.target.value }))} className="bg-background/50" />
        </div>
      </div>
      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
        <Button size="sm" onClick={onContinue}>Continue</Button>
      </div>
    </div>
  )
}
