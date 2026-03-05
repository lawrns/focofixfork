'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { FileText, TrendingUp, Brain, Code2, Loader2, AlertCircle, ChevronDown, ChevronUp, Antenna } from 'lucide-react'
import Link from 'next/link'

interface SocialInsight {
  summary: string
  platform: string
  source_name: string
  relevance: number
  tags: string[]
}

interface SocialIntelligence {
  item_count: number
  platforms: string[]
  top_insights: SocialInsight[]
  themes: string[]
}

interface BriefingData {
  stub?: boolean
  date?: string
  summary?: string
  text?: string
  sections?: {
    financial?: string
    intelligence?: string
    codebase?: string
    top_repos?: Array<{
      name?: string
      score?: number
      verdict?: string
      description?: string
    }>
    recommendations?: string[]
  }
  social_intelligence?: SocialIntelligence
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
  const [expanded, setExpanded] = useState(false)
  const [reposExpanded, setReposExpanded] = useState(false)
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
        {data.summary && <ExpandableText text={data.summary} clampClassName="line-clamp-5" />}

        {/* Sections */}
        {data.sections?.intelligence && (
          <SectionBlock icon={Brain} title="Intelligence" text={data.sections.intelligence} expandable />
        )}
        {data.sections?.codebase && (
          <SectionBlock icon={Code2} title="Codebase" text={data.sections.codebase} expandable />
        )}
        {data.sections?.top_repos && data.sections.top_repos.length > 0 && (
          <div>
            <div className="mb-2 text-[11px] font-mono-display uppercase tracking-wide text-muted-foreground">
              Top Repos
            </div>
            <ul className="space-y-2">
              {(reposExpanded ? data.sections.top_repos : data.sections.top_repos.slice(0, 3)).map((repo, i) => (
                <li key={`${repo.name ?? 'repo'}-${i}`} className="rounded-md border border-border/70 bg-muted/20 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[12px] font-medium text-foreground">{repo.name ?? 'Unnamed repo'}</span>
                    {typeof repo.score === 'number' && (
                      <span className="shrink-0 text-[11px] text-muted-foreground">{repo.score.toFixed(1)}</span>
                    )}
                  </div>
                  {repo.description && <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">{repo.description}</p>}
                </li>
              ))}
            </ul>
            {data.sections.top_repos.length > 3 && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-1 h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                onClick={() => setReposExpanded((v) => !v)}
              >
                {reposExpanded ? (
                  <><ChevronUp className="h-3 w-3 mr-1" />Show fewer repos</>
                ) : (
                  <><ChevronDown className="h-3 w-3 mr-1" />Show all repos</>
                )}
              </Button>
            )}
          </div>
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

        {/* Social Intelligence */}
        {data.social_intelligence && data.social_intelligence.top_insights.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Antenna className="h-3.5 w-3.5 text-[color:var(--foco-teal)]" />
              <span className="text-[11px] font-mono-display text-muted-foreground uppercase tracking-wide">
                Social Intelligence
              </span>
              <div className="flex gap-1 ml-auto">
                {data.social_intelligence.platforms.map((p) => (
                  <Badge key={p} variant="outline" className="text-[10px] px-1.5 py-0">
                    {p === 'twitter' ? '𝕏' : p === 'instagram' ? '📷' : p === 'youtube' ? '▶' : p}
                  </Badge>
                ))}
              </div>
            </div>
            <ul className="space-y-2">
              {data.social_intelligence.top_insights.slice(0, 3).map((insight, i) => (
                <li key={i} className="rounded-md border border-border/70 bg-muted/20 px-3 py-2">
                  <p className="text-[12px] text-foreground leading-relaxed">{insight.summary}</p>
                  {insight.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {insight.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">{tag}</Badge>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
            {data.social_intelligence.themes.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {data.social_intelligence.themes.map((theme) => (
                  <Badge key={theme} variant="outline" className="text-[10px]">{theme}</Badge>
                ))}
              </div>
            )}
            <Link
              href="/empire/hive"
              className="inline-block mt-2 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              View all in Social Intel →
            </Link>
          </div>
        )}

        {/* Full text (expandable) */}
        {data.text && !data.sections?.intelligence && (
          <div>
            <p className={cn(
              'text-[12px] text-muted-foreground leading-relaxed whitespace-pre-wrap',
              !expanded && 'line-clamp-6'
            )}>
              {data.text}
            </p>
            {data.text.length > 400 && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-1 h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? (
                  <><ChevronUp className="h-3 w-3 mr-1" />Show less</>
                ) : (
                  <><ChevronDown className="h-3 w-3 mr-1" />Read more</>
                )}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function SectionBlock({
  icon: Icon,
  title,
  text,
  expandable = false,
}: {
  icon: React.ElementType
  title: string
  text: string
  expandable?: boolean
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[11px] font-mono-display text-muted-foreground uppercase tracking-wide">
          {title}
        </span>
      </div>
      {expandable ? (
        <ExpandableText text={text} clampClassName="line-clamp-4" />
      ) : (
        <p className="text-[12px] text-foreground leading-relaxed">{text}</p>
      )}
    </div>
  )
}

function ExpandableText({ text, clampClassName }: { text: string; clampClassName: string }) {
  const [open, setOpen] = useState(false)
  const isLong = text.length > 260

  return (
    <div>
      <p
        className={cn(
          'whitespace-pre-wrap text-[12px] leading-relaxed text-foreground',
          !open && isLong && clampClassName
        )}
      >
        {text}
      </p>
      {isLong && (
        <Button
          variant="ghost"
          size="sm"
          className="mt-1 h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? (
            <><ChevronUp className="h-3 w-3 mr-1" />Show less</>
          ) : (
            <><ChevronDown className="h-3 w-3 mr-1" />Read more</>
          )}
        </Button>
      )}
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
