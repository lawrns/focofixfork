'use client'

import { memo, useCallback, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Play, Pause, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { springs, scrubberHandleVariants, clamp } from './flow-diagram-animations'

// ============================================================================
// TYPES
// ============================================================================

export interface FlowDiagramScrubberProps {
  progress: number
  onChange: (progress: number) => void
  isPlaying: boolean
  onPlayPause: () => void
  onReset: () => void
  className?: string
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const FlowDiagramScrubber = memo(function FlowDiagramScrubber({
  progress,
  onChange,
  isPlaying,
  onPlayPause,
  onReset,
  className,
}: FlowDiagramScrubberProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  // Handle drag
  const handleDrag = useCallback(
    (clientX: number) => {
      if (!trackRef.current) return

      const rect = trackRef.current.getBoundingClientRect()
      const x = clientX - rect.left
      const newProgress = clamp(x / rect.width, 0, 1)
      onChange(newProgress)
    },
    [onChange]
  )

  // Mouse handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      setIsDragging(true)
      handleDrag(e.clientX)

      const handleMouseMove = (e: MouseEvent) => {
        handleDrag(e.clientX)
      }

      const handleMouseUp = () => {
        setIsDragging(false)
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    },
    [handleDrag]
  )

  // Touch handlers
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      setIsDragging(true)
      handleDrag(e.touches[0].clientX)
    },
    [handleDrag]
  )

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isDragging) return
      handleDrag(e.touches[0].clientX)
    },
    [isDragging, handleDrag]
  )

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const step = 0.05 // 5% steps
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          onChange(clamp(progress - step, 0, 1))
          break
        case 'ArrowRight':
          e.preventDefault()
          onChange(clamp(progress + step, 0, 1))
          break
        case 'Home':
          e.preventDefault()
          onChange(0)
          break
        case 'End':
          e.preventDefault()
          onChange(1)
          break
        case ' ':
          e.preventDefault()
          onPlayPause()
          break
      }
    },
    [progress, onChange, onPlayPause]
  )

  return (
    <div className={cn('flex items-center gap-4', className)}>
      {/* Control buttons */}
      <div className="flex items-center gap-1">
        {/* Play/Pause */}
        <motion.button
          onClick={onPlayPause}
          className={cn(
            'p-2 rounded-lg transition-colors',
            'bg-zinc-100 dark:bg-zinc-800',
            'hover:bg-zinc-200 dark:hover:bg-zinc-700',
            'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-950'
          )}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={springs.micro}
          aria-label={isPlaying ? 'Pause animation' : 'Play animation'}
        >
          {isPlaying ? (
            <Pause className="h-4 w-4 text-zinc-700 dark:text-zinc-300" />
          ) : (
            <Play className="h-4 w-4 text-zinc-700 dark:text-zinc-300" />
          )}
        </motion.button>

        {/* Reset */}
        <motion.button
          onClick={onReset}
          className={cn(
            'p-2 rounded-lg transition-colors',
            'bg-zinc-100 dark:bg-zinc-800',
            'hover:bg-zinc-200 dark:hover:bg-zinc-700',
            'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-950'
          )}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={springs.micro}
          aria-label="Reset animation"
        >
          <RotateCcw className="h-4 w-4 text-zinc-700 dark:text-zinc-300" />
        </motion.button>
      </div>

      {/* Labels */}
      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 select-none">
        Before
      </span>

      {/* Track */}
      <div
        ref={trackRef}
        className={cn(
          'relative flex-1 h-2 rounded-full cursor-pointer',
          'bg-zinc-200 dark:bg-zinc-700'
        )}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        role="slider"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
        aria-label="Animation progress"
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        {/* Progress fill */}
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
          style={{ width: `${progress * 100}%` }}
          initial={false}
          animate={{ width: `${progress * 100}%` }}
          transition={isDragging ? { duration: 0 } : springs.micro}
        />

        {/* Phase markers */}
        <div className="absolute inset-y-0 left-0 right-0 flex items-center">
          {/* Removal phase end (25%) */}
          <div
            className="absolute h-3 w-0.5 -translate-y-0.5 bg-red-400/50 dark:bg-red-500/50"
            style={{ left: '25%' }}
          />
          {/* Movement phase end (58%) */}
          <div
            className="absolute h-3 w-0.5 -translate-y-0.5 bg-amber-400/50 dark:bg-amber-500/50"
            style={{ left: '58%' }}
          />
          {/* Addition phase end (83%) */}
          <div
            className="absolute h-3 w-0.5 -translate-y-0.5 bg-emerald-400/50 dark:bg-emerald-500/50"
            style={{ left: '83%' }}
          />
        </div>

        {/* Handle */}
        <motion.div
          className={cn(
            'absolute top-1/2 -translate-y-1/2 -translate-x-1/2',
            'w-4 h-4 rounded-full',
            'bg-white dark:bg-zinc-100 border-2 border-indigo-500',
            'shadow-md cursor-grab',
            isDragging && 'cursor-grabbing'
          )}
          style={{ left: `${progress * 100}%` }}
          variants={scrubberHandleVariants}
          initial="idle"
          animate={isDragging ? 'dragging' : 'idle'}
          whileHover="hover"
        />
      </div>

      {/* End label */}
      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 select-none">
        After
      </span>

      {/* Progress percentage */}
      <span className="w-12 text-right text-xs font-mono text-zinc-400 dark:text-zinc-500 tabular-nums">
        {Math.round(progress * 100)}%
      </span>
    </div>
  )
})

export default FlowDiagramScrubber
