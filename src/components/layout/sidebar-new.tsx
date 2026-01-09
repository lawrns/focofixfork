'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Home,
  Search,
  Inbox,
  Settings,
  Plus,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface SidebarProps {
  collapsed?: boolean
  onCollapse?: (collapsed: boolean) => void
}

export function SidebarNew({ collapsed = false, onCollapse }: SidebarProps) {
  const pathname = usePathname()

  const quickLinks = [
    { icon: Home, label: 'Home', href: '/dashboard' },
    { icon: Search, label: 'Search', href: '/search', shortcut: '⌘K' },
    { icon: Inbox, label: 'Inbox', href: '/inbox', badge: 3 },
  ]

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 64 : 260 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={cn(
        'fixed left-0 top-0 bottom-0 z-40',
        'flex flex-col',
        'bg-gray-50 dark:bg-gray-950',
        'border-r border-gray-200 dark:border-gray-800'
      )}
    >
      {/* Header - Workspace Selector */}
      <div className="h-16 flex items-center px-4 border-b border-gray-200 dark:border-gray-800">
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-3 flex-1"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
              F
            </div>
            <span className="font-semibold text-gray-900 dark:text-white">
              Foco
            </span>
          </motion.div>
        )}
      </div>

      {/* Quick Links */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        <div className="space-y-1">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm',
                'text-gray-700 dark:text-gray-300',
                'hover:bg-gray-200/50 dark:hover:bg-gray-800',
                'transition-colors',
                pathname === link.href && 'bg-gray-200 dark:bg-gray-800 font-medium'
              )}
            >
              <link.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1">{link.label}</span>
                  {link.badge && (
                    <span className="px-1.5 py-0.5 text-xs bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400 rounded-full">
                      {link.badge}
                    </span>
                  )}
                  {link.shortcut && (
                    <kbd className="text-xs text-gray-400">{link.shortcut}</kbd>
                  )}
                </>
              )}
            </Link>
          ))}
        </div>

        {/* Projects Section */}
        {!collapsed && (
          <div className="mt-6">
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Projects
              </span>
              <Button variant="ghost" size="icon-xs">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </nav>

      {/* Footer - User */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800">
        <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
          <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center text-white font-semibold text-sm">
            U
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                User
              </p>
              <p className="text-xs text-gray-500 truncate">user@example.com</p>
            </div>
          )}
        </div>
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={() => onCollapse?.(!collapsed)}
        className={cn(
          'absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2',
          'w-6 h-6 rounded-full',
          'bg-white dark:bg-gray-800',
          'border border-gray-200 dark:border-gray-700',
          'shadow-sm',
          'flex items-center justify-center',
          'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300',
          'transition-colors'
        )}
      >
        {collapsed ? (
          <ChevronRight className="w-3 h-3" />
        ) : (
          <ChevronLeft className="w-3 h-3" />
        )}
      </button>
    </motion.aside>
  )
}
