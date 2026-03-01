'use client'

import { PageShell } from '@/components/layout/page-shell'
import { PageHeader } from '@/components/layout/page-header'
import { AgentRosterExtended } from '@/components/empire/agent-roster-extended'
import { Card, CardContent } from '@/components/ui/card'

const MODEL_LEGEND = [
  { badge: 'OPUS',   color: 'text-purple-600', desc: 'Claude Opus 4.6 — Planning, security review, complex reasoning' },
  { badge: 'SONNET', color: 'text-blue-600',   desc: 'Claude Sonnet 4.6 — Balanced execution and reasoning' },
  { badge: 'KIMI',   color: 'text-[color:var(--foco-teal)]', desc: 'Kimi K2.5 — Default execution, code generation, task running' },
  { badge: 'GLM-5',  color: 'text-amber-600',  desc: 'GLM-5 (Z.AI) — Fallback when Kimi is unavailable' },
]

export default function EmpireAgentsPage() {
  return (
    <PageShell>
      <PageHeader
        title="Agent Roster"
        subtitle="C-suite agents powering the ClawdBot Empire OS"
      />

      <div className="space-y-6 max-w-3xl">
        {/* Model tier legend */}
        <Card>
          <CardContent className="pt-4">
            <div className="text-[11px] font-mono-display text-muted-foreground uppercase tracking-widest mb-3">
              Model Tier Key
            </div>
            <div className="space-y-2">
              {MODEL_LEGEND.map(m => (
                <div key={m.badge} className="flex items-start gap-3">
                  <span className={`text-[11px] font-mono-display font-bold w-14 flex-shrink-0 ${m.color}`}>
                    {m.badge}
                  </span>
                  <span className="text-[12px] text-muted-foreground">{m.desc}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <AgentRosterExtended />
      </div>
    </PageShell>
  )
}
