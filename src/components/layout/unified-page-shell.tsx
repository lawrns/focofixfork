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

const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '4xl': 'max-w-4xl',
  '6xl': 'max-w-6xl',
  '7xl': 'max-w-7xl',
  full: 'max-w-full',
}

const pageTransition = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
}

export function UnifiedPageShell({
  children,
  className,
  maxWidth = '7xl',
  animate = true,
}: UnifiedPageShellProps) {
  if (!animate) {
    return (
      <div className={cn('mx-auto w-full px-4 sm:px-6 lg:px-8 py-6', maxWidthClasses[maxWidth], className)}>
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
      className={cn('mx-auto w-full px-4 sm:px-6 lg:px-8 py-6', maxWidthClasses[maxWidth], className)}
    >
      {children}
    </motion.div>
  )
}
