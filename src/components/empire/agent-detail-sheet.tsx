'use client'

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { ExternalLink } from 'lucide-react'

export interface AgentDetailData {
  id: string
  name: string
  type: 'SYSTEM' | 'CUSTOM' | 'ADAPTER'
  backend: string
  role?: string
  lane?: string
  model?: string
  description?: string | null
  status: string
  lastActivity?: string | null
  systemPrompt?: string | null
  tools?: string[]
  readScope?: string[]
  writeScope?: string[]
  personaTags?: string[]
  recentExecutions?: Array<{ id: string; status: string; createdAt?: string }>
  commandHref?: string
}

interface AgentDetailSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  data: AgentDetailData | null
  onEdit?: () => void
}

export function AgentDetailSheet({ open, onOpenChange, data, onEdit }: AgentDetailSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl">
        {!data ? null : (
          <div className="h-full flex flex-col">
            <SheetHeader className="space-y-2">
              <SheetTitle className="flex items-center gap-2 flex-wrap">
                <span className="min-w-0 truncate">{data.name}</span>
                <Badge variant="outline" className="text-[10px]">{data.type}</Badge>
                <Badge variant="outline" className="text-[10px]">{data.backend}</Badge>
              </SheetTitle>
              <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                {data.model && <span>Model: {data.model}</span>}
                {data.role && <span>Role: {data.role}</span>}
                {data.lane && <span>Lane: {data.lane}</span>}
                <span>Status: {data.status}</span>
              </div>
              <div className="flex items-center gap-2">
                {data.commandHref && (
                  <Button asChild size="sm" variant="outline" className="h-8 gap-1.5">
                    <a href={data.commandHref}>
                      Dispatch Task
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                )}
                {onEdit && data.type === 'CUSTOM' && (
                  <Button size="sm" className="h-8" onClick={onEdit}>Edit Agent</Button>
                )}
              </div>
            </SheetHeader>

            <Separator className="my-4" />

            <ScrollArea className="flex-1 pr-2">
              <div className="space-y-4 text-sm">
                <section className="space-y-1">
                  <h4 className="text-xs uppercase tracking-wide text-muted-foreground">Description</h4>
                  <p className="text-sm text-foreground/90">{data.description || 'No description provided.'}</p>
                </section>

                <section className="space-y-1">
                  <h4 className="text-xs uppercase tracking-wide text-muted-foreground">System Prompt</h4>
                  <pre className="rounded-md border bg-muted/30 p-2 text-xs whitespace-pre-wrap break-words max-h-48 overflow-auto">
                    {data.systemPrompt || 'System prompt is not exposed for this agent.'}
                  </pre>
                </section>

                <section className="space-y-1">
                  <h4 className="text-xs uppercase tracking-wide text-muted-foreground">Tool Access</h4>
                  {data.tools && data.tools.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {data.tools.map((tool) => (
                        <Badge key={tool} variant="outline" className="text-[10px]">{tool}</Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No tool list available.</p>
                  )}
                </section>

                <section className="space-y-1">
                  <h4 className="text-xs uppercase tracking-wide text-muted-foreground">Access Scopes</h4>
                  <p className="text-xs text-muted-foreground">Read: {data.readScope?.length ? data.readScope.join(', ') : 'not set'}</p>
                  <p className="text-xs text-muted-foreground">Write: {data.writeScope?.length ? data.writeScope.join(', ') : 'not set'}</p>
                </section>

                <section className="space-y-1">
                  <h4 className="text-xs uppercase tracking-wide text-muted-foreground">Recent Executions</h4>
                  {data.recentExecutions && data.recentExecutions.length > 0 ? (
                    <div className="space-y-1.5">
                      {data.recentExecutions.slice(0, 5).map((run) => (
                        <div key={run.id} className="rounded border px-2 py-1.5 text-xs flex items-center justify-between">
                          <span className="truncate">{run.id}</span>
                          <span className="text-muted-foreground">{run.status}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No recent executions available.</p>
                  )}
                </section>
              </div>
            </ScrollArea>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
