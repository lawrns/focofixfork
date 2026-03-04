'use client'

import { Calendar, List, LayoutGrid } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { ProposalItem } from '@/types/proposals'

interface ProposalTimelinePanelProps {
  proposalId: string
  items: ProposalItem[]
  viewMode?: 'side-by-side' | 'unified'
  onViewModeChange?: (mode: 'side-by-side' | 'unified') => void
}

export function ProposalTimelinePanel({
  proposalId,
  items,
  viewMode = 'unified',
  onViewModeChange,
}: ProposalTimelinePanelProps) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium text-zinc-500">
          Timeline Comparison
        </CardTitle>
        <div className="flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={viewMode === 'unified' ? 'secondary' : 'ghost'}
                  size="icon-sm"
                  onClick={() => onViewModeChange?.('unified')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Unified view</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={viewMode === 'side-by-side' ? 'secondary' : 'ghost'}
                  size="icon-sm"
                  onClick={() => onViewModeChange?.('side-by-side')}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Side-by-side view</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center h-32 text-zinc-400 text-sm">
          <Calendar className="h-5 w-5 mr-2" />
          Timeline visualization
        </div>
      </CardContent>
    </Card>
  )
}
