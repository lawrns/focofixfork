import { NextResponse } from 'next/server'
import fs from 'node:fs/promises'
import { getOpenClawOperatorPulse } from '@/lib/openclaw/operator-pulse'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function readProcStat(): Promise<number> {
  try {
    const lines = (await fs.readFile('/proc/stat', 'utf8')).split('\n')
    const cpu = lines[0].split(/\s+/).slice(1).map(Number)
    const idle = cpu[3] + cpu[4]
    const total = cpu.reduce((a, b) => a + b, 0)
    return Math.round(((total - idle) / total) * 100)
  } catch {
    return 0
  }
}

async function readMemInfo(): Promise<{ usedGb: number; totalGb: number }> {
  try {
    const raw = await fs.readFile('/proc/meminfo', 'utf8')
    const get = (key: string) => {
      const m = raw.match(new RegExp(`^${key}:\\s+(\\d+)`, 'm'))
      return m ? parseInt(m[1]) * 1024 : 0 // kB → bytes
    }
    const total = get('MemTotal')
    const free = get('MemFree')
    const buffers = get('Buffers')
    const cached = get('Cached')
    const used = total - free - buffers - cached
    return {
      usedGb: Math.round((used / 1e9) * 10) / 10,
      totalGb: Math.round((total / 1e9) * 10) / 10,
    }
  } catch {
    return { usedGb: 0, totalGb: 0 }
  }
}

export async function GET() {
  try {
    const [pulse, cpuPercent, mem] = await Promise.all([
      getOpenClawOperatorPulse(),
      readProcStat(),
      readMemInfo(),
    ])

    return NextResponse.json({
      gateway: {
        healthy: pulse.gateway.healthy,
        url: pulse.gateway.url,
        version: pulse.gateway.version,
        model: pulse.gateway.primaryModel,
        heartbeatInterval: pulse.gateway.heartbeatInterval,
      },
      crons: {
        total: pulse.crons.total,
        enabled: pulse.crons.enabled,
        failing: pulse.crons.failing,
        healthy: pulse.crons.failing === 0 && pulse.crons.enabled > 0,
      },
      stream: {
        connected: pulse.gateway.healthy,
      },
      system: {
        cpuPercent,
        memUsedGb: mem.usedGb,
        memTotalGb: mem.totalGb,
        memPercent: mem.totalGb > 0 ? Math.round((mem.usedGb / mem.totalGb) * 100) : 0,
      },
      signalStrength: pulse.signalStrength,
      alerts: pulse.alerts,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
