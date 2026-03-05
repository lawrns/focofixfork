'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Bot, Filter, ShieldAlert, Workflow } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type WorkflowRow = {
  id: string
  workflow_id: string
  name: string
  enabled: boolean
  risk_tier: 'low' | 'medium' | 'high'
  owner_agent: string
  last_status: string | null
  last_run_at: string | null
  next_run_at: string | null
  project_id: string
  project_name: string | null
  project_slug: string | null
}

function riskTone(risk: string) {
  if (risk === 'high') return 'bg-rose-500/10 text-rose-700 border-rose-500/20'
  if (risk === 'medium') return 'bg-amber-500/10 text-amber-700 border-amber-500/20'
  return 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20'
}

export default function EmpireProjectWorkflowsPage() {
  const [rows, setRows] = useState<WorkflowRow[]>([])
  const [status, setStatus] = useState('all')
  const [risk, setRisk] = useState('all')
  const [ownerAgent, setOwnerAgent] = useState('')

  const load = useCallback(async () => {
    const params = new URLSearchParams()
    if (status !== 'all') params.set('status', status)
    if (risk !== 'all') params.set('risk_tier', risk)
    if (ownerAgent.trim()) params.set('owner_agent', ownerAgent.trim())
    const res = await fetch(`/api/empire/project-workflows?${params.toString()}`)
    const json = await res.json().catch(() => ({}))
    setRows(json?.data?.workflows ?? [])
  }, [ownerAgent, risk, status])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-slate-200 shadow-sm">
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-sky-800 px-6 py-5 text-white">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium">
            <Workflow className="h-3.5 w-3.5" />
            Cross-project workflow operations
          </div>
          <h1 className="mt-3 text-2xl font-semibold">Empire Project Workflows</h1>
          <p className="mt-1 text-sm text-white/75">Monitor project-scoped n8n workflows across the workspace portfolio without mixing them into the 12-phase orchestration engine.</p>
        </div>
      </Card>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
          <CardDescription>Filter by workflow state, owner agent, and risk tier.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="running">Running</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Select value={risk} onValueChange={setRisk}>
            <SelectTrigger><SelectValue placeholder="Risk tier" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All risk tiers</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
          <Input placeholder="Owner agent" value={ownerAgent} onChange={(event) => setOwnerAgent(event.target.value)} />
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {rows.map((row) => (
          <Card key={row.id} className="border-slate-200 shadow-sm">
            <CardContent className="flex flex-col gap-4 pt-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="font-medium">{row.name}</div>
                  <Badge className={riskTone(row.risk_tier)}>{row.risk_tier}</Badge>
                  <Badge variant={row.enabled ? 'default' : 'secondary'}>{row.enabled ? 'active' : 'inactive'}</Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  {row.project_name ?? 'Unknown project'} · {row.last_status ?? 'pending'} · owner {row.owner_agent}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <div>Last run: {row.last_run_at ? new Date(row.last_run_at).toLocaleString() : 'Not yet run'}</div>
                <div>Next run: {row.next_run_at ? new Date(row.next_run_at).toLocaleString() : 'Event-driven'}</div>
                <Link href={row.project_slug ? `/projects/${row.project_slug}` : '/empire/missions'} className="font-medium text-sky-600 hover:underline">
                  Open project
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
        {rows.length === 0 && (
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="py-12 text-center">
              <ShieldAlert className="mx-auto mb-3 h-8 w-8 text-slate-400" />
              <div className="font-medium">No project workflows match these filters</div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
