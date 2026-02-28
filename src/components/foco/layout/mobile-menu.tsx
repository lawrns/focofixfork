'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Menu,
  X,
  Home,
  Send,
  Activity,
  BookOpen,
  Clock,
  Mail,
  Archive,
  Shield,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/hooks/use-auth'

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  section?: string
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: Home },
  { label: 'Dispatch',  href: '/openclaw',  icon: Send },
  { label: 'Runs',      href: '/runs',      icon: Activity },
  { label: 'Ledger',    href: '/ledger',    icon: BookOpen },
  { label: 'Crons',     href: '/crons',     icon: Clock,    section: 'Operate' },
  { label: 'Emails',    href: '/emails',    icon: Mail },
  { label: 'Artifacts', href: '/artifacts', icon: Archive },
  { label: 'Policies',  href: '/policies',  icon: Shield },
  { label: 'Settings',  href: '/settings',  icon: Settings, section: 'Settings' },
]

export function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const pathname = usePathname()
  const { user } = useAuth()
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndX = e.changedTouches[0].clientX
    const touchEndY = e.changedTouches[0].clientY
    const deltaX = touchEndX - touchStartX.current
    const deltaY = Math.abs(touchEndY - touchStartY.current)
    if (deltaX > 50 && deltaY < 50) setIsOpen(false)
  }

  if (!isMobile) return null

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === href
    return pathname?.startsWith(href)
  }

  return (
    <>
      {/* Hamburger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 left-4 z-40 p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        aria-label="Open menu"
      >
        <Menu className="h-6 w-6 text-zinc-900 dark:text-zinc-50" />
      </button>

      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-50 bg-black/50"
            data-testid="menu-backdrop"
          />
        )}
      </AnimatePresence>

      {/* Slide-in Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.nav
            key="menu"
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            className="fixed left-0 top-0 bottom-0 z-40 w-80 bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 overflow-y-auto flex flex-col"
            role="navigation"
            aria-hidden="false"
          >
            {/* Header */}
            <div className="flex items-center justify-between h-14 px-4 border-b border-zinc-200 dark:border-zinc-800 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-zinc-900 dark:bg-zinc-50 flex items-center justify-center">
                  <span className="text-sm font-bold text-zinc-50 dark:text-zinc-900">C</span>
                </div>
                <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Critter</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                aria-label="Close menu"
              >
                <X className="h-5 w-5 text-zinc-900 dark:text-zinc-50" />
              </button>
            </div>

            {/* User Profile Section */}
            {user && (
              <div className="px-4 py-4 border-b border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50 truncate">
                      {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
                    </p>
                    <p className="text-xs text-zinc-500 truncate">{user?.email}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Items */}
            <nav className="flex-1 overflow-y-auto p-2 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon
                const active = isActive(item.href)

                return (
                  <React.Fragment key={item.href}>
                    {item.section && (
                      <div className="px-4 pt-4 pb-1">
                        <span className="text-[10px] font-mono tracking-widest uppercase text-zinc-400">
                          {item.section}
                        </span>
                      </div>
                    )}
                    <Link
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={cn(
                        'nav-link flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                        'hover:bg-zinc-100 dark:hover:bg-zinc-800',
                        active
                          ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50'
                          : 'text-zinc-600 dark:text-zinc-400'
                      )}
                    >
                      <Icon className="h-5 w-5 flex-shrink-0" />
                      <span className="flex-1">{item.label}</span>
                    </Link>
                  </React.Fragment>
                )
              })}
            </nav>

            {/* Footer */}
            <div className="h-4 flex-shrink-0 border-t border-zinc-200 dark:border-zinc-800" />
          </motion.nav>
        )}
      </AnimatePresence>
    </>
  )
}
