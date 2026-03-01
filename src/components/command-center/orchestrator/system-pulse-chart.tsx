'use client'

import { useEffect, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { RefreshCw } from 'lucide-react'
import { Tooltip as ShadTooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface HealthSnapshot {
  t: string
  clawdbot_ms: number
  openclaw_ms: number
  up_count: number
}

export function SystemPulseChart() {
  const [data, setData] = useState<HealthSnapshot[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        setLoading(true)
        const res = await fetch('/api/empire/health')
        if (res.ok) {
          const json = await res.json()
          const services = json.services || []

          // Extract latencies
          const clawdbotService = services.find((s: any) => s.name === 'ClawdBot API')
          const openclawService = services.find((s: any) => s.name === 'OpenClaw Relay')
          const upCount = services.filter((s: any) => s.status === 'up').length

          const now = new Date()
          const timeStr = now.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })

          const snapshot: HealthSnapshot = {
            t: timeStr,
            clawdbot_ms: clawdbotService?.latencyMs || 0,
            openclaw_ms: openclawService?.latencyMs || 0,
            up_count: upCount,
          }

          setData(prev => {
            const updated = [...prev, snapshot]
            // Keep last 20 data points
            return updated.slice(-20)
          })
        }
      } catch (err) {
        console.error('Failed to fetch health:', err)
      } finally {
        setLoading(false)
      }
    }

    // Initial fetch
    fetchHealth()

    // Poll every 30s
    const id = setInterval(fetchHealth, 30_000)
    return () => clearInterval(id)
  }, [])

  const hasData = data.length > 0

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <ShadTooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">System Pulse</h3>
              {loading && <RefreshCw className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
            </div>
          </TooltipTrigger>
          <TooltipContent className="text-xs">Backend service response times over time</TooltipContent>
        </ShadTooltip>
        <ShadTooltip>
          <TooltipTrigger asChild>
            <span className="text-[11px] text-muted-foreground">{data.length} samples</span>
          </TooltipTrigger>
          <TooltipContent className="text-xs">Number of health check snapshots collected</TooltipContent>
        </ShadTooltip>
      </div>

      {hasData ? (
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorClawdbot" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="rgb(59, 130, 246)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="rgb(59, 130, 246)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorOpenclaw" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="rgb(168, 85, 247)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="rgb(168, 85, 247)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#e5e7eb"
              vertical={false}
            />
            <XAxis
              dataKey="t"
              tick={{ fontSize: 11 }}
              stroke="#6b7280"
            />
            <YAxis
              tick={{ fontSize: 11 }}
              stroke="#6b7280"
              label={{ value: 'Latency (ms)', angle: -90, position: 'insideLeft', offset: 8 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '4px',
              }}
              labelStyle={{ color: '#000000' }}
              formatter={(value: number | undefined) => value !== undefined ? `${Math.round(value)}ms` : '-'}
            />
            <Area
              type="monotone"
              dataKey="clawdbot_ms"
              stroke="rgb(59, 130, 246)"
              fillOpacity={1}
              fill="url(#colorClawdbot)"
              name="ClawdBot"
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="openclaw_ms"
              stroke="rgb(168, 85, 247)"
              fillOpacity={1}
              fill="url(#colorOpenclaw)"
              name="OpenClaw"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[240px] flex items-center justify-center text-[12px] text-muted-foreground">
          Waiting for health data...
        </div>
      )}
    </div>
  )
}
