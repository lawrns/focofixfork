'use client'

import React, { useState } from 'react'
import { ChevronDown, Plus, Save, Trash2, Edit, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useSavedViews, ViewConfig } from '@/lib/hooks/use-saved-views'
import { cn } from '@/lib/utils'

interface SavedViewsProps {
  onViewSelect: (view: ViewConfig) => void
  onViewSave: (name: string) => void
  currentViewConfig?: Omit<ViewConfig, 'id' | 'name' | 'createdAt' | 'updatedAt'>
  className?: string
}

export function SavedViews({
  onViewSelect,
  onViewSave,
  currentViewConfig,
  className
}: SavedViewsProps) {
  const {
    views,
    activeViewId,
    createView,
    deleteView,
    setActiveView,
    isLoading
  } = useSavedViews()

  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [saveViewName, setSaveViewName] = useState('')
  const [editingView, setEditingView] = useState<ViewConfig | null>(null)

  const activeView = views.find(view => view.id === activeViewId)

  const handleViewSelect = (view: ViewConfig) => {
    setActiveView(view.id)
    onViewSelect(view)
  }

  const handleSaveView = () => {
    if (!saveViewName.trim() || !currentViewConfig) return

    const viewId = createView({
      ...currentViewConfig,
      name: saveViewName.trim(),
    })

    setActiveView(viewId)
    setSaveViewName('')
    setShowSaveDialog(false)
    onViewSave(saveViewName.trim())
  }

  const handleDeleteView = (viewId: string, event: React.MouseEvent) => {
    event.stopPropagation()
    deleteView(viewId)
  }

  if (isLoading) {
    return (
      <div className={cn('flex items-center space-x-2', className)}>
        <div className="h-8 w-32 bg-muted rounded animate-pulse" />
      </div>
    )
  }

  return (
    <div className={cn('flex items-center space-x-2', className)}>
      {/* Saved Views Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="flex items-center space-x-2 whitespace-nowrap">
            <Eye className="h-4 w-4" />
            <span className="hidden lg:inline text-sm">
              {activeView?.name || 'All Projects'}
            </span>
            <span className="lg:hidden text-sm">
              Views
            </span>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          {views.map((view) => (
            <DropdownMenuItem
              key={view.id}
              onClick={() => handleViewSelect(view)}
              className={cn(
                'flex items-center justify-between cursor-pointer',
                activeViewId === view.id && 'bg-accent'
              )}
            >
              <div className="flex items-center space-x-2">
                <span className="text-sm">{view.name}</span>
                {view.filters && (
                  <span className="text-xs text-muted-foreground">
                    ({Object.keys(view.filters).length} filter{Object.keys(view.filters).length !== 1 ? 's' : ''})
                  </span>
                )}
              </div>
              {!view.id.startsWith('default-') && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
                  onClick={(e) => handleDeleteView(view.id, e)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </DropdownMenuItem>
          ))}

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => setShowSaveDialog(true)}
            className="flex items-center space-x-2 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Save Current View</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Save View Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Save Current View</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="view-name">View Name</Label>
              <Input
                id="view-name"
                value={saveViewName}
                onChange={(e) => setSaveViewName(e.target.value)}
                placeholder="Enter a name for this view"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveView()
                  }
                }}
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowSaveDialog(false)
                setSaveViewName('')
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveView}
              disabled={!saveViewName.trim()}
            >
              <Save className="h-4 w-4" />
              Save View
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default SavedViews
