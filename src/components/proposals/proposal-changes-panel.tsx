'use client'

import { ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ProposalChangeRow } from './proposal-change-row'
import type { ProposalItem } from '@/types/proposals'

interface ProposalChangesPanelProps {
  items: ProposalItem[]
  expandedItems: Set<string>
  onExpandAll: () => void
  onCollapseAll: () => void
  onToggleExpand: (itemId: string) => void
  onApprove: (itemId: string) => Promise<void>
  onReject: (itemId: string) => Promise<void>
  onDiscuss: (itemId: string) => void
}

export function ProposalChangesPanel({
  items,
  expandedItems,
  onExpandAll,
  onCollapseAll,
  onToggleExpand,
  onApprove,
  onReject,
  onDiscuss,
}: ProposalChangesPanelProps) {
  const allExpanded = expandedItems.size === items.length

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-zinc-500">
            Proposed Changes ({items.length})
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={allExpanded ? onCollapseAll : onExpandAll}
          >
            {allExpanded ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1" />
                Collapse all
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1" />
                Expand all
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-[500px]">
          <div className="space-y-3 pr-4">
            {items
              .sort((a, b) => (a.sequence ?? a.position ?? 0) - (b.sequence ?? b.position ?? 0))
              .map((item) => (
                <ProposalChangeRow
                  key={item.id}
                  item={item}
                  onApprove={onApprove}
                  onReject={onReject}
                  onDiscuss={onDiscuss}
                  isExpanded={expandedItems.has(item.id)}
                  onToggleExpand={() => onToggleExpand(item.id)}
                />
              ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
