'use client'

import { useEffect, useRef } from 'react'
import { Search, Command } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useQuickActions, type QuickAction } from '@/lib/hooks/use-quick-actions'
import { cn } from '@/lib/utils'

interface QuickActionsMenuProps {
  className?: string
}

const categoryLabels = {
  create: 'Create',
  navigate: 'Navigate',
  edit: 'Edit',
  view: 'View',
  settings: 'Settings'
}

const categoryIcons = {
  create: '✨',
  navigate: '🧭',
  edit: '✏️',
  view: '👁️',
  settings: '⚙️'
}

export function QuickActionsMenu({ className }: QuickActionsMenuProps) {
  const {
    isOpen,
    query,
    selectedIndex,
    filteredActions,
    groupedActions,
    open,
    close,
    setQuery,
    selectNext,
    selectPrevious,
    executeSelected
  } = useQuickActions()

  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          selectNext()
          break
        case 'ArrowUp':
          e.preventDefault()
          selectPrevious()
          break
        case 'Enter':
          e.preventDefault()
          executeSelected()
          break
        case 'Escape':
          e.preventDefault()
          close()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, selectNext, selectPrevious, executeSelected, close])

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, close])

  if (!isOpen) return null

  const renderAction = (action: QuickAction, index: number) => {
    const isSelected = index === selectedIndex
    const categoryIcon = categoryIcons[action.category] || '📝'

    return (
      <div
        key={action.id}
        className={cn(
          'flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors',
          isSelected 
            ? 'bg-blue-50 text-blue-900 dark:bg-blue-900/20 dark:text-blue-100' 
            : 'hover:bg-gray-50 dark:hover:bg-gray-800'
        )}
        onClick={() => {
          action.action()
          close()
        }}
      >
        <div className="text-lg">{action.icon || categoryIcon}</div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm">{action.title}</div>
          {action.description && (
            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {action.description}
            </div>
          )}
        </div>
        {action.shortcut && (
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <Command className="w-3 h-3" />
            <span>{action.shortcut.replace('Cmd+', '⌘').replace('Shift+', '⇧')}</span>
          </div>
        )}
      </div>
    )
  }

  const renderGroup = (category: string, actions: QuickAction[]) => {
    const categoryLabel = categoryLabels[category as keyof typeof categoryLabels] || category
    const categoryIcon = categoryIcons[category as keyof typeof categoryIcons] || '📝'

    // Find the index range for this category
    let startIndex = 0
    for (const [cat, catActions] of Object.entries(groupedActions)) {
      if (cat === category) break
      startIndex += catActions.length
    }

    return (
      <div key={category} className="mb-4">
        <div className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          <span>{categoryIcon}</span>
          <span>{categoryLabel}</span>
        </div>
        <div className="space-y-1">
          {actions.map((action, actionIndex) => 
            renderAction(action, startIndex + actionIndex)
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
      
      {/* Menu */}
      <div
        ref={containerRef}
        className={cn(
          'relative w-full max-w-2xl mx-4 bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700',
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <Search className="w-4 h-4 text-gray-400" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search..."
            className="border-0 shadow-none focus-visible:ring-0 text-base"
          />
          <div className="text-xs text-gray-400">
            Press <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">Esc</kbd> to close
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="max-h-96">
          <div className="p-2">
            {Object.keys(groupedActions).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="text-4xl mb-2">🔍</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  No actions found for &ldquo;{query}&rdquo;
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  Try a different search term
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {Object.entries(groupedActions).map(([category, actions]) =>
                  renderGroup(category, actions)
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">↑↓</kbd>
              <span>Navigate</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">Enter</kbd>
              <span>Select</span>
            </div>
          </div>
          <div className="text-xs">
            {filteredActions.length} action{filteredActions.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>
    </div>
  )
}
