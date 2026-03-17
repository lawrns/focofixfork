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

async function readMemInfo(): Promise<{ usedGb: number; totalGb: number; percent: number }> {
  try {
    const raw = await fs.readFile('/proc/meminfo', 'utf8')
    const get = (key: string) => {
      const m = raw.match(new RegExp(`^${key}:\\s+(\\d+)`, 'm'))
      return m ? parseInt(m[1]) * 1024 : 0
    }
    const total = get('MemTotal')
    const free = get('MemFree')
    const buffers = get('Buffers')
    const cached = get('Cached')
    const used = total - free - buffers - cached
    const usedGb = Math.round((used / 1e9) * 10) / 10
    const totalGb = Math.round((total / 1e9) * 10) / 10
    return {
      usedGb,
      totalGb,
      percent: totalGb > 0 ? Math.round((usedGb / totalGb) * 100) : 0,
    }
  } catch {
    return { usedGb: 0, totalGb: 0, percent: 0 }
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
      ...pulse,
      system: {
        cpuPercent,
        memUsedGb: mem.usedGb,
        memTotalGb: mem.totalGb,
        memPercent: mem.percent,
      },
    })
  } catch (err) {
    console.error('[operator-pulse] Failed to aggregate pulse:', err)
    return NextResponse.json(
      { error: 'Failed to compute operator pulse', detail: String(err) },
      { status: 500 },
    )
  }
}
