'use client'

import { useState, useEffect } from 'react'
import { PauseCircle, PlayCircle, Plus, Shield, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageShell } from '@/components/layout/page-shell'
import { PageHeader } from '@/components/layout/page-header'
import { useAuth } from '@/lib/hooks/use-auth'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface FleetPolicy {
  id: string
  name: string
  scope: string
  trigger_condition: string
  action: string
  enabled: boolean
  created_at: string
}

const TRIGGER_OPTIONS = [
  { value: 'before_delete', label: 'Before Delete' },
  { value: 'before_deploy', label: 'Before Deploy' },
  { value: 'high_cost_run', label: 'High Cost Run' },
  { value: 'agent_error', label: 'Agent Error' },
  { value: 'schema_change', label: 'Schema Change' },
]

const ACTION_OPTIONS = [
  { value: 'require_approval', label: 'Require Approval' },
  { value: 'block', label: 'Block' },
  { value: 'notify', label: 'Notify Only' },
]

export default function PoliciesPage() {
  const { user, loading } = useAuth()
  const [fleetPaused, setFleetPaused] = useState(false)
  const [pausing, setPausing] = useState(false)
  const [confirmPauseOpen, setConfirmPauseOpen] = useState(false)
  const [policies, setPolicies] = useState<FleetPolicy[]>([])
  const [policiesLoading, setPoliciesLoading] = useState(true)
  const [policyDialogOpen, setPolicyDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newPolicy, setNewPolicy] = useState({
    name: '',
    scope: 'global',
    trigger_condition: '',
    action: '',
  })

  useEffect(() => {
    if (!user) return
    fetch('/api/policies/fleet-status')
      .then(r => r.json())
      .then(d => { if (typeof d.paused === 'boolean') setFleetPaused(d.paused) })
      .catch(() => {})
  }, [user])

  useEffect(() => {
    if (!user) return
    setPoliciesLoading(true)
    fetch('/api/policies', { credentials: 'include' })
      .then(r => r.json())
      .then(d => setPolicies(d.data ?? []))
      .catch(() => {})
      .finally(() => setPoliciesLoading(false))
  }, [user])

  function handleToggleClick() {
    if (fleetPaused) {
      executeToggle('resume')
    } else {
      setConfirmPauseOpen(true)
    }
  }

  async function executeToggle(action: 'pause' | 'resume') {
    setPausing(true)
    try {
      const res = await fetch('/api/policies/pause-fleet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (res.ok) {
        setFleetPaused(!fleetPaused)
        if (action === 'pause') {
          toast.warning('Fleet paused — all autonomous agents stopped')
        } else {
          toast.success('Fleet resumed')
        }
      } else {
        toast.error('Failed to update fleet status')
      }
    } finally {
      setPausing(false)
    }
  }

  async function handleCreatePolicy() {
    if (!newPolicy.name || !newPolicy.trigger_condition || !newPolicy.action) {
      toast.error('Name, trigger condition, and action are required')
      return
    }
    setCreating(true)
    try {
      const res = await fetch('/api/policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newPolicy),
      })
      const data = await res.json()
      if (res.ok) {
        setPolicies(prev => [data.data, ...prev])
        setPolicyDialogOpen(false)
        setNewPolicy({ name: '', scope: 'global', trigger_condition: '', action: '' })
        toast.success('Policy created')
      } else {
        toast.error(data.error || 'Failed to create policy')
      }
    } finally {
      setCreating(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[color:var(--foco-teal)]" /></div>
  if (!user) return null

  return (
    <PageShell>
      <PageHeader
        title="Fleet Policies"
        subtitle="Guardrails and fleet controls"
        primaryAction={
          <Button size="sm" onClick={() => setPolicyDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            New Policy
          </Button>
        }
      />

      <div className="grid gap-4 max-w-2xl">
        {/* Fleet Kill Switch */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-start gap-3">
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${fleetPaused ? 'bg-red-500/15' : 'bg-[color:var(--foco-teal-dim)]'}`}>
              {fleetPaused
                ? <PauseCircle className="h-5 w-5 text-red-500" />
                : <PlayCircle className="h-5 w-5 text-[color:var(--foco-teal)]" />}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-semibold">Fleet Kill Switch</h3>
                <Badge variant={fleetPaused ? 'destructive' : 'secondary'}>
                  {fleetPaused ? 'PAUSED' : 'ACTIVE'}
                </Badge>
              </div>
              <p className="text-[13px] text-muted-foreground mb-3">
                Immediately halt all autonomous agent activity — all agents and scheduled crons.
              </p>
              <Button
                variant={fleetPaused ? 'default' : 'destructive'}
                size="sm"
                onClick={handleToggleClick}
                disabled={pausing}
              >
                {fleetPaused ? (
                  <><PlayCircle className="h-4 w-4 mr-2" />Resume Fleet</>
                ) : (
                  <><PauseCircle className="h-4 w-4 mr-2" />Pause Fleet</>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Policy list */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold mb-3">Governance Policies</h3>
          {policiesLoading ? (
            <p className="text-[13px] text-muted-foreground">Loading…</p>
          ) : policies.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">No policies defined. Create one to start governing agent actions.</p>
          ) : (
            <div className="space-y-2">
              {policies.map(policy => (
                <div key={policy.id} className="flex items-start gap-3 p-3 rounded-lg border border-border">
                  <Shield className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-[13px] font-medium">{policy.name}</span>
                      <Badge variant="outline" className="text-[10px] capitalize">{policy.scope}</Badge>
                      <Badge variant="outline" className="text-[10px]">{policy.trigger_condition}</Badge>
                      <Badge
                        className={`text-[10px] border-0 ${
                          policy.action === 'block' ? 'bg-red-500/15 text-red-600 dark:text-red-400' :
                          policy.action === 'require_approval' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' :
                          'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                        }`}
                      >
                        {policy.action}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Created {new Date(policy.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* New Policy Dialog */}
      <Dialog open={policyDialogOpen} onOpenChange={setPolicyDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Fleet Policy</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="policy-name">Name</Label>
              <Input
                id="policy-name"
                value={newPolicy.name}
                onChange={e => setNewPolicy(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Block all deletes in production"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Scope</Label>
              <Select
                value={newPolicy.scope}
                onValueChange={v => setNewPolicy(p => ({ ...p, scope: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">Global (all projects)</SelectItem>
                  <SelectItem value="project">Project-specific</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Trigger Condition</Label>
              <Select
                value={newPolicy.trigger_condition}
                onValueChange={v => setNewPolicy(p => ({ ...p, trigger_condition: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select trigger…" />
                </SelectTrigger>
                <SelectContent>
                  {TRIGGER_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Action</Label>
              <Select
                value={newPolicy.action}
                onValueChange={v => setNewPolicy(p => ({ ...p, action: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select action…" />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPolicyDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreatePolicy} disabled={creating}>
              {creating ? 'Creating…' : 'Create Policy'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pause Fleet Confirmation Dialog */}
      <AlertDialog open={confirmPauseOpen} onOpenChange={setConfirmPauseOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Halt all agents?</AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately stop all active runs and scheduled crons.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => executeToggle('pause')}
            >
              Pause Fleet
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  )
}
