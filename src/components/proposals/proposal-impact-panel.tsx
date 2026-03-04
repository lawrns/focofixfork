'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import type { ProposalImpactSummary } from '@/types/proposals'

interface ProposalImpactPanelProps {
  summary: ProposalImpactSummary
  isLoading?: boolean
}

export function ProposalImpactPanel({ summary, isLoading }: ProposalImpactPanelProps) {
  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-zinc-500">
          Impact Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
            Changes
          </p>
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-2 rounded-md bg-emerald-50 dark:bg-emerald-950/30">
              <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                {summary.items_by_type?.add ?? summary.by_action?.add ?? 0}
              </p>
              <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70">
                Add
              </p>
            </div>
            <div className="text-center p-2 rounded-md bg-amber-50 dark:bg-amber-950/30">
              <p className="text-lg font-semibold text-amber-600 dark:text-amber-400">
                {summary.items_by_type?.modify ?? summary.by_action?.modify ?? 0}
              </p>
              <p className="text-xs text-amber-600/70 dark:text-amber-400/70">
                Modify
              </p>
            </div>
            <div className="text-center p-2 rounded-md bg-red-50 dark:bg-red-950/30">
              <p className="text-lg font-semibold text-red-600 dark:text-red-400">
                {summary.items_by_type?.remove ?? summary.by_action?.remove ?? 0}
              </p>
              <p className="text-xs text-red-600/70 dark:text-red-400/70">
                Remove
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
            Review Status
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div className="flex h-full">
                <div
                  className="bg-emerald-500 transition-all duration-300"
                  style={{
                    width: `${((summary.items_by_status?.approved ?? 0) / summary.total_items) * 100}%`,
                  }}
                />
                <div
                  className="bg-red-500 transition-all duration-300"
                  style={{
                    width: `${((summary.items_by_status?.rejected ?? 0) / summary.total_items) * 100}%`,
                  }}
                />
              </div>
            </div>
            <span className="text-xs text-zinc-500 whitespace-nowrap">
              {summary.items_by_status?.approved ?? 0}/{summary.total_items}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
            Affected Entities
          </p>
          <div className="flex flex-wrap gap-2">
            {(summary.entities_affected?.tasks ?? summary.by_entity?.task ?? 0) > 0 && (
              <Badge variant="outline" className="text-xs">
                {summary.entities_affected?.tasks ?? summary.by_entity?.task ?? 0} Tasks
              </Badge>
            )}
            {(summary.entities_affected?.milestones ?? summary.by_entity?.milestone ?? 0) > 0 && (
              <Badge variant="outline" className="text-xs">
                {summary.entities_affected?.milestones ?? summary.by_entity?.milestone ?? 0} Milestones
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
