'use client'

import { useCallback, useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Moon, RefreshCw, Square } from 'lucide-react'
import { toast } from 'sonner'
import { NightAutonomyLaunchDialog } from '@/components/autonomy/night-autonomy-launch-dialog'

interface AutonomySession {
  id: string
  status: string
  objective: string | null
  window_start: string
  selected_agent?: { name?: string } | null
  selected_project_ids?: string[] | null
}

interface MorningSummary {
  sessions: number
  executedActions: number
  blockedActions: number
  pendingDecisions: number
}

export function NightAutonomyCard() {
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [activeSession, setActiveSession] = useState<AutonomySession | null>(null)
  const [summary, setSummary] = useState<MorningSummary | null>(null)

  const loadData = useCallback(async () => {
    try {
      setRefreshing(true)
      const [sessionsRes, reportRes] = await Promise.all([
        fetch('/api/autonomy/sessions?status=running&limit=1'),
        fetch('/api/autonomy/reports/morning?sinceHours=12'),
      ])

      if (sessionsRes.ok) {
        const sessionsJson = await sessionsRes.json()
        const session = sessionsJson?.data?.sessions?.[0] as AutonomySession | undefined
        setActiveSession(session ?? null)
      }

      if (reportRes.ok) {
        const reportJson = await reportRes.json()
        setSummary((reportJson?.data?.summary as MorningSummary | undefined) ?? null)
      }
    } catch (error) {
      console.error('Failed to load night autonomy card data', error)
    } finally {
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const stopNightMode = async () => {
    if (!activeSession) return
    try {
      setLoading(true)
      const res = await fetch('/api/autonomy/sessions/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: activeSession.id, reason: 'Manual stop from Command Center' }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error?.message ?? 'Failed to stop night mode')
      toast.success('Night co-founder mode stopped')
      await loadData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to stop night mode')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border border-zinc-200/80 dark:border-zinc-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Moon className="h-4 w-4 text-[color:var(--foco-teal)]" />
            <CardTitle className="text-sm">Night Autonomy</CardTitle>
          </div>
          <Badge variant="outline" className="text-[10px]">
            {activeSession ? 'Running' : 'Idle'}
          </Badge>
        </div>
        <CardDescription>
          Start or stop overnight autonomous co-founder execution and review latest outcomes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="rounded-md border p-2">
            <div className="text-muted-foreground">Executed</div>
            <div className="text-sm font-semibold">{summary?.executedActions ?? 0}</div>
          </div>
          <div className="rounded-md border p-2">
            <div className="text-muted-foreground">Blocked</div>
            <div className="text-sm font-semibold">{summary?.blockedActions ?? 0}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeSession ? (
            <Button
              size="sm"
              variant="destructive"
              className="h-8 text-[12px] gap-1.5"
              onClick={stopNightMode}
              disabled={loading}
            >
              <Square className="h-3.5 w-3.5" />
              Stop Night Mode
            </Button>
          ) : (
            <NightAutonomyLaunchDialog
              onStarted={loadData}
              onStopped={loadData}
              trigger={(
                <Button
                  size="sm"
                  className="h-8 text-[12px] gap-1.5 bg-[color:var(--foco-teal)] hover:bg-[color:var(--foco-teal)]/90"
                >
                  <Moon className="h-3.5 w-3.5" />
                  Configure Night Mode
                </Button>
              )}
            />
          )}
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-[12px] gap-1.5"
            onClick={loadData}
            disabled={refreshing}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {activeSession && (
          <div className="text-[11px] text-muted-foreground">
            Active session started {new Date(activeSession.window_start).toLocaleString()}
            {activeSession.selected_agent?.name ? ` with ${activeSession.selected_agent.name}` : ''}
            {activeSession.selected_project_ids?.length ? ` across ${activeSession.selected_project_ids.length} repos.` : '.'}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
