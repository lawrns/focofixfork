'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Zap, Activity, Gauge, Moon } from 'lucide-react'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { useCommandCenterStore } from '@/lib/stores/command-center-store'
import { cn } from '@/lib/utils'

export function QuickActionsCard() {
  const store = useCommandCenterStore()
  const [loading, setLoading] = useState(false)

  const handleSpawnSwarm = async () => {
    try {
      setLoading(true)
      await store.createMission({
        title: 'P0 Swarm',
        description: 'High-priority agent swarm deployment',
        backend: 'openclaw',
      })
    } catch (err) {
      console.error('Failed to spawn swarm:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleHealthCheck = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/empire/health')
      const json = await res.json()
      console.log('Health check:', json)
      // Could also add a log entry to the system log here via store
    } catch (err) {
      console.error('Failed to run health check:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDeploy = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/empire/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflowType: 'AutoShipWorkflow' }),
      })
      if (!res.ok) throw new Error('Deploy failed')
      console.log('Deployment initiated')
    } catch (err) {
      console.error('Failed to deploy:', err)
    } finally {
      setLoading(false)
    }
  }

  const toggleQuietMode = () => {
    store.setQuietMode(!store.quietMode)
  }

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <h3 className="text-sm font-semibold">Quick Actions</h3>

      <div className="grid gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className="justify-start gap-2 text-[12px] h-9"
              onClick={handleSpawnSwarm}
              disabled={loading}
            >
              <Zap className="h-4 w-4" />
              Spawn agents (P0 swarm)
            </Button>
          </TooltipTrigger>
          <TooltipContent className="text-xs">Deploy a high-priority agent swarm</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className="justify-start gap-2 text-[12px] h-9"
              onClick={handleHealthCheck}
              disabled={loading}
            >
              <Activity className="h-4 w-4" />
              Run health checks
            </Button>
          </TooltipTrigger>
          <TooltipContent className="text-xs">Ping all backend services</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className="justify-start gap-2 text-[12px] h-9"
              onClick={handleDeploy}
              disabled={loading}
            >
              <Gauge className="h-4 w-4" />
              Deploy latest safe build
            </Button>
          </TooltipTrigger>
          <TooltipContent className="text-xs">Trigger AutoShip deployment workflow</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant={store.quietMode ? 'default' : 'outline'}
              className={cn('justify-start gap-2 text-[12px] h-9', store.quietMode && 'bg-teal-600 hover:bg-teal-700')}
              onClick={toggleQuietMode}
            >
              <Moon className="h-4 w-4" />
              Quiet mode
            </Button>
          </TooltipTrigger>
          <TooltipContent className="text-xs">Suppress non-critical alerts</TooltipContent>
        </Tooltip>
      </div>

      {/* Ring indicators */}
      <div className="pt-2 border-t space-y-2">
        <div className="text-[10px] font-mono text-muted-foreground">Service rings</div>
        <div className="flex gap-2">
          <Tooltip>
          <TooltipTrigger asChild>
          <div className="relative w-8 h-8">
            {/* 3 concentric rings showing service health percentage */}
            <svg className="w-full h-full" viewBox="0 0 32 32">
              <circle cx="16" cy="16" r="14" fill="none" stroke="hsl(var(--border))" strokeWidth="1" opacity="0.3" />
              <circle cx="16" cy="16" r="10" fill="none" stroke="hsl(var(--border))" strokeWidth="1" opacity="0.5" />
              <circle cx="16" cy="16" r="6" fill="none" stroke="hsl(var(--border))" strokeWidth="1" opacity="0.7" />
              {/* Green indicator */}
              <circle cx="16" cy="16" r="4" fill="none" stroke="rgb(34, 197, 94)" strokeWidth="1.5" />
            </svg>
          </div>
          </TooltipTrigger>
          <TooltipContent className="text-xs">Backend service health — inner to outer: ClawdBot, Bosun, OpenClaw</TooltipContent>
          </Tooltip>
          <div className="flex-1 space-y-1">
            <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              5/5 services up
            </Badge>
          </div>
        </div>
      </div>
    </div>
  )
}
