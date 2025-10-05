'use client'

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { cn } from '@/lib/utils'

interface VirtualizedListProps<T> {
  items: T[]
  itemHeight: number
  containerHeight: number
  renderItem: (item: T, index: number) => React.ReactNode
  className?: string
  overscan?: number
  onEndReached?: () => void
  endThreshold?: number
}

function VirtualizedList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  className,
  overscan = 5,
  onEndReached,
  endThreshold = 0.8
}: VirtualizedListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const totalHeight = items.length * itemHeight

  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    )
    return { startIndex, endIndex }
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan])

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.startIndex, visibleRange.endIndex + 1).map((item, index) => ({
      item,
      index: visibleRange.startIndex + index
    }))
  }, [items, visibleRange])

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = e.currentTarget.scrollTop
    setScrollTop(newScrollTop)

    // Check if we've reached the end
    if (onEndReached) {
      const scrollPercentage = newScrollTop / (totalHeight - containerHeight)
      if (scrollPercentage >= endThreshold) {
        onEndReached()
      }
    }
  }, [totalHeight, containerHeight, onEndReached, endThreshold])

  const offsetY = visibleRange.startIndex * itemHeight

  return (
    <div
      ref={containerRef}
      className={cn('overflow-auto', className)}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0
          }}
        >
          {visibleItems.map(({ item, index }) => (
            <div key={index} style={{ height: itemHeight }}>
              {renderItem(item, index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Specialized component for milestone lists
interface VirtualizedMilestoneListProps {
  milestones: any[]
  containerHeight?: number // Made optional for mobile responsiveness
  onMilestoneClick?: (milestone: any) => void
  onEndReached?: () => void
  className?: string
  mobileOptimized?: boolean // New prop for mobile optimization
}

export const VirtualizedMilestoneList: React.FC<VirtualizedMilestoneListProps> = ({
  milestones,
  containerHeight,
  onMilestoneClick,
  onEndReached,
  className,
  mobileOptimized = true
}) => {
  // Mobile-responsive container height calculation
  const [isMobile, setIsMobile] = useState(false)
  const [dynamicHeight, setDynamicHeight] = useState(containerHeight || 400)

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      
      if (mobileOptimized && mobile) {
        // On mobile, use viewport-based height instead of fixed height
        const viewportHeight = window.innerHeight
        const availableHeight = viewportHeight - 200 // Account for header/navigation
        setDynamicHeight(Math.max(300, availableHeight))
      } else {
        setDynamicHeight(containerHeight || 400)
      }
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [containerHeight, mobileOptimized])
  const renderMilestone = useCallback((milestone: any, index: number) => (
    <div
      key={milestone.id}
      className={cn(
        "flex items-center justify-between p-4 border-b border-border hover:bg-muted/50 transition-colors cursor-pointer",
        isMobile && "flex-col items-start space-y-3 p-6" // Stack vertically on mobile with more padding
      )}
      onClick={() => onMilestoneClick?.(milestone)}
    >
      <div className={cn(
        "flex items-center space-x-4",
        isMobile && "w-full justify-between"
      )}>
        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
          milestone.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' :
          milestone.status === 'in-progress' ? 'bg-blue-500 text-white dark:bg-blue-900/40 dark:text-blue-300' :
          milestone.status === 'review' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300' :
          'bg-muted text-muted-foreground'
        }`}>
          {milestone.status}
        </div>
        <div className={cn(isMobile && "flex-1")}>
          <h3 className="font-medium text-card-foreground">{milestone.name}</h3>
          {milestone.description && (
            <p className={cn(
              "text-sm text-muted-foreground",
              isMobile ? "mt-1 line-clamp-2" : "truncate max-w-md"
            )}>
              {milestone.description}
            </p>
          )}
        </div>
      </div>

      <div className={cn(
        "flex items-center space-x-4",
        isMobile && "w-full justify-between mt-2"
      )}>
        <span className="text-sm text-muted-foreground">
          {milestone.priority && `Priority: ${milestone.priority}`}
        </span>
        {milestone.assigned_to && (
          <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center text-xs font-medium text-primary">
            {milestone.assigned_to.slice(0, 2).toUpperCase()}
          </div>
        )}
      </div>
    </div>
  ), [onMilestoneClick, isMobile])

  // Mobile-optimized item height
  const itemHeight = isMobile ? 100 : 80 // Taller items on mobile for better touch targets

  return (
    <div className={cn(
      'w-full',
      mobileOptimized && isMobile && 'min-h-0', // Remove min-height constraints on mobile
      className
    )}>
      <VirtualizedList
        items={milestones}
        itemHeight={itemHeight}
        containerHeight={dynamicHeight}
        renderItem={renderMilestone}
        onEndReached={onEndReached}
        className={cn(
          'rounded-lg border border-border',
          mobileOptimized && isMobile && 'max-h-none overflow-y-auto' // Remove max-height on mobile
        )}
      />
    </div>
  )
}

// Hook for managing virtualized data with pagination
export function useVirtualizedData<T>(
  fetchData: (page: number, limit: number) => Promise<{ data: T[], hasMore: boolean }>,
  initialLimit = 50
) {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return

    setLoading(true)
    try {
      const result = await fetchData(page, initialLimit)
      setData(prev => [...prev, ...result.data])
      setHasMore(result.hasMore)
      setPage(prev => prev + 1)
    } catch (error) {
      console.error('Error loading more data:', error)
    } finally {
      setLoading(false)
    }
  }, [fetchData, page, initialLimit, loading, hasMore])

  const reset = useCallback(() => {
    setData([])
    setPage(0)
    setHasMore(true)
    setLoading(false)
  }, [])

  useEffect(() => {
    // Load initial data
    loadMore()
  }, [loadMore])

  return {
    data,
    loading,
    hasMore,
    loadMore,
    reset
  }
}

export default VirtualizedList


