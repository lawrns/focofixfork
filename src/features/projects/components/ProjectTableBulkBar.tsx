'use client'

import { Button } from '@/components/ui/button'
import { Archive, Trash2, Users } from 'lucide-react'

interface ProjectTableBulkBarProps {
  selectedCount: number
  onManageTeam: () => void
  onArchive: () => void
  onDelete: () => void
  onCancel: () => void
}

export function ProjectTableBulkBar({
  selectedCount,
  onManageTeam,
  onArchive,
  onDelete,
  onCancel,
}: ProjectTableBulkBarProps) {
  if (selectedCount === 0) return null

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 bg-blue-50 dark:bg-blue-950 backdrop-blur-sm border-2 border-blue-400 dark:border-blue-600 p-3 pb-4 shadow-lg rounded-lg max-w-xl w-full mx-4">
      <div className="flex flex-row items-center justify-between gap-4">
        <div className="flex items-center flex-1 min-w-0">
          <span className="text-sm font-medium !text-blue-900 dark:!text-blue-100 whitespace-nowrap">
            {selectedCount} project{selectedCount !== 1 ? 's' : ''} selected
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={onManageTeam}
            className="flex items-center space-x-1 sm:space-x-2"
          >
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Team</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onArchive}
            className="flex items-center space-x-1 sm:space-x-2"
          >
            <Archive className="h-4 w-4" />
            <span>Archive</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onDelete}
            className="flex items-center space-x-1 sm:space-x-2 text-destructive hover:text-destructive border-destructive"
          >
            <Trash2 className="h-4 w-4" />
            <span>Delete</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}
