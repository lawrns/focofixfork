'use client'

import React, { useState, useEffect, useRef, useCallback, ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface ResizeData {
  width: number
  height: number
}

interface ResponsiveBreakpoints {
  mobile?: { minWidth?: number; maxWidth?: number; minHeight?: number; maxHeight?: number }
  tablet?: { minWidth?: number; maxWidth?: number; minHeight?: number; maxHeight?: number }
  desktop?: { minWidth?: number; maxWidth?: number; minHeight?: number; maxHeight?: number }
}

export interface ResizableWidgetProps {
  id: string
  title?: string
  children: ReactNode
  onResize?: (data: ResizeData) => void
  initialWidth?: number
  initialHeight?: number
  minWidth?: number
  maxWidth?: number
  minHeight?: number
  maxHeight?: number
  maintainAspectRatio?: boolean
  disableResizeOnMobile?: boolean
  showDimensionsWhileResizing?: boolean
  responsiveBreakpoints?: ResponsiveBreakpoints
  isMobile?: boolean
  className?: string
}

const RESIZE_HANDLES = [
  'top-left',
  'top',
  'top-right',
  'right',
  'bottom-right',
  'bottom',
  'bottom-left',
  'left',
] as const

type ResizeHandle = typeof RESIZE_HANDLES[number]

const CURSOR_MAP: Record<ResizeHandle, string> = {
  'top-left': 'nwse-resize',
  'top': 'ns-resize',
  'top-right': 'nesw-resize',
  'right': 'ew-resize',
  'bottom-right': 'nwse-resize',
  'bottom': 'ns-resize',
  'bottom-left': 'nesw-resize',
  'left': 'ew-resize',
}

export function ResizableWidget({
  id,
  title,
  children,
  onResize,
  initialWidth = 400,
  initialHeight = 300,
  minWidth = 280,
  maxWidth = 1200,
  minHeight = 200,
  maxHeight = 900,
  maintainAspectRatio = false,
  disableResizeOnMobile = true,
  showDimensionsWhileResizing = false,
  responsiveBreakpoints,
  isMobile = false,
  className,
}: ResizableWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState<number>(initialWidth)
  const [height, setHeight] = useState<number>(initialHeight)
  const [isResizing, setIsResizing] = useState(false)
  const [resizingHandle, setResizingHandle] = useState<ResizeHandle | null>(null)
  const [displayDimensions, setDisplayDimensions] = useState<ResizeData | null>(null)
  const [showHandles, setShowHandles] = useState(false)
  const resizeStartRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null)
  const aspectRatioRef = useRef<number>(initialWidth / initialHeight)

  // Check if device is mobile
  const isMobileDevice = useCallback(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(max-width: 768px)').matches
  }, [])

  // Load saved size from localStorage
  useEffect(() => {
    try {
      const savedSize = localStorage.getItem(`widget-size-${id}`)
      if (savedSize) {
        const parsed = JSON.parse(savedSize)
        if (parsed.width && parsed.height) {
          setWidth(parsed.width)
          setHeight(parsed.height)
          aspectRatioRef.current = parsed.width / parsed.height
        }
      }
    } catch (error) {
      console.warn(`Failed to load saved size for widget ${id}:`, error)
    }
  }, [id])

  // Persist size to localStorage
  const saveSize = useCallback(
    (w: number, h: number) => {
      try {
        localStorage.setItem(`widget-size-${id}`, JSON.stringify({ width: w, height: h }))
      } catch (error) {
        console.warn(`Failed to save size for widget ${id}:`, error)
      }
    },
    [id]
  )

  // Get constraint bounds based on current breakpoint
  const getConstraints = useCallback(() => {
    let constraints = { minWidth, maxWidth, minHeight, maxHeight }

    if (responsiveBreakpoints && typeof window !== 'undefined') {
      if (window.matchMedia('(max-width: 768px)').matches && responsiveBreakpoints.mobile) {
        constraints = {
          minWidth: responsiveBreakpoints.mobile.minWidth ?? minWidth,
          maxWidth: responsiveBreakpoints.mobile.maxWidth ?? maxWidth,
          minHeight: responsiveBreakpoints.mobile.minHeight ?? minHeight,
          maxHeight: responsiveBreakpoints.mobile.maxHeight ?? maxHeight,
        }
      } else if (window.matchMedia('(max-width: 1024px)').matches && responsiveBreakpoints.tablet) {
        constraints = {
          minWidth: responsiveBreakpoints.tablet.minWidth ?? minWidth,
          maxWidth: responsiveBreakpoints.tablet.maxWidth ?? maxWidth,
          minHeight: responsiveBreakpoints.tablet.minHeight ?? minHeight,
          maxHeight: responsiveBreakpoints.tablet.maxHeight ?? maxHeight,
        }
      } else if (responsiveBreakpoints.desktop) {
        constraints = {
          minWidth: responsiveBreakpoints.desktop.minWidth ?? minWidth,
          maxWidth: responsiveBreakpoints.desktop.maxWidth ?? maxWidth,
          minHeight: responsiveBreakpoints.desktop.minHeight ?? minHeight,
          maxHeight: responsiveBreakpoints.desktop.maxHeight ?? maxHeight,
        }
      }
    }

    return constraints
  }, [minWidth, maxWidth, minHeight, maxHeight, responsiveBreakpoints])

  // Clamp value between min and max
  const clamp = (value: number, min: number, max: number) => {
    return Math.max(min, Math.min(max, value))
  }

  // Handle resize start
  const handleResizeStart = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, handle: ResizeHandle) => {
      e.preventDefault()
      e.stopPropagation()

      // Don't resize on mobile if disabled
      if (disableResizeOnMobile && isMobileDevice()) {
        return
      }

      setIsResizing(true)
      setResizingHandle(handle)
      resizeStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        width,
        height,
      }
      aspectRatioRef.current = width / height
    },
    [width, height, disableResizeOnMobile, isMobileDevice]
  )

  // Handle resize move
  const handleResizeMove = useCallback(
    (e: PointerEvent) => {
      if (!isResizing || !resizeStartRef.current || !resizingHandle) return

      const constraints = getConstraints()
      const deltaX = e.clientX - resizeStartRef.current.x
      const deltaY = e.clientY - resizeStartRef.current.y

      let newWidth = resizeStartRef.current.width
      let newHeight = resizeStartRef.current.height

      // Update dimensions based on which handle is being dragged
      if (resizingHandle.includes('right')) {
        newWidth = resizeStartRef.current.width + deltaX
      } else if (resizingHandle.includes('left')) {
        newWidth = resizeStartRef.current.width - deltaX
      }

      if (resizingHandle.includes('bottom')) {
        newHeight = resizeStartRef.current.height + deltaY
      } else if (resizingHandle.includes('top')) {
        newHeight = resizeStartRef.current.height - deltaY
      }

      // Apply constraints
      newWidth = clamp(newWidth, constraints.minWidth, constraints.maxWidth)
      newHeight = clamp(newHeight, constraints.minHeight, constraints.maxHeight)

      // Maintain aspect ratio if enabled
      if (maintainAspectRatio) {
        const currentRatio = newWidth / newHeight
        const targetRatio = aspectRatioRef.current

        if (Math.abs(currentRatio - targetRatio) > 0.01) {
          if (resizingHandle.includes('right') || resizingHandle.includes('left')) {
            newHeight = newWidth / targetRatio
            newHeight = clamp(newHeight, constraints.minHeight, constraints.maxHeight)
          } else {
            newWidth = newHeight * targetRatio
            newWidth = clamp(newWidth, constraints.minWidth, constraints.maxWidth)
          }
        }
      }

      setWidth(newWidth)
      setHeight(newHeight)

      if (showDimensionsWhileResizing) {
        setDisplayDimensions({ width: newWidth, height: newHeight })
      }

      // Call resize callback
      if (onResize) {
        onResize({ width: newWidth, height: newHeight })
      }
    },
    [isResizing, resizingHandle, maintainAspectRatio, showDimensionsWhileResizing, onResize, getConstraints]
  )

  // Handle resize end
  const handleResizeEnd = useCallback(() => {
    if (isResizing) {
      setIsResizing(false)
      setResizingHandle(null)
      resizeStartRef.current = null
      setDisplayDimensions(null)

      // Save size to localStorage
      if (width && height) {
        saveSize(width, height)
      }
    }
  }, [isResizing, width, height, saveSize])

  // Attach resize move/end listeners
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('pointermove', handleResizeMove)
      document.addEventListener('pointerup', handleResizeEnd)

      return () => {
        document.removeEventListener('pointermove', handleResizeMove)
        document.removeEventListener('pointerup', handleResizeEnd)
      }
    }
  }, [isResizing, handleResizeMove, handleResizeEnd])

  // Check if mobile and disable resize handles
  const shouldShowHandles = !disableResizeOnMobile || !isMobileDevice()

  // Set initial dimensions from localStorage on mount
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.style.width = `${width}px`
      containerRef.current.style.height = `${height}px`
    }
  }, [width, height])

  return (
    <div
      ref={containerRef}
      data-testid="resizable-widget"
      className={cn(
        'relative bg-white dark:bg-slate-900 border border-border/50 rounded-lg overflow-hidden transition-all duration-150',
        isResizing && 'resize-active shadow-lg border-primary/50',
        className
      )}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        userSelect: isResizing ? 'none' : 'auto',
      }}
      onMouseEnter={() => setShowHandles(true)}
      onMouseLeave={() => setShowHandles(false)}
    >
      {/* Widget content */}
      <div className="h-full overflow-auto flex flex-col">
        {title && (
          <div className="px-4 py-3 border-b border-border/50 bg-white/50 dark:bg-slate-900/50 flex-shrink-0">
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          </div>
        )}
        <div className="flex-1 overflow-auto p-4">{children}</div>
      </div>

      {/* Dimensions display during resize */}
      {showDimensionsWhileResizing && displayDimensions && (
        <div
          data-testid="resize-dimensions-display"
          className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs font-medium px-2 py-1 rounded pointer-events-none z-50"
        >
          {Math.round(displayDimensions.width)} × {Math.round(displayDimensions.height)}
        </div>
      )}

      {/* Resize handles */}
      {shouldShowHandles && (
        <>
          {RESIZE_HANDLES.map((handle) => (
            <div
              key={handle}
              data-testid={`resize-handle-${handle}`}
              onPointerDown={(e) => handleResizeStart(e, handle)}
              className={cn(
                'absolute opacity-0 hover:opacity-100 transition-opacity duration-200 z-40',
                isResizing && 'opacity-100',
                // Position styles
                handle === 'top-left' && 'top-0 left-0 w-3 h-3 cursor-nwse-resize',
                handle === 'top' && 'top-0 left-1/2 -translate-x-1/2 w-8 h-3 cursor-ns-resize',
                handle === 'top-right' && 'top-0 right-0 w-3 h-3 cursor-nesw-resize',
                handle === 'right' && 'top-1/2 -translate-y-1/2 right-0 w-3 h-8 cursor-ew-resize',
                handle === 'bottom-right' && 'bottom-0 right-0 w-3 h-3 cursor-nwse-resize',
                handle === 'bottom' && 'bottom-0 left-1/2 -translate-x-1/2 w-8 h-3 cursor-ns-resize',
                handle === 'bottom-left' && 'bottom-0 left-0 w-3 h-3 cursor-nesw-resize',
                handle === 'left' && 'top-1/2 -translate-y-1/2 left-0 w-3 h-8 cursor-ew-resize',
                // Visual feedback
                'bg-primary/20 hover:bg-primary/40 dark:hover:bg-primary/60'
              )}
              aria-label={`Resize widget ${handle}`}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return

                const step = e.shiftKey ? 10 : 1
                const constraints = getConstraints()

                let newWidth = width
                let newHeight = height

                if ((e.key === 'ArrowRight' && handle.includes('right')) || (e.key === 'ArrowLeft' && handle.includes('left'))) {
                  if (e.key === 'ArrowRight') {
                    newWidth = clamp(width + step, constraints.minWidth, constraints.maxWidth)
                  } else {
                    newWidth = clamp(width - step, constraints.minWidth, constraints.maxWidth)
                  }
                } else if ((e.key === 'ArrowDown' && handle.includes('bottom')) || (e.key === 'ArrowUp' && handle.includes('top'))) {
                  if (e.key === 'ArrowDown') {
                    newHeight = clamp(height + step, constraints.minHeight, constraints.maxHeight)
                  } else {
                    newHeight = clamp(height - step, constraints.minHeight, constraints.maxHeight)
                  }
                }

                if (newWidth !== width || newHeight !== height) {
                  e.preventDefault()
                  setWidth(newWidth)
                  setHeight(newHeight)
                  saveSize(newWidth, newHeight)
                  if (onResize) {
                    onResize({ width: newWidth, height: newHeight })
                  }
                }
              }}
            />
          ))}
        </>
      )}
    </div>
  )
}
