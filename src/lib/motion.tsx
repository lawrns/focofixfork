'use client'

import { ReactNode, HTMLAttributes, forwardRef } from 'react'

// Lightweight components that render immediately without animation overhead
// These can be swapped for framer-motion on pages that truly need animations

interface MotionProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode
  initial?: any
  animate?: any
  exit?: any
  transition?: any
  variants?: any
  whileHover?: any
  whileTap?: any
  layout?: any
}

export const MotionDiv = forwardRef<HTMLDivElement, MotionProps>(
  ({ children, initial, animate, exit, transition, variants, whileHover, whileTap, layout, ...props }, ref) => (
    <div ref={ref} {...props}>{children}</div>
  )
)
MotionDiv.displayName = 'MotionDiv'

export const MotionSpan = forwardRef<HTMLSpanElement, MotionProps & HTMLAttributes<HTMLSpanElement>>(
  ({ children, initial, animate, exit, transition, variants, whileHover, whileTap, layout, ...props }, ref) => (
    <span ref={ref as any} {...props}>{children}</span>
  )
)
MotionSpan.displayName = 'MotionSpan'

export const MotionUl = forwardRef<HTMLUListElement, MotionProps & HTMLAttributes<HTMLUListElement>>(
  ({ children, initial, animate, exit, transition, variants, whileHover, whileTap, layout, ...props }, ref) => (
    <ul ref={ref as any} {...props}>{children}</ul>
  )
)
MotionUl.displayName = 'MotionUl'

export const MotionLi = forwardRef<HTMLLIElement, MotionProps & HTMLAttributes<HTMLLIElement>>(
  ({ children, initial, animate, exit, transition, variants, whileHover, whileTap, layout, ...props }, ref) => (
    <li ref={ref as any} {...props}>{children}</li>
  )
)
MotionLi.displayName = 'MotionLi'

// AnimatePresence replacement that just renders children
export function AnimatePresenceLight({ children, mode }: { children: ReactNode; mode?: string }) {
  return <>{children}</>
}
