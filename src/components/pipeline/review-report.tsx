'use client'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BookOpen, AlertTriangle, ShieldAlert, Zap, Database, Lightbulb, Code2 } from 'lucide-react'
import type { ReviewReport as ReviewReportType } from '@/lib/pipeline/types'
import { cn } from '@/lib/utils'

interface ReviewReportProps {
  report: ReviewReportType
  handbookRef: string | null
}

function ListSection({
  items,
  emptyLabel = 'None',
}: {
  items: string[]
  emptyLabel?: string
}) {
  if (!items?.length) return <p className="text-sm text-muted-foreground">{emptyLabel}</p>
  return (
    <ul className="space-y-1">
      {items.map((item, i) => (
        <li key={i} className="text-sm text-foreground/80 flex gap-2">
          <span className="text-muted-foreground mt-0.5">·</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

export function ReviewReport({ report, handbookRef }: ReviewReportProps) {
  const score = report.confidence_score ?? 0
  const scoreColor =
    score >= 80 ? 'text-emerald-500' : score >= 60 ? 'text-amber-500' : 'text-destructive'

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-foreground/80">{report.summary}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={cn('text-2xl font-bold font-mono-display tabular-nums', scoreColor)}>
            {score}
          </span>
          <span className="text-muted-foreground text-sm">/100</span>
          {handbookRef && (
            <Badge variant="secondary" className="gap-1 text-[11px]">
              <BookOpen className="h-3 w-3" />
              Handbook updated · {handbookRef}
            </Badge>
          )}
        </div>
      </div>

      <Accordion type="multiple" defaultValue={['critical', 'improvements']} className="space-y-2">
        {report.critical_issues?.length > 0 && (
          <AccordionItem value="critical" className="border rounded-lg px-3">
            <AccordionTrigger className="text-sm font-medium text-destructive hover:no-underline">
              <span className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Critical Issues ({report.critical_issues.length})
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <ListSection items={report.critical_issues} />
            </AccordionContent>
          </AccordionItem>
        )}

        <AccordionItem value="security" className="border rounded-lg px-3">
          <AccordionTrigger className="text-sm font-medium hover:no-underline">
            <span className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-500" />
              Security
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <ListSection items={report.security} emptyLabel="No security issues noted" />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="improvements" className="border rounded-lg px-3">
          <AccordionTrigger className="text-sm font-medium hover:no-underline">
            <span className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-[color:var(--foco-teal)]" />
              Improvements ({report.improvements?.length ?? 0})
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <ListSection items={report.improvements} emptyLabel="No improvements suggested" />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="performance" className="border rounded-lg px-3">
          <AccordionTrigger className="text-sm font-medium hover:no-underline">
            <span className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              Performance
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <ListSection items={report.performance} emptyLabel="No performance notes" />
          </AccordionContent>
        </AccordionItem>

        {report.db_observations?.length > 0 && (
          <AccordionItem value="db" className="border rounded-lg px-3">
            <AccordionTrigger className="text-sm font-medium hover:no-underline">
              <span className="flex items-center gap-2">
                <Database className="h-4 w-4 text-blue-500" />
                DB Observations ({report.db_observations.length})
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <ListSection items={report.db_observations} />
            </AccordionContent>
          </AccordionItem>
        )}

        {report.suggested_patches?.length > 0 && (
          <AccordionItem value="patches" className="border rounded-lg px-3">
            <AccordionTrigger className="text-sm font-medium hover:no-underline">
              <span className="flex items-center gap-2">
                <Code2 className="h-4 w-4" />
                Suggested Patches ({report.suggested_patches.length})
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-2">
              {report.suggested_patches.map((p, i) => (
                <Card key={i} className="bg-muted/30">
                  <CardHeader className="py-2 px-3">
                    <CardTitle className="text-xs font-mono text-muted-foreground">{p.file}</CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 pb-2">
                    <p className="text-sm">{p.change}</p>
                  </CardContent>
                </Card>
              ))}
            </AccordionContent>
          </AccordionItem>
        )}

        {report.handbook_additions?.length > 0 && (
          <AccordionItem value="handbook" className="border rounded-lg px-3">
            <AccordionTrigger className="text-sm font-medium hover:no-underline">
              <span className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-purple-500" />
                Handbook Learnings ({report.handbook_additions.length})
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-3">
              {report.handbook_additions.map((a, i) => (
                <div key={i} className="space-y-1">
                  <p className="text-[13px] font-medium">{a.pattern}</p>
                  <p className="text-sm text-foreground/70">{a.lesson}</p>
                  <p className="text-[11px] text-muted-foreground font-mono-display">
                    → {a.applicable_to}
                  </p>
                </div>
              ))}
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    </div>
  )
}
