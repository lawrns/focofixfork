'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, useAnimation, PanInfo } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useMobile } from '@/lib/hooks/use-mobile'

export interface SnapPoint {
  label: string
  height: number
}

export interface MobileBottomSheetProps {
  snapPoints?: SnapPoint[]
  defaultSnap?: number
  onSnapChange?: (snapIndex: number) => void
  children?: React.ReactNode
  peekContent?: React.ReactNode
  showBackdrop?: boolean
  onBackdropClick?: () => void
  className?: string
  dragHandleClassName?: string
}

export function MobileBottomSheet({
  snapPoints = [
    { label: 'peek', height: 10 },
    { label: 'half', height: 50 },
    { label: 'full', height: 90 },
  ],
  defaultSnap = 0,
  onSnapChange,
  children,
  peekContent,
  showBackdrop = true,
  onBackdropClick,
  className,
  dragHandleClassName,
}: MobileBottomSheetProps) {
  const isMobile = useMobile()
  const [currentSnapIndex, setCurrentSnapIndex] = useState(defaultSnap)
  const [isDragging, setIsDragging] = useState(false)
  const controls = useAnimation()
  const sheetRef = useRef<HTMLDivElement>(null)

  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 0

  const getSnapPointY = React.useCallback(
    (snapIndex: number): number => {
      if (snapIndex < 0 || snapIndex >= snapPoints.length) {
        return viewportHeight * (1 - snapPoints[0].height / 100)
      }
      return viewportHeight * (1 - snapPoints[snapIndex].height / 100)
    },
    [viewportHeight, snapPoints]
  )

  const findNearestSnapPoint = React.useCallback(
    (y: number): number => {
      let nearestIndex = 0
      let minDistance = Math.abs(y - getSnapPointY(0))

      for (let i = 1; i < snapPoints.length; i++) {
        const snapY = getSnapPointY(i)
        const distance = Math.abs(y - snapY)
        if (distance < minDistance) {
          minDistance = distance
          nearestIndex = i
        }
      }

      return nearestIndex
    },
    [getSnapPointY, snapPoints.length]
  )

  const snapToPoint = React.useCallback(
    (snapIndex: number) => {
      const snapY = getSnapPointY(snapIndex)
      controls.start({
        y: snapY,
        transition: {
          type: 'spring',
          stiffness: 300,
          damping: 30,
        },
      })
      setCurrentSnapIndex(snapIndex)
      onSnapChange?.(snapIndex)
    },
    [controls, getSnapPointY, onSnapChange]
  )

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false)

    const currentY = getSnapPointY(currentSnapIndex) + info.offset.y
    const velocity = info.velocity.y

    let targetSnapIndex = currentSnapIndex

    if (Math.abs(velocity) > 500) {
      if (velocity > 0) {
        targetSnapIndex = Math.max(0, currentSnapIndex - 1)
      } else {
        targetSnapIndex = Math.min(snapPoints.length - 1, currentSnapIndex + 1)
      }
    } else {
      targetSnapIndex = findNearestSnapPoint(currentY)
    }

    snapToPoint(targetSnapIndex)
  }

  useEffect(() => {
    snapToPoint(defaultSnap)
  }, [defaultSnap, snapToPoint])

  useEffect(() => {
    const handleResize = () => {
      snapToPoint(currentSnapIndex)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [currentSnapIndex, snapToPoint])

  if (!isMobile) {
    return null
  }

  const backdropOpacity = snapPoints[currentSnapIndex]?.height > 30 ? 0.5 : 0
  const isPeekState = currentSnapIndex === 0

  return (
    <>
      {showBackdrop && (
        <motion.div
          className="fixed inset-0 bg-black z-40 pointer-events-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: backdropOpacity }}
          transition={{ duration: 0.3 }}
          onClick={onBackdropClick}
          style={{ pointerEvents: backdropOpacity > 0 ? 'auto' : 'none' }}
        />
      )}

      <motion.div
        ref={sheetRef}
        drag="y"
        dragConstraints={{
          top: getSnapPointY(snapPoints.length - 1),
          bottom: getSnapPointY(0),
        }}
        dragElastic={0.1}
        dragMomentum={false}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
        animate={controls}
        initial={{ y: getSnapPointY(defaultSnap) }}
        className={cn(
          'fixed left-0 right-0 z-50 bg-card rounded-t-2xl shadow-lg border-t border-border',
          'flex flex-col overflow-hidden',
          className
        )}
        style={{
          height: viewportHeight,
          touchAction: 'none',
        }}
      >
        {/* Drag Handle */}
        <div
          className={cn(
            'flex items-center justify-center py-3 cursor-grab active:cursor-grabbing',
            dragHandleClassName
          )}
        >
          <div className="w-12 h-1 bg-muted-foreground/20 rounded-full" />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {isPeekState && peekContent ? (
            <div className="px-4 pb-4">{peekContent}</div>
          ) : (
            <div className="flex-1 overflow-y-auto px-4 pb-4">{children}</div>
          )}
        </div>
      </motion.div>
    </>
  )
}
