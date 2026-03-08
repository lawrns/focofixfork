'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, ExternalLink, Info } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface ProviderStatus {
  available: boolean
  label: string
}

interface AIRoutingHelpProps {
  providerStatus?: Record<string, ProviderStatus>
  clawdbotReachable?: boolean
}

export function AIRoutingHelp({ providerStatus, clawdbotReachable }: AIRoutingHelpProps) {
  const [open, setOpen] = useState(false)

  return (
    <Card className="border-dashed">
      <CardHeader
        className="cursor-pointer select-none py-3"
        onClick={() => setOpen((o) => !o)}
      >
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Info className="h-4 w-4 shrink-0" />
          How model routing works
          {open ? (
            <ChevronDown className="ml-auto h-4 w-4" />
          ) : (
            <ChevronRight className="ml-auto h-4 w-4" />
          )}
        </CardTitle>
      </CardHeader>

      {open && (
        <CardContent className="space-y-5 pt-0">

          {/* Resolution hierarchy */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Resolution order</p>
            <ol className="space-y-1.5 text-sm">
              {[
                ['Workspace override', 'Model set explicitly per phase in this settings panel'],
                ['ClawdBot profile', 'EMPIRE_*_MODEL env vars loaded by ClawdBot on startup'],
                ['Env fallback', 'Code-level defaults (claude-opus-4-6 / claude-sonnet-4-6)'],
              ].map(([title, desc], i) => (
                <li key={i} className="flex gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-bold">
                    {i + 1}
                  </span>
                  <span>
                    <span className="font-medium">{title}</span>
                    <span className="ml-1 text-muted-foreground">— {desc}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>

          {/* Phase explanations */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pipeline phases</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {[
                {
                  phase: 'Planning',
                  default: 'Claude Opus 4.6',
                  desc: 'Understands the task, decomposes it into steps, and produces an execution plan. Needs strong reasoning.',
                },
                {
                  phase: 'Execution',
                  default: 'Claude Sonnet 4.6',
                  desc: 'Carries out each step — writes code, runs tools, produces output. Balanced speed and quality.',
                },
                {
                  phase: 'Review',
                  default: 'Claude Opus 4.6',
                  desc: 'Evaluates output quality, checks correctness, and flags issues. Needs the best reasoning.',
                },
              ].map(({ phase, default: def, desc }) => (
                <div key={phase} className="rounded-md border bg-muted/30 p-3 text-sm">
                  <p className="font-semibold">{phase}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Default: {def}</p>
                  <p className="mt-1.5 text-xs text-muted-foreground">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Provider status */}
          {providerStatus && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Provider status
                {clawdbotReachable === false && (
                  <span className="ml-2 font-normal normal-case text-amber-500">(ClawdBot unreachable — showing env-only)</span>
                )}
              </p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(providerStatus).map(([id, p]) => (
                  <div key={id} className="flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs">
                    <span
                      className={[
                        'h-2 w-2 rounded-full',
                        p.available ? 'bg-emerald-500' : 'bg-zinc-400',
                      ].join(' ')}
                    />
                    <span className="font-medium">{p.label}</span>
                    <Badge variant="outline" className="h-4 px-1 text-[10px]">
                      {p.available ? 'active' : 'inactive'}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tips */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tips</p>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li>Use <strong>Claude Opus 4.6</strong> for planning and review when quality matters most.</li>
              <li>Use <strong>Claude Sonnet 4.6</strong> for execution — faster and cost-effective for most tasks.</li>
              <li><strong>OpenRouter GPT-5.4 High</strong> is a planning fallback if Anthropic API is unavailable.</li>
              <li>GLM-5 is a low-cost fallback for non-critical tasks when primary models fail.</li>
              <li>
                Check the{' '}
                <a href="/ledger" className="inline-flex items-center gap-0.5 text-[color:var(--foco-teal)] underline underline-offset-2">
                  Audit Log <ExternalLink className="h-3 w-3" />
                </a>{' '}
                to see which model was used for each pipeline run.
              </li>
            </ul>
          </div>

        </CardContent>
      )}
    </Card>
  )
}
