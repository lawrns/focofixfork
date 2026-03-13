'use client'

import { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface UnifiedPageShellProps {
  children: ReactNode
  className?: string
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '6xl' | '7xl' | 'full'
  animate?: boolean
}

const FULL_WIDTH_CLASS = 'max-w-full'

const maxWidthClasses = {
  sm: FULL_WIDTH_CLASS,
  md: FULL_WIDTH_CLASS,
  lg: FULL_WIDTH_CLASS,
  xl: FULL_WIDTH_CLASS,
  '2xl': FULL_WIDTH_CLASS,
  '4xl': FULL_WIDTH_CLASS,
  '6xl': FULL_WIDTH_CLASS,
  '7xl': FULL_WIDTH_CLASS,
  full: FULL_WIDTH_CLASS,
}

const pageTransition = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
}

export function UnifiedPageShell({
  children,
  className,
  maxWidth = 'full',
  animate = true,
}: UnifiedPageShellProps) {
  if (!animate) {
    return (
      <div className={cn('mx-auto w-full py-4 sm:py-5 lg:py-6', maxWidthClasses[maxWidth], className)}>
        {children}
      </div>
    )
  }

  return (
    <motion.div
      variants={pageTransition}
      initial="initial"
      animate="animate"
      exit="exit"
      className={cn('mx-auto w-full py-4 sm:py-5 lg:py-6', maxWidthClasses[maxWidth], className)}
    >
      {children}
    </motion.div>
  )
}
