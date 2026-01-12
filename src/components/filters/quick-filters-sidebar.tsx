'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle, Edit, Trash2, Plus, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/skeleton-screens'

export interface SavedFilter {
  id: string
  name: string
  filters?: Record<string, any>
  workspace_id?: string
}

export interface QuickFilterCounts {
  assigned_to_me: number
  created_by_me: number
  due_today: number
  due_this_week: number
  overdue: number
  high_priority: number
  no_assignee: number
  completed: number
}

interface QuickFiltersSidebarProps {
  workspaceId: string
  onFilterChange: (filter: string | SavedFilter | null) => void
  activeFilter?: string | null
  className?: string
}

export function QuickFiltersSidebar({
  workspaceId,
  onFilterChange,
  activeFilter = null,
  className,
}: QuickFiltersSidebarProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [counts, setCounts] = useState<QuickFilterCounts | null>(null)
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([])
  const [loadingCounts, setLoadingCounts] = useState(true)
  const [loadingFilters, setLoadingFilters] = useState(true)
  const [errorCounts, setErrorCounts] = useState<string | null>(null)
  const [errorFilters, setErrorFilters] = useState<string | null>(null)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [filterName, setFilterName] = useState('')
  const [editingFilter, setEditingFilter] = useState<SavedFilter | null>(null)
  const [editingName, setEditingName] = useState('')

  // Fetch quick filter counts
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        setLoadingCounts(true)
        setErrorCounts(null)

        const response = await fetch(`/api/filters/quick-counts?workspace_id=${workspaceId}`)

        if (!response.ok) {
          throw new Error('Failed to fetch filter counts')
        }

        const data = await response.json()
        setCounts(data.data || data)
      } catch (error) {
        console.error('Error fetching quick counts:', error)
        setErrorCounts(error instanceof Error ? error.message : 'Failed to load filter counts')
      } finally {
        setLoadingCounts(false)
      }
    }

    fetchCounts()
  }, [workspaceId])

  // Fetch saved filters
  useEffect(() => {
    const fetchSavedFilters = async () => {
      try {
        setLoadingFilters(true)
        setErrorFilters(null)

        const response = await fetch(`/api/filters/saved?workspace_id=${workspaceId}`)

        if (!response.ok) {
          throw new Error('Failed to fetch saved filters')
        }

        const data = await response.json()
        setSavedFilters(Array.isArray(data.data) ? data.data : [])
      } catch (error) {
        console.error('Error fetching saved filters:', error)
        setErrorFilters(error instanceof Error ? error.message : 'Failed to load saved filters')
      } finally {
        setLoadingFilters(false)
      }
    }

    fetchSavedFilters()
  }, [workspaceId])

  const handleFilterClick = useCallback((filterId: string) => {
    const isActive = activeFilter === filterId

    if (isActive) {
      // Toggle off
      onFilterChange(null)
      router.push(`?`)
    } else {
      // Toggle on
      onFilterChange(filterId)
      router.push(`?filter=${filterId}`)
    }
  }, [activeFilter, onFilterChange, router])

  const handleSavedFilterClick = useCallback((filter: SavedFilter) => {
    onFilterChange(filter)
    router.push(`?saved_filter=${filter.id}`)
  }, [onFilterChange, router])

  const handleSaveCurrentFilter = useCallback(async () => {
    if (!filterName.trim()) return

    try {
      const response = await fetch('/api/filters/saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: filterName,
          workspace_id: workspaceId,
          filters: {}, // In a real app, capture current filter state
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save filter')
      }

      const data = await response.json()
      setSavedFilters([...savedFilters, data.data])
      setFilterName('')
      setShowSaveDialog(false)
    } catch (error) {
      console.error('Error saving filter:', error)
    }
  }, [filterName, workspaceId, savedFilters])

  const handleDeleteFilter = useCallback(async (filterId: string) => {
    try {
      const response = await fetch(`/api/filters/saved/${filterId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete filter')
      }

      setSavedFilters(savedFilters.filter(f => f.id !== filterId))
    } catch (error) {
      console.error('Error deleting filter:', error)
    }
  }, [savedFilters])

  const handleUpdateFilter = useCallback(async () => {
    if (!editingFilter || !editingName.trim()) return

    try {
      const response = await fetch(`/api/filters/saved/${editingFilter.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingName }),
      })

      if (!response.ok) {
        throw new Error('Failed to update filter')
      }

      setSavedFilters(savedFilters.map(f =>
        f.id === editingFilter.id ? { ...f, name: editingName } : f
      ))
      setEditingFilter(null)
      setEditingName('')
    } catch (error) {
      console.error('Error updating filter:', error)
    }
  }, [editingFilter, editingName, savedFilters])

  const preBuiltFilters = [
    { id: 'assigned_to_me', label: 'Assigned to me', key: 'assigned_to_me' },
    { id: 'created_by_me', label: 'Created by me', key: 'created_by_me' },
    { id: 'due_today', label: 'Due today', key: 'due_today' },
    { id: 'due_this_week', label: 'Due this week', key: 'due_this_week' },
    { id: 'overdue', label: 'Overdue', key: 'overdue' },
    { id: 'high_priority', label: 'High priority', key: 'high_priority' },
    { id: 'no_assignee', label: 'No assignee', key: 'no_assignee' },
    { id: 'completed', label: 'Completed', key: 'completed' },
  ]

  return (
    <aside
      className={cn(
        'w-64 bg-white border-r border-gray-200 p-4 space-y-4 overflow-y-auto',
        className
      )}
      role="region"
      aria-label="Quick Filters"
    >
      {/* Pre-built Filters */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-700 px-2">Quick Filters</h3>

        {errorCounts && (
          <div className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
            <AlertCircle className="h-4 w-4 text-yellow-600 flex-shrink-0" />
            <p className="text-xs text-yellow-600">Failed to load counts</p>
          </div>
        )}

        <div className="space-y-1">
          {preBuiltFilters.map((filter) => {
            const count = counts ? counts[filter.key as keyof QuickFilterCounts] : undefined
            const isActive = activeFilter === filter.id
            const isLoading = loadingCounts

            return (
              <button
                key={filter.id}
                onClick={() => handleFilterClick(filter.id)}
                aria-pressed={isActive}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors',
                  isActive
                    ? 'bg-blue-100 text-blue-900 font-bold'
                    : 'hover:bg-gray-100 text-gray-700'
                )}
              >
                <span>{filter.label}</span>

                {isLoading ? (
                  <Skeleton className="h-4 w-6" data-testid="badge-skeleton" />
                ) : count !== undefined && count > 0 ? (
                  <Badge
                    variant={filter.id === 'overdue' ? 'destructive' : 'secondary'}
                    className={cn(
                      'ml-2',
                      filter.id === 'overdue' && 'bg-red-500 text-white'
                    )}
                    data-testid={`${filter.id}-badge`}
                  >
                    {count}
                  </Badge>
                ) : null}
              </button>
            )
          })}
        </div>
      </div>

      {/* Divider */}
      <Separator role="separator" />

      {/* Saved Filters Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-sm font-semibold text-gray-700">Saved Filters</h3>
        </div>

        {errorFilters && (
          <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded">
            <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
            <p className="text-xs text-red-600">Failed to load saved filters</p>
          </div>
        )}

        {loadingFilters ? (
          <div className="space-y-2">
            {[1, 2].map(i => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : savedFilters.length > 0 ? (
          <div className="space-y-1">
            {savedFilters.map((filter) => (
              <div
                key={filter.id}
                className="flex items-center justify-between px-2 py-2 rounded-lg hover:bg-gray-100 group"
              >
                <button
                  onClick={() => handleSavedFilterClick(filter)}
                  className="flex-1 text-left text-sm text-gray-700 hover:text-gray-900 truncate"
                >
                  {filter.name}
                </button>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => {
                      setEditingFilter(filter)
                      setEditingName(filter.name)
                    }}
                    className="p-1 text-gray-500 hover:text-gray-700 rounded"
                    aria-label={`Edit ${filter.name}`}
                  >
                    <Edit className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => handleDeleteFilter(filter.id)}
                    className="p-1 text-gray-500 hover:text-red-600 rounded"
                    aria-label={`Delete ${filter.name}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {/* Save Current Filter Button */}
        <button
          onClick={() => setShowSaveDialog(true)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 border border-gray-200 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Save current filter</span>
        </button>
      </div>

      {/* Save Filter Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Current Filter</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="filter-name">Filter Name</Label>
              <Input
                id="filter-name"
                placeholder="Filter name"
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveCurrentFilter()
                }}
                autoFocus
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSaveDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveCurrentFilter}
              disabled={!filterName.trim()}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Filter Dialog */}
      <Dialog open={!!editingFilter} onOpenChange={(open) => !open && setEditingFilter(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Filter</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-filter-name">Filter Name</Label>
              <Input
                id="edit-filter-name"
                placeholder="Filter name"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleUpdateFilter()
                }}
                autoFocus
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingFilter(null)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateFilter}
              disabled={!editingName.trim()}
            >
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  )
}
