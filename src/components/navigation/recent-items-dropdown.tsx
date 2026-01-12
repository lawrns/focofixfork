'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Clock, X, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { useRecentItems } from '@/hooks/useRecentItems'
import { cn } from '@/lib/utils'

/**
 * Format relative time (e.g., "2 mins ago", "1 hour ago")
 */
function formatRelativeTime(timestamp: string): string {
  const now = new Date()
  const past = new Date(timestamp)
  const diffMs = now.getTime() - past.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins} min${diffMins === 1 ? '' : 's'} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`

  return past.toLocaleDateString()
}

/**
 * Get navigation path for an item
 */
function getItemPath(type: 'task' | 'project', id: string): string {
  if (type === 'task') return `/tasks/${id}`
  return `/projects/${id}`
}

interface RecentItemsDropdownProps {
  className?: string
}

/**
 * Dropdown menu showing recently viewed tasks and projects
 * Groups items by type (up to 3 tasks and 3 projects)
 * Displays in format: icon + name + relative timestamp
 */
export function RecentItemsDropdown({ className }: RecentItemsDropdownProps) {
  const { items, getGrouped, removeItem, clearAll } = useRecentItems()
  const grouped = getGrouped()
  const hasItems = grouped.tasks.length > 0 || grouped.projects.length > 0
  const [open, setOpen] = useState(false)

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn('relative', className)}
          title="Recent items"
          aria-label="Recent items"
        >
          <Clock className="h-5 w-5" />
          {hasItems && (
            <span className="absolute top-1 right-1 h-2 w-2 bg-blue-500 rounded-full" />
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64">
        {!hasItems ? (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">
            No recent items yet
          </div>
        ) : (
          <>
            {/* Tasks Section */}
            {grouped.tasks.length > 0 && (
              <div>
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase">
                  Tasks
                </div>
                {grouped.tasks.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 px-2 py-1">
                    <Link
                      href={getItemPath(item.type, item.id)}
                      className="flex-1 text-sm truncate hover:underline py-1.5"
                      onClick={() => setOpen(false)}
                    >
                      {item.name}
                    </Link>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatRelativeTime(item.timestamp)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={(e) => {
                        e.preventDefault()
                        removeItem(item.id)
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Divider if both sections have items */}
            {grouped.tasks.length > 0 && grouped.projects.length > 0 && (
              <DropdownMenuSeparator />
            )}

            {/* Projects Section */}
            {grouped.projects.length > 0 && (
              <div>
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase">
                  Projects
                </div>
                {grouped.projects.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 px-2 py-1">
                    <Link
                      href={getItemPath(item.type, item.id)}
                      className="flex-1 text-sm truncate hover:underline py-1.5"
                      onClick={() => setOpen(false)}
                    >
                      {item.name}
                    </Link>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatRelativeTime(item.timestamp)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={(e) => {
                        e.preventDefault()
                        removeItem(item.id)
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Clear All Button */}
            {hasItems && (
              <>
                <DropdownMenuSeparator />
                <div className="px-2 py-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-xs"
                    onClick={() => {
                      clearAll()
                      setOpen(false)
                    }}
                  >
                    <Trash2 className="h-3 w-3 mr-2" />
                    Clear all
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
