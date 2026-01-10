/**
 * ExportDialog Component
 *
 * UI for exporting deprecated feature data before removal
 * Provides one-click comprehensive export or individual exports
 *
 * Part of Foco's Phase 3: Full Transition - Data Preservation
 */

'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Download, CheckCircle2, AlertCircle, Loader2, FileJson, FileText } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { exportService } from '@/lib/services/export.service'
import { cn } from '@/lib/utils'

interface ExportDialogProps {
  userId: string
  organizationId?: string
  projectId?: string
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

interface ExportItem {
  id: string
  name: string
  description: string
  format: 'csv' | 'json'
  exportFn: () => Promise<void>
  enabled: boolean
}

export function ExportDialog({
  userId,
  organizationId,
  projectId,
  trigger,
  open,
  onOpenChange,
}: ExportDialogProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [exportStatus, setExportStatus] = useState<Record<string, 'pending' | 'success' | 'error'>>({})
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())

  const exportItems: ExportItem[] = [
    {
      id: 'gantt',
      name: 'Gantt Chart Data',
      description: 'Timeline data for all projects',
      format: 'json',
      exportFn: async () => {
        if (projectId) {
          await exportService.exportGanttData(projectId, { format: 'json' })
        }
      },
      enabled: !!projectId,
    },
    {
      id: 'custom_fields',
      name: 'Custom Fields',
      description: 'Custom field definitions and values',
      format: 'json',
      exportFn: async () => {
        if (organizationId) {
          await exportService.exportCustomFields(organizationId, { format: 'json' })
        }
      },
      enabled: !!organizationId,
    },
    {
      id: 'time_tracking',
      name: 'Time Tracking',
      description: 'All time entries and logs',
      format: 'csv',
      exportFn: async () => {
        await exportService.exportTimeTracking(userId, { format: 'csv' })
      },
      enabled: true,
    },
    {
      id: 'goals',
      name: 'Goals',
      description: 'Goals data (will be migrated to Milestones)',
      format: 'json',
      exportFn: async () => {
        if (organizationId) {
          await exportService.exportGoals(organizationId, { format: 'json' })
        }
      },
      enabled: !!organizationId,
    },
  ]

  const availableItems = exportItems.filter(item => item.enabled)

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(new Set(availableItems.map(item => item.id)))
    } else {
      setSelectedItems(new Set())
    }
  }

  const handleSelectItem = (itemId: string, checked: boolean) => {
    const newSelected = new Set(selectedItems)
    if (checked) {
      newSelected.add(itemId)
    } else {
      newSelected.delete(itemId)
    }
    setSelectedItems(newSelected)
  }

  const handleExport = async () => {
    setIsExporting(true)
    const status: Record<string, 'pending' | 'success' | 'error'> = {}

    for (const item of availableItems) {
      if (selectedItems.has(item.id)) {
        status[item.id] = 'pending'
        setExportStatus({ ...status })

        try {
          await item.exportFn()
          status[item.id] = 'success'
        } catch (error) {
          console.error(`Failed to export ${item.name}:`, error)
          status[item.id] = 'error'
        }

        setExportStatus({ ...status })
        // Small delay between exports to avoid overwhelming the browser
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    setIsExporting(false)
  }

  const handleExportAll = async () => {
    // Select all items
    setSelectedItems(new Set(availableItems.map(item => item.id)))
    // Wait for state update
    setTimeout(() => handleExport(), 100)
  }

  const allSelected = selectedItems.size === availableItems.length && availableItems.length > 0
  const someSelected = selectedItems.size > 0 && selectedItems.size < availableItems.length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Export Your Data</DialogTitle>
          <DialogDescription>
            Download your data before deprecated features are removed. All exports are saved to your Downloads folder.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Select All */}
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
            <div className="flex items-center gap-3">
              <Checkbox
                id="select-all"
                checked={allSelected}
                onCheckedChange={handleSelectAll}
                className={cn(someSelected && 'data-[state=checked]:bg-slate-500')}
              />
              <Label htmlFor="select-all" className="font-medium cursor-pointer">
                Select All ({availableItems.length} items)
              </Label>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportAll}
              disabled={isExporting || availableItems.length === 0}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Export All
            </Button>
          </div>

          {/* Export Items */}
          <div className="space-y-3">
            {availableItems.length === 0 ? (
              <Card className="p-6 text-center">
                <p className="text-slate-600 dark:text-slate-400">
                  No data available to export for your current context.
                </p>
              </Card>
            ) : (
              availableItems.map((item) => (
                <Card key={item.id} className="p-4">
                  <div className="flex items-start gap-4">
                    <Checkbox
                      id={item.id}
                      checked={selectedItems.has(item.id)}
                      onCheckedChange={(checked) => handleSelectItem(item.id, checked as boolean)}
                      disabled={isExporting}
                      className="mt-1"
                    />

                    <div className="flex-1 min-w-0">
                      <Label
                        htmlFor={item.id}
                        className="font-medium text-slate-900 dark:text-white cursor-pointer"
                      >
                        {item.name}
                      </Label>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        {item.description}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        {item.format === 'csv' ? (
                          <FileText className="h-3 w-3 text-slate-500" />
                        ) : (
                          <FileJson className="h-3 w-3 text-slate-500" />
                        )}
                        <span className="text-xs text-slate-500 uppercase">{item.format}</span>
                      </div>
                    </div>

                    {/* Status Indicator */}
                    <div className="flex-shrink-0">
                      {exportStatus[item.id] === 'pending' && (
                        <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                      )}
                      {exportStatus[item.id] === 'success' && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 200 }}
                        >
                          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        </motion.div>
                      )}
                      {exportStatus[item.id] === 'error' && (
                        <AlertCircle className="h-5 w-5 text-rose-600" />
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>

          {/* Export Summary */}
          {Object.keys(exportStatus).length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800"
            >
              <div className="flex items-center gap-2 mb-2">
                <Download className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Export Status
                </span>
              </div>
              <div className="text-sm text-blue-800 dark:text-blue-200">
                {Object.values(exportStatus).filter(s => s === 'success').length} of {Object.keys(exportStatus).length} exports completed
              </div>
            </motion.div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange?.(false)}
              disabled={isExporting}
            >
              Close
            </Button>
            <Button
              onClick={handleExport}
              disabled={isExporting || selectedItems.size === 0}
              className="gap-2"
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Export Selected ({selectedItems.size})
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
