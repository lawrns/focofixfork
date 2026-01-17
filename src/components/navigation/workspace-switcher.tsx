'use client'

import React, { useEffect, useState, useRef } from 'react'
import { ChevronDown, Plus, Loader2, Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/use-auth'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { CreateWorkspaceDialog } from '@/components/dialogs/create-workspace-dialog'
import { audioService } from '@/lib/audio/audio-service'
import { hapticService } from '@/lib/audio/haptic-service'

export interface Workspace {
  id: string
  name: string
  slug: string
  icon?: string
}

interface WorkspaceSwitcherProps {
  currentWorkspace?: string
  onCreateOpen?: () => void
}

const KEYBOARD_SHORTCUT_KEY = 'Shift+Meta+W' // Cmd+Shift+W on Mac, Ctrl+Shift+W on Windows

export const WorkspaceSwitcher: React.FC<WorkspaceSwitcherProps> = ({
  currentWorkspace,
  onCreateOpen,
}) => {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [announcement, setAnnouncement] = useState('')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const router = useRouter()
  const { user } = useAuth()

  // Get current workspace from props or localStorage
  const current = currentWorkspace || localStorage.getItem('lastWorkspace') || ''
  const currentWorkspaceData = workspaces.find(w => w.slug === current)

  // Fetch workspaces on mount
  useEffect(() => {
    fetchWorkspaces()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  // Filter workspaces based on search
  const filteredWorkspaces = workspaces.filter(w =>
    w.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0
      const isShiftPressed = event.shiftKey
      const isMetaOrCtrl = isMac ? event.metaKey : event.ctrlKey

      if (isShiftPressed && isMetaOrCtrl && event.key.toLowerCase() === 'w') {
        event.preventDefault()
        setIsOpen(!isOpen)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  // Focus search input when dropdown opens with search
  useEffect(() => {
    if (isOpen && filteredWorkspaces.length >= 5 && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 0)
    }
  }, [isOpen, filteredWorkspaces.length])

  // Announce workspace changes
  useEffect(() => {
    if (announcement) {
      const timer = setTimeout(() => setAnnouncement(''), 3000)
      return () => clearTimeout(timer)
    }
  }, [announcement])

  const handleWorkspaceSwitch = (workspace: Workspace) => {
    localStorage.setItem('lastWorkspace', workspace.slug)
    audioService.play('sync')
    hapticService.light()
    setAnnouncement(`Switched to ${workspace.name}`)
    setIsOpen(false)

    // Navigate to workspace dashboard
    router.push(`/${workspace.slug}/dashboard`)
  }

  const handleCreateWorkspace = () => {
    setIsOpen(false)
    setShowCreateDialog(true)
    onCreateOpen?.()
  }

  const handleWorkspaceCreated = () => {
    // Refresh workspace list
    fetchWorkspaces()
  }

  const fetchWorkspaces = async () => {
    if (!user) return

    try {
      setIsLoading(true)
      const response = await fetch('/api/workspaces', { credentials: 'include' })
      if (!response.ok) throw new Error('Failed to fetch workspaces')

      const data = await response.json()
      setWorkspaces(data.data?.workspaces || data.workspaces || [])
    } catch (error) {
      console.error('Error fetching workspaces:', error)
      setTimeout(() => {
        fetch('/api/workspaces', { credentials: 'include' })
          .then(res => res.json())
          .then(data => setWorkspaces(data.data?.workspaces || data.workspaces || []))
          .catch(err => console.error('Retry failed:', err))
      }, 2000)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyNavigation = (event: React.KeyboardEvent) => {
    const displayWorkspaces = filteredWorkspaces.length > 0 ? filteredWorkspaces : workspaces
    const totalItems = displayWorkspaces.length + 1 // +1 for create option

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        setActiveIndex(prev => (prev + 1) % totalItems)
        break
      case 'ArrowUp':
        event.preventDefault()
        setActiveIndex(prev => (prev - 1 + totalItems) % totalItems)
        break
      case 'Enter':
        event.preventDefault()
        if (activeIndex < displayWorkspaces.length) {
          handleWorkspaceSwitch(displayWorkspaces[activeIndex])
        } else {
          handleCreateWorkspace()
        }
        break
      case 'Escape':
        event.preventDefault()
        setIsOpen(false)
        break
    }
  }

  return (
    <>
      {/* Screen reader announcement */}
      <div
        role="status"
        aria-live="polite"
        className="sr-only"
      >
        {announcement}
      </div>

      {/* Create Workspace Dialog */}
      <CreateWorkspaceDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={handleWorkspaceCreated}
      />

      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-2 px-3 py-2 h-11 min-h-[44px]"
            aria-haspopup="menu"
            aria-expanded={isOpen}
          >
            {currentWorkspaceData?.icon && (
              <span className="text-base">{currentWorkspaceData.icon}</span>
            )}
            <span className="text-sm font-medium truncate">
              {currentWorkspaceData?.name || 'Workspace'}
            </span>
            <ChevronDown className={cn(
              'h-4 w-4 opacity-50 transition-transform',
              isOpen && 'rotate-180'
            )} />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-56" ref={menuRef}>
          {/* Search Input - Show if 5+ workspaces */}
          {filteredWorkspaces.length >= 5 && (
            <div className="px-2 py-2">
              <Input
                ref={searchInputRef}
                placeholder="Search workspaces..."
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value)
                  setActiveIndex(0)
                }}
                onKeyDown={handleKeyNavigation}
                className="h-8 text-sm"
              />
            </div>
          )}

          {/* Workspaces List */}
          {isLoading ? (
            <DropdownMenuItem disabled className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="ml-2">Loading workspaces...</span>
            </DropdownMenuItem>
          ) : filteredWorkspaces.length === 0 && searchQuery ? (
            <DropdownMenuItem disabled className="text-sm text-muted-foreground py-2">
              No workspaces match your search
            </DropdownMenuItem>
          ) : (
            filteredWorkspaces.map((workspace, index) => (
              <DropdownMenuItem
                key={workspace.id}
                onClick={() => handleWorkspaceSwitch(workspace)}
                onKeyDown={handleKeyNavigation}
                className={cn(
                  'cursor-pointer flex items-center gap-2 px-3 py-2 rounded-sm text-sm transition-colors',
                  current === workspace.slug
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-accent hover:text-accent-foreground',
                  activeIndex === index && 'bg-accent'
                )}
                role="menuitem"
                tabIndex={activeIndex === index ? 0 : -1}
              >
                {workspace.icon && <span className="text-base">{workspace.icon}</span>}
                <span className="flex-1 truncate">{workspace.name}</span>
                {current === workspace.slug && (
                  <span className="text-xs font-semibold">Active</span>
                )}
              </DropdownMenuItem>
            ))
          )}

          {/* Separator */}
          {(filteredWorkspaces.length > 0 || workspaces.length > 0) && (
            <DropdownMenuSeparator role="separator" />
          )}

          {/* Create Workspace Option */}
          <DropdownMenuItem
            onClick={handleCreateWorkspace}
            onKeyDown={handleKeyNavigation}
            className={cn(
              'cursor-pointer flex items-center gap-2 px-3 py-2 rounded-sm text-sm transition-colors',
              'hover:bg-accent hover:text-accent-foreground',
              activeIndex === filteredWorkspaces.length && 'bg-accent'
            )}
            role="menuitem"
          >
            <Plus className="h-4 w-4" />
            <span>Create workspace</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}
