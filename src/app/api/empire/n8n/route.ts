import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const N8N_URL    = process.env.N8N_URL    ?? 'http://127.0.0.1:5678'
const N8N_API_KEY = process.env.N8N_API_KEY ?? ''

export async function GET(_req: NextRequest) {
  if (!N8N_API_KEY) {
    return NextResponse.json({ workflows: [], error: 'N8N_API_KEY not configured' })
  }

  try {
    const res = await fetch(`${N8N_URL}/api/v1/workflows?limit=20`, {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY },
      signal: AbortSignal.timeout(5000),
    })

    if (!res.ok) {
      return NextResponse.json({ workflows: [], error: `n8n HTTP ${res.status}` })
    }

    const data = (await res.json()) as {
      data?: Array<{
        id?: string
        name?: string
        active?: boolean
        updatedAt?: string
        tags?: Array<{ name: string }>
      }>
    }

    const workflows = (data.data ?? []).map(w => ({
      id:        w.id ?? '',
      name:      w.name ?? '',
      active:    w.active ?? false,
      updatedAt: w.updatedAt ?? null,
      tags:      (w.tags ?? []).map(t => t.name),
    }))

    return NextResponse.json({ workflows })
  } catch {
    return NextResponse.json({ workflows: [], error: 'n8n unreachable' })
  }
}
