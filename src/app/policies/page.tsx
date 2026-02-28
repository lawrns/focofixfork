'use client'

import { useState, useEffect } from 'react'
import { PauseCircle, PlayCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageShell } from '@/components/layout/page-shell'
import { PageHeader } from '@/components/layout/page-header'
import { useAuth } from '@/lib/hooks/use-auth'
import { toast } from 'sonner'

export default function PoliciesPage() {
  const { user, loading } = useAuth()
  const [fleetPaused, setFleetPaused] = useState(false)
  const [pausing, setPausing] = useState(false)

  useEffect(() => {
    if (!user) return
    fetch('/api/policies/fleet-status')
      .then(r => r.json())
      .then(d => { if (typeof d.paused === 'boolean') setFleetPaused(d.paused) })
      .catch(() => {})
  }, [user])

  async function toggleFleet() {
    setPausing(true)
    try {
      const action = fleetPaused ? 'resume' : 'pause'
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

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[color:var(--foco-teal)]" /></div>
  if (!user) return null

  return (
    <PageShell>
      <PageHeader title="Policies" subtitle="Guardrails and fleet controls" />

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
                onClick={toggleFleet}
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

      </div>
    </PageShell>
  )
}
