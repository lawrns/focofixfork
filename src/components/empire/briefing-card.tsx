'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { FileText, TrendingUp, Brain, Code2, Loader2, AlertCircle } from 'lucide-react'

interface BriefingData {
  stub?: boolean
  date?: string
  summary?: string
  text?: string
  sections?: {
    financial?: string
    intelligence?: string
    codebase?: string
    recommendations?: string[]
  }
  model?: string
  briefingId?: string
  timestamp?: string
  revenue?: { total24h?: number; currency?: string }
}

interface BriefingCardProps {
  data?: BriefingData | null
  loading?: boolean
  error?: string | null
}

export function BriefingCard({ data, loading, error }: BriefingCardProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-[14px] flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            Morning Briefing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading briefing…
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !data || data.stub) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-[14px] flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            Morning Briefing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-2 text-muted-foreground text-sm">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-amber-500" />
            <span>{error ?? data?.summary ?? 'No briefing available yet.'}</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  const date = data.date ?? data.timestamp?.split('T')[0] ?? 'Today'
  const currency = (data.revenue?.currency ?? 'usd').toUpperCase()
  const revenue = data.revenue?.total24h

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-[14px] flex items-center gap-2">
            <FileText className="h-4 w-4 text-[color:var(--foco-teal)]" />
            Morning Briefing
          </CardTitle>
          <div className="flex items-center gap-2">
            {data.model && (
              <Badge variant="secondary" className="text-[10px] font-mono-display">
                {modelBadge(data.model)}
              </Badge>
            )}
            <span className="text-[11px] text-muted-foreground">{date}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Revenue snapshot */}
        {revenue !== undefined && (
          <div className="flex items-center gap-3 p-3 rounded-md bg-emerald-500/5 border border-emerald-500/20">
            <TrendingUp className="h-4 w-4 text-emerald-500 flex-shrink-0" />
            <div>
              <div className="text-[11px] text-muted-foreground">24h Revenue</div>
              <div className="text-[15px] font-semibold text-emerald-600">
                {currency} {revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        )}

        {/* Summary */}
        {data.summary && (
          <p className="text-[13px] text-foreground leading-relaxed">{data.summary}</p>
        )}

        {/* Sections */}
        {data.sections?.intelligence && (
          <SectionBlock icon={Brain} title="Intelligence" text={data.sections.intelligence} />
        )}
        {data.sections?.codebase && (
          <SectionBlock icon={Code2} title="Codebase" text={data.sections.codebase} />
        )}

        {/* Recommendations */}
        {data.sections?.recommendations && data.sections.recommendations.length > 0 && (
          <div>
            <div className="text-[11px] font-mono-display text-muted-foreground uppercase tracking-wide mb-2">
              Recommendations
            </div>
            <ul className="space-y-1">
              {data.sections.recommendations.map((rec, i) => (
                <li key={i} className="text-[12px] text-foreground flex items-start gap-1.5">
                  <span className="text-[color:var(--foco-teal)] mt-0.5">›</span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Full text (collapsed) */}
        {data.text && !data.sections?.intelligence && (
          <p className="text-[12px] text-muted-foreground leading-relaxed whitespace-pre-wrap line-clamp-6">
            {data.text}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function SectionBlock({
  icon: Icon,
  title,
  text,
}: {
  icon: React.ElementType
  title: string
  text: string
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[11px] font-mono-display text-muted-foreground uppercase tracking-wide">
          {title}
        </span>
      </div>
      <p className="text-[12px] text-foreground leading-relaxed">{text}</p>
    </div>
  )
}

function modelBadge(model: string): string {
  if (model.includes('opus')) return 'OPUS'
  if (model.includes('sonnet')) return 'SONNET'
  if (model.includes('kimi')) return 'KIMI'
  if (model.includes('glm')) return 'GLM-5'
  return model.split('/').pop()?.toUpperCase() ?? model
}
