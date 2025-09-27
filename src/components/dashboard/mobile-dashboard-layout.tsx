'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Menu, X, Search, Filter, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface MobileDashboardLayoutProps {
  children: React.ReactNode
  header?: React.ReactNode
  sidebar?: React.ReactNode
  searchTerm?: string
  onSearchChange?: (term: string) => void
  onCreateNew?: () => void
  createButtonText?: string
  className?: string
}

export function MobileDashboardLayout({
  children,
  header,
  sidebar,
  searchTerm = '',
  onSearchChange,
  onCreateNew,
  createButtonText = 'Create New',
  className
}: MobileDashboardLayoutProps) {
  const [isMobile, setIsMobile] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showMobileSearch, setShowMobileSearch] = useState(false)

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  if (isMobile) {
    return (
      <div className={cn('min-h-screen bg-background', className)}>
        {/* Mobile Header */}
        <header className="sticky top-0 z-40 bg-card border-b border-border shadow-sm">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              {/* Left: Menu button and title */}
              <div className="flex items-center gap-3">
                {sidebar && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSidebarOpen(true)}
                    className="p-2"
                    aria-label="Open menu"
                  >
                    <Menu className="w-5 h-5" />
                  </Button>
                )}

                <div className="flex-1 min-w-0">
                  {header}
                </div>
              </div>

              {/* Right: Action buttons */}
              <div className="flex items-center gap-2">
                {onSearchChange && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowMobileSearch(!showMobileSearch)}
                    className="p-2"
                    aria-label="Toggle search"
                  >
                    <Search className="w-5 h-5" />
                  </Button>
                )}

                {onCreateNew && (
                  <Button
                    size="sm"
                    onClick={onCreateNew}
                    className="px-4 py-2 min-h-[40px]"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">{createButtonText}</span>
                  </Button>
                )}
              </div>
            </div>

            {/* Mobile Search Bar */}
            {showMobileSearch && onSearchChange && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-3 overflow-hidden"
              >
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="pl-10 pr-4 py-3 w-full"
                    autoFocus
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowMobileSearch(false)
                      onSearchChange('')
                    }}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            )}
          </div>
        </header>

        {/* Mobile Sidebar Overlay */}
        {sidebar && sidebarOpen && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/50 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
            />
            <motion.div
              className="fixed left-0 top-0 bottom-0 w-80 max-w-[85vw] bg-card border-r border-border z-50 overflow-y-auto"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h2 className="text-lg font-semibold">Menu</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarOpen(false)}
                  className="p-2"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <div className="p-4">
                {sidebar}
              </div>
            </motion.div>
          </>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-6">
            {children}
          </div>
        </main>

        {/* Mobile Bottom Action Bar */}
        {onCreateNew && (
          <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 safe-area-pb">
            <Button
              onClick={onCreateNew}
              className="w-full py-4 text-base font-semibold min-h-[56px]"
              size="lg"
            >
              <Plus className="w-5 h-5 mr-2" />
              {createButtonText}
            </Button>
          </div>
        )}

        {/* Bottom padding for fixed action bar */}
        {onCreateNew && <div className="h-20" />}
      </div>
    )
  }

  // Desktop Layout (fallback to standard layout)
  return (
    <div className={cn('min-h-screen bg-background flex', className)}>
      {/* Desktop Sidebar */}
      {sidebar && (
        <aside className="w-64 border-r border-border bg-card">
          {sidebar}
        </aside>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Desktop Header */}
        {header && (
          <header className="bg-card border-b border-border px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                {header}
              </div>

              <div className="flex items-center gap-4">
                {onSearchChange && (
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search..."
                      value={searchTerm}
                      onChange={(e) => onSearchChange(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                )}

                {onCreateNew && (
                  <Button onClick={onCreateNew}>
                    <Plus className="w-4 h-4 mr-2" />
                    {createButtonText}
                  </Button>
                )}
              </div>
            </div>
          </header>
        )}

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

export default MobileDashboardLayout
