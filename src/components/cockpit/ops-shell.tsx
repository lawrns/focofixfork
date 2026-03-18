'use client'

import { ReactNode, useState, useCallback, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { SystemRibbon } from './system-ribbon'
import { NavRail } from './nav-rail'
import { UndoToast } from '@/components/foco/ui/undo-toast'
import { SwarmProvider } from '@/components/critter/swarm-context'
import { LazyMotion, MotionConfig, domAnimation } from 'framer-motion'

// Lazy-load heavy components — only downloaded when actually needed
const CommandPalette = dynamic(() => import('@/components/foco/layout/command-palette').then(m => ({ default: m.CommandPalette })))
const KeyboardShortcutsModal = dynamic(() => import('@/components/foco/layout/keyboard-shortcuts-modal').then(m => ({ default: m.KeyboardShortcutsModal })))
const DispatchModalLazy = dynamic(() => import('./dispatch-modal-lazy'), { ssr: false })

const PUBLIC_PATHS = new Set([
  '/', '/login', '/register', '/signup',
  '/forgot-password', '/reset-password',
])

interface OpsShellProps {
  children: ReactNode
}

export function OpsShell({ children }: OpsShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const isPublic = pathname ? PUBLIC_PATHS.has(pathname) : false

  const [dispatchOpen, setDispatchOpen] = useState(false)
  const [preferredModel, setPreferredModel] = useState('')

  // Prefetch key routes
  useEffect(() => {
    router.prefetch('/cockpit')
    router.prefetch('/runs')
    router.prefetch('/dashboard')
  }, [router])

  const handleAction = useCallback((action: string) => {
    if (action === 'dispatch' || action === 'goal') {
      setDispatchOpen(true)
    }
    if (action === 'pause') {
      if (confirm('Pause all non-critical running tasks?')) {
        fetch('/api/policies/fleet-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paused: true }),
        }).catch(() => {})
      }
    }
    if (action === 'stop') {
      if (confirm('Emergency stop: cancel all non-critical running tasks?')) {
        fetch('/api/policies/fleet-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paused: true }),
        }).catch(() => {})
      }
    }
  }, [])

  // Public pages: no chrome
  if (isPublic) {
    return (
      <MotionConfig reducedMotion="user">
        <LazyMotion features={domAnimation}>
          <div className="min-h-screen bg-background text-foreground">
            {children}
          </div>
        </LazyMotion>
      </MotionConfig>
    )
  }

  // App pages: cockpit chrome
  return (
    <MotionConfig reducedMotion="user">
      <LazyMotion features={domAnimation}>
        <SwarmProvider>
          <div className="flex flex-col h-screen bg-[#0a0a0b] text-zinc-100 overflow-hidden">
            <CommandPalette />
            <KeyboardShortcutsModal />

            {/* System ribbon — top bar */}
            <SystemRibbon onModelChange={setPreferredModel} />

            {/* Body: nav rail + content */}
            <div className="flex flex-1 min-h-0 overflow-hidden">
              <NavRail onAction={handleAction} />
              <main className="flex flex-col flex-1 min-h-0 overflow-auto">
                {children}
              </main>
            </div>

            {/* Dispatch modal — only loaded when opened */}
            {dispatchOpen && (
              <DispatchModalLazy
                open={dispatchOpen}
                onClose={() => setDispatchOpen(false)}
                preferredModel={preferredModel}
              />
            )}

            <UndoToast />
          </div>
        </SwarmProvider>
      </LazyMotion>
    </MotionConfig>
  )
}
