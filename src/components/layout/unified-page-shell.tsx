'use client'

import { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { PageShell } from './page-shell'

interface UnifiedPageShellProps {
  children: ReactNode
  className?: string
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '6xl' | '7xl' | 'full'
  animate?: boolean
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
      <PageShell className={className} maxWidth={maxWidth}>
        {children}
      </PageShell>
    )
  }

  return (
    <motion.div
      variants={pageTransition}
      initial="initial"
      animate="animate"
      exit="exit"
      className="w-full"
    >
      <PageShell className={className} maxWidth={maxWidth}>
        {children}
      </PageShell>
    </motion.div>
  )
}
