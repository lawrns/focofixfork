'use client'

import { useCallback, useEffect, useMemo, useRef, useState, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { TimelineDateMarker } from './timeline-date-marker'
import { TimelineItemCard, type TimelineItem } from './timeline-item-card'
import type { ProposalItem, ProposalItemAction } from '@/types/proposals'
import {
  Columns,
  Layers,
  GitCompareArrows,
  ChevronLeft,
  ChevronRight,
  Calendar,
} from 'lucide-react'

export type { TimelineItem }

export type TimelineViewMode = 'side-by-side' | 'unified' | 'diff-only'

interface TimelineComparisonProps {
  currentTimeline: TimelineItem[]
  proposedTimeline: TimelineItem[]
  proposalItems: ProposalItem[]
  viewMode?: TimelineViewMode
  onViewModeChange?: (mode: TimelineViewMode) => void
  onItemClick?: (item: TimelineItem, type: 'current' | 'proposed') => void
  className?: string
}

interface GroupedTimeline {
  date: Date
  items: TimelineItem[]
}

const viewModeConfig: Record<TimelineViewMode, {
  label: string
  icon: typeof Columns
}> = {
  'side-by-side': {
    label: 'Side by Side',
    icon: Columns,
  },
  'unified': {
    label: 'Unified',
    icon: Layers,
  },
  'diff-only': {
    label: 'Changes Only',
    icon: GitCompareArrows,
  },
}

function groupTimelineByDate(items: TimelineItem[]): GroupedTimeline[] {
  const groups = new Map<string, TimelineItem[]>()

  items.forEach((item) => {
    const date = item.dueDate || item.startDate
    if (!date) return

    const dateKey = new Date(date).toISOString().split('T')[0]
    if (!groups.has(dateKey)) {
      groups.set(dateKey, [])
    }
    groups.get(dateKey)!.push(item)
  })

  // Sort by date
  return Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateStr, items]) => ({
      date: new Date(dateStr),
      items: items.sort((a, b) => {
        // Sort by priority then by title
        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3, none: 4 }
        const aPriority = priorityOrder[a.priority ?? 'none']
        const bPriority = priorityOrder[b.priority ?? 'none']
        if (aPriority !== bPriority) return aPriority - bPriority
        return a.title.localeCompare(b.title)
      }),
    }))
}

function getAllDates(current: GroupedTimeline[], proposed: GroupedTimeline[]): Date[] {
  const dateSet = new Set<string>()

  current.forEach((g) => dateSet.add(g.date.toISOString().split('T')[0]))
  proposed.forEach((g) => dateSet.add(g.date.toISOString().split('T')[0]))

  return Array.from(dateSet)
    .sort()
    .map((d) => new Date(d))
}

function getChangeType(
  itemId: string,
  proposalItems: ProposalItem[]
): ProposalItemAction | null {
  const item = proposalItems.find(
    (pi) => pi.entity_id === itemId || (pi.proposed_data as { id?: string })?.id === itemId
  )
  return item?.action ?? null
}

function getDiffFields(
  currentItem: TimelineItem | undefined,
  proposedItem: TimelineItem | undefined
): string[] {
  if (!currentItem || !proposedItem) return []

  const fields: string[] = []

  if (currentItem.title !== proposedItem.title) fields.push('title')
  if (currentItem.description !== proposedItem.description) fields.push('description')
  if (currentItem.dueDate?.getTime() !== proposedItem.dueDate?.getTime()) fields.push('dueDate')
  if (currentItem.startDate?.getTime() !== proposedItem.startDate?.getTime()) fields.push('startDate')
  if (currentItem.assignee?.id !== proposedItem.assignee?.id) fields.push('assignee')
  if (currentItem.status !== proposedItem.status) fields.push('status')
  if (currentItem.priority !== proposedItem.priority) fields.push('priority')

  return fields
}

function TimelineComparisonComponent({
  currentTimeline,
  proposedTimeline,
  proposalItems,
  viewMode = 'side-by-side',
  onViewModeChange,
  onItemClick,
  className,
}: TimelineComparisonProps) {
  const [internalViewMode, setInternalViewMode] = useState<TimelineViewMode>(viewMode)
  const [scrollPosition, setScrollPosition] = useState(0)
  const currentScrollRef = useRef<HTMLDivElement>(null)
  const proposedScrollRef = useRef<HTMLDivElement>(null)
  const isSyncingScroll = useRef(false)

  const activeViewMode = onViewModeChange ? viewMode : internalViewMode

  const handleViewModeChange = useCallback(
    (mode: TimelineViewMode) => {
      if (onViewModeChange) {
        onViewModeChange(mode)
      } else {
        setInternalViewMode(mode)
      }
    },
    [onViewModeChange]
  )

  // Group timelines by date
  const groupedCurrent = useMemo(() => groupTimelineByDate(currentTimeline), [currentTimeline])
  const groupedProposed = useMemo(() => groupTimelineByDate(proposedTimeline), [proposedTimeline])

  // Get all unique dates for synchronized display
  const allDates = useMemo(
    () => getAllDates(groupedCurrent, groupedProposed),
    [groupedCurrent, groupedProposed]
  )

  // Build a map for quick lookup
  const currentByDate = useMemo(() => {
    const map = new Map<string, TimelineItem[]>()
    groupedCurrent.forEach((g) => {
      map.set(g.date.toISOString().split('T')[0], g.items)
    })
    return map
  }, [groupedCurrent])

  const proposedByDate = useMemo(() => {
    const map = new Map<string, TimelineItem[]>()
    groupedProposed.forEach((g) => {
      map.set(g.date.toISOString().split('T')[0], g.items)
    })
    return map
  }, [groupedProposed])

  // Build a map of current items by ID for diff comparison
  const currentItemsById = useMemo(() => {
    const map = new Map<string, TimelineItem>()
    currentTimeline.forEach((item) => map.set(item.id, item))
    return map
  }, [currentTimeline])

  // Sync scroll between columns
  const handleScroll = useCallback(
    (source: 'current' | 'proposed') => {
      if (isSyncingScroll.current) return

      const sourceRef = source === 'current' ? currentScrollRef : proposedScrollRef
      const targetRef = source === 'current' ? proposedScrollRef : currentScrollRef

      if (sourceRef.current && targetRef.current) {
        isSyncingScroll.current = true
        const scrollTop = sourceRef.current.scrollTop
        targetRef.current.scrollTop = scrollTop
        setScrollPosition(scrollTop)

        requestAnimationFrame(() => {
          isSyncingScroll.current = false
        })
      }
    },
    []
  )

  // Get items for diff-only view
  const changedItems = useMemo(() => {
    const items: Array<{
      item: TimelineItem
      changeType: ProposalItemAction
      diffFields: string[]
    }> = []

    proposalItems.forEach((pi) => {
      const proposedItem = proposedTimeline.find(
        (t) => t.id === pi.entity_id || t.id === (pi.proposed_data as { id?: string })?.id
      )
      const currentItem = currentItemsById.get(pi.entity_id ?? '')

      if (proposedItem) {
        items.push({
          item: proposedItem,
          changeType: pi.action,
          diffFields: getDiffFields(currentItem, proposedItem),
        })
      }
    })

    // Sort by date
    return items.sort((a, b) => {
      const aDate = a.item.dueDate || a.item.startDate
      const bDate = b.item.dueDate || b.item.startDate
      if (!aDate && !bDate) return 0
      if (!aDate) return 1
      if (!bDate) return -1
      return aDate.getTime() - bDate.getTime()
    })
  }, [proposalItems, proposedTimeline, currentItemsById])

  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const renderTimelineColumn = (
    title: string,
    isProposed: boolean,
    scrollRef: React.RefObject<HTMLDivElement>,
    onScrollEvent: () => void
  ) => {
    const dateMap = isProposed ? proposedByDate : currentByDate

    return (
      <div className="flex-1 flex flex-col min-w-0">
        {/* Column header */}
        <div
          className={cn(
            'sticky top-0 z-30 px-4 py-3 border-b',
            'bg-background/95 backdrop-blur-sm',
            isProposed
              ? 'border-l border-zinc-200 dark:border-zinc-700'
              : 'border-r border-zinc-100 dark:border-zinc-800'
          )}
        >
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'w-2 h-2 rounded-full',
                isProposed ? 'bg-emerald-500' : 'bg-zinc-400 dark:bg-zinc-500'
              )}
            />
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            <Badge variant="secondary" className="text-xs">
              {isProposed ? proposedTimeline.length : currentTimeline.length} items
            </Badge>
          </div>
        </div>

        {/* Scrollable content */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 pb-4"
          onScroll={onScrollEvent}
        >
          <div className="space-y-2 pt-2">
            {allDates.map((date, dateIndex) => {
              const dateKey = date.toISOString().split('T')[0]
              const items = dateMap.get(dateKey) ?? []
              const isToday = date.getTime() === today.getTime()
              const isOverdue = date.getTime() < today.getTime()

              return (
                <div key={dateKey}>
                  <TimelineDateMarker
                    date={date}
                    isToday={isToday}
                    isOverdue={isOverdue}
                    index={dateIndex}
                  />

                  <div className="space-y-2 mt-2">
                    {items.length > 0 ? (
                      items.map((item, itemIndex) => {
                        const changeType = isProposed
                          ? getChangeType(item.id, proposalItems)
                          : null
                        const currentItem = currentItemsById.get(item.id)
                        const diffFields = isProposed
                          ? getDiffFields(currentItem, item)
                          : []

                        return (
                          <TimelineItemCard
                            key={item.id}
                            item={item}
                            changeType={changeType}
                            showDiff={isProposed && changeType === 'modify'}
                            diffFields={diffFields}
                            index={dateIndex * 10 + itemIndex}
                            onClick={
                              onItemClick
                                ? () => onItemClick(item, isProposed ? 'proposed' : 'current')
                                : undefined
                            }
                          />
                        )
                      })
                    ) : (
                      <div className="py-4 text-center text-xs text-muted-foreground border border-dashed border-zinc-200 dark:border-zinc-700 rounded-lg">
                        No items
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            {allDates.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Calendar className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">No timeline items</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Add tasks or milestones with due dates to see them here
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  const renderUnifiedView = () => {
    return (
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="space-y-2 pt-2">
          {allDates.map((date, dateIndex) => {
            const dateKey = date.toISOString().split('T')[0]
            const currentItems = currentByDate.get(dateKey) ?? []
            const proposedItems = proposedByDate.get(dateKey) ?? []
            const isToday = date.getTime() === today.getTime()
            const isOverdue = date.getTime() < today.getTime()

            // Merge and deduplicate items
            const allItems = new Map<string, { item: TimelineItem; source: 'current' | 'proposed' | 'both' }>()

            currentItems.forEach((item) => {
              allItems.set(item.id, { item, source: 'current' })
            })

            proposedItems.forEach((item) => {
              const existing = allItems.get(item.id)
              if (existing) {
                allItems.set(item.id, { item, source: 'both' })
              } else {
                allItems.set(item.id, { item, source: 'proposed' })
              }
            })

            const mergedItems = Array.from(allItems.values())

            return (
              <div key={dateKey}>
                <TimelineDateMarker
                  date={date}
                  isToday={isToday}
                  isOverdue={isOverdue}
                  index={dateIndex}
                />

                <div className="space-y-2 mt-2">
                  {mergedItems.length > 0 ? (
                    mergedItems.map(({ item, source }, itemIndex) => {
                      const changeType = getChangeType(item.id, proposalItems)
                      const currentItem = currentItemsById.get(item.id)
                      const diffFields = getDiffFields(currentItem, item)

                      return (
                        <TimelineItemCard
                          key={item.id}
                          item={item}
                          changeType={changeType}
                          showDiff={changeType === 'modify'}
                          diffFields={diffFields}
                          index={dateIndex * 10 + itemIndex}
                          onClick={
                            onItemClick
                              ? () => onItemClick(item, source === 'current' ? 'current' : 'proposed')
                              : undefined
                          }
                        />
                      )
                    })
                  ) : (
                    <div className="py-4 text-center text-xs text-muted-foreground border border-dashed border-zinc-200 dark:border-zinc-700 rounded-lg">
                      No items
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const renderDiffOnlyView = () => {
    return (
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="space-y-3 pt-2">
          {changedItems.length > 0 ? (
            changedItems.map(({ item, changeType, diffFields }, index) => (
              <TimelineItemCard
                key={item.id}
                item={item}
                changeType={changeType}
                showDiff={changeType === 'modify'}
                diffFields={diffFields}
                index={index}
                onClick={
                  onItemClick
                    ? () => onItemClick(item, 'proposed')
                    : undefined
                }
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <GitCompareArrows className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No changes in this proposal</p>
              <p className="text-xs text-muted-foreground mt-1">
                All items are unchanged
              </p>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col h-full bg-background rounded-lg border', className)}>
      {/* View mode selector */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-zinc-50/50 dark:bg-zinc-900/50">
        <h2 className="text-sm font-semibold text-foreground">Timeline Comparison</h2>

        <Tabs
          value={activeViewMode}
          onValueChange={(v) => handleViewModeChange(v as TimelineViewMode)}
        >
          <TabsList className="h-8">
            {(Object.keys(viewModeConfig) as TimelineViewMode[]).map((mode) => {
              const Icon = viewModeConfig[mode].icon
              return (
                <TabsTrigger
                  key={mode}
                  value={mode}
                  className="h-7 px-2.5 text-xs gap-1.5"
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{viewModeConfig[mode].label}</span>
                </TabsTrigger>
              )
            })}
          </TabsList>
        </Tabs>
      </div>

      {/* Timeline content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeViewMode}
          className="flex-1 flex overflow-hidden"
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeViewMode === 'side-by-side' && (
            <>
              {renderTimelineColumn(
                'Current',
                false,
                currentScrollRef,
                () => handleScroll('current')
              )}
              {renderTimelineColumn(
                'If Approved',
                true,
                proposedScrollRef,
                () => handleScroll('proposed')
              )}
            </>
          )}

          {activeViewMode === 'unified' && renderUnifiedView()}

          {activeViewMode === 'diff-only' && renderDiffOnlyView()}
        </motion.div>
      </AnimatePresence>

      {/* Summary footer */}
      <div className="flex items-center justify-between px-4 py-2 border-t bg-zinc-50/50 dark:bg-zinc-900/50">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            {proposalItems.filter((p) => p.action === 'add').length} new
          </span>
          <span className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            {proposalItems.filter((p) => p.action === 'modify').length} modified
          </span>
          <span className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            {proposalItems.filter((p) => p.action === 'remove').length} removed
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{allDates.length} dates</span>
          <span className="text-zinc-300 dark:text-zinc-600">|</span>
          <span>{currentTimeline.length} current</span>
          <ChevronRight className="h-3 w-3" />
          <span>{proposedTimeline.length} proposed</span>
        </div>
      </div>
    </div>
  )
}

export const TimelineComparison = memo(TimelineComparisonComponent)
