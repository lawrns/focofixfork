'use client'

import * as React from 'react'
import { Search, Filter, Share2, MoreHorizontal, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface HeaderNewProps {
  title?: string
  breadcrumbs?: Array<{ label: string; href?: string }>
  showSearch?: boolean
  showFilter?: boolean
  showShare?: boolean
  actions?: React.ReactNode
}

export function HeaderNew({
  title,
  breadcrumbs,
  showSearch = true,
  showFilter = true,
  showShare = true,
  actions,
}: HeaderNewProps) {
  return (
    <header className="sticky top-0 z-sticky bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800/50">
      <div className="h-14 px-6 flex items-center justify-between gap-4">
        {/* Left: Breadcrumbs & Title */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {breadcrumbs && breadcrumbs.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              {breadcrumbs.map((crumb, index) => (
                <React.Fragment key={index}>
                  {index > 0 && <span>/</span>}
                  <span className={crumb.href ? 'hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer' : ''}>
                    {crumb.label}
                  </span>
                </React.Fragment>
              ))}
            </div>
          )}
          {title && (
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
              {title}
            </h1>
          )}
        </div>

        {/* Center: Search & Filters */}
        <div className="flex items-center gap-2">
          {showSearch && (
            <div className="hidden md:flex items-center">
              <Input
                placeholder="Filter tasks..."
                leftIcon={<Search className="w-4 h-4" />}
                className="w-48"
              />
            </div>
          )}

          {showFilter && (
            <Button variant="ghost" size="icon">
              <Filter className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Right: Actions & User Menu */}
        <div className="flex items-center gap-2">
          {showShare && (
            <Button variant="ghost" size="icon">
              <Share2 className="w-4 h-4" />
            </Button>
          )}

          {actions}

          <Button variant="ghost" size="icon">
            <MoreHorizontal className="w-4 h-4" />
          </Button>

          <Button variant="ghost" size="icon">
            <User className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  )
}
