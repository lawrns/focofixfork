'use client'

import { useState, useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Eye, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCommandCenterStore } from '@/lib/stores/command-center-store'
import { AGENT_STATUS_COLORS, AGENT_STATUS_DOT, BACKEND_LABELS } from '@/lib/command-center/types'
import type { AgentBackend, AgentNodeStatus } from '@/lib/command-center/types'

export function AgentTable() {
  const store = useCommandCenterStore()
  const [search, setSearch] = useState('')
  const [filterBackend, setFilterBackend] = useState<AgentBackend | 'all'>('all')
  const [filterStatus, setFilterStatus] = useState<AgentNodeStatus | 'all'>('all')

  const filtered = useMemo(() => {
    return store.agents.filter(a => {
      if (filterBackend !== 'all' && a.backend !== filterBackend) return false
      if (filterStatus !== 'all' && a.status !== filterStatus) return false
      if (search && !a.name.toLowerCase().includes(search.toLowerCase()) &&
          !a.role.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [store.agents, filterBackend, filterStatus, search])

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search agents…"
            className="pl-8 h-8 text-sm"
          />
        </div>

        <select
          value={filterBackend}
          onChange={e => setFilterBackend(e.target.value as AgentBackend | 'all')}
          className="h-8 rounded-md border border-input bg-background px-2 text-sm"
        >
          <option value="all">All backends</option>
          {(['crico','clawdbot','bosun','openclaw'] as AgentBackend[]).map(b => (
            <option key={b} value={b}>{BACKEND_LABELS[b]}</option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as AgentNodeStatus | 'all')}
          className="h-8 rounded-md border border-input bg-background px-2 text-sm"
        >
          <option value="all">All statuses</option>
          {(['idle','working','blocked','done','error','paused'] as AgentNodeStatus[]).map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Name</th>
              <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground hidden sm:table-cell">Backend</th>
              <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Status</th>
              <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground hidden md:table-cell">Model</th>
              <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground hidden lg:table-cell">Last Active</th>
              <th className="px-3 py-2 w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-sm text-muted-foreground">
                  No agents match filters
                </td>
              </tr>
            ) : filtered.map(agent => (
              <tr key={agent.id} className="bg-card hover:bg-accent/30 transition-colors">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className={cn('h-1.5 w-1.5 rounded-full flex-shrink-0', AGENT_STATUS_DOT[agent.status])} />
                    <span className="font-medium truncate max-w-[140px]">{agent.name}</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground pl-3.5">{agent.role}</span>
                </td>
                <td className="px-3 py-2 hidden sm:table-cell">
                  <Badge variant="outline" className="text-[10px]">{BACKEND_LABELS[agent.backend]}</Badge>
                </td>
                <td className="px-3 py-2">
                  <Badge className={cn('text-[10px] border-0', AGENT_STATUS_COLORS[agent.status])}>
                    {agent.status}
                  </Badge>
                </td>
                <td className="px-3 py-2 hidden md:table-cell text-[11px] text-muted-foreground">
                  {agent.model ?? '—'}
                </td>
                <td className="px-3 py-2 hidden lg:table-cell text-[11px] text-muted-foreground">
                  {agent.lastActiveAt ? new Date(agent.lastActiveAt).toLocaleString() : '—'}
                </td>
                <td className="px-3 py-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => store.selectAgent(agent.id)}
                    title="Inspect agent"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
