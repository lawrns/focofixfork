'use client'

import { useState } from 'react'
import { Plus, Edit2, Trash2, Palette } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label as LabelModel, LABEL_COLORS, validateLabelName, validateLabelColor } from '@/lib/models/labels'
import { cn } from '@/lib/utils'

interface LabelManagerProps {
  labels: LabelModel[]
  onLabelCreate: (name: string, color: string) => Promise<void>
  onLabelUpdate: (id: string, name: string, color: string) => Promise<void>
  onLabelDelete: (id: string) => Promise<void>
  projectId: string
  className?: string
}

export function LabelManager({
  labels,
  onLabelCreate,
  onLabelUpdate,
  onLabelDelete,
  projectId,
  className
}: LabelManagerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [editingLabel, setEditingLabel] = useState<LabelModel | null>(null)
  const [newLabelName, setNewLabelName] = useState('')
  const [newLabelColor, setNewLabelColor] = useState('blue')
  const [isLoading, setIsLoading] = useState(false)

  const handleCreateLabel = async () => {
    const validationError = validateLabelName(newLabelName)
    if (validationError) {
      alert(validationError)
      return
    }

    setIsLoading(true)
    try {
      await onLabelCreate(newLabelName.trim(), newLabelColor)
      setNewLabelName('')
      setNewLabelColor('blue')
    } catch (error) {
      console.error('Error creating label:', error)
      alert('Failed to create label')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateLabel = async () => {
    if (!editingLabel) return

    const validationError = validateLabelName(newLabelName)
    if (validationError) {
      alert(validationError)
      return
    }

    setIsLoading(true)
    try {
      await onLabelUpdate(editingLabel.id, newLabelName.trim(), newLabelColor)
      setEditingLabel(null)
      setNewLabelName('')
      setNewLabelColor('blue')
    } catch (error) {
      console.error('Error updating label:', error)
      alert('Failed to update label')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteLabel = async (labelId: string) => {
    if (!confirm('Are you sure you want to delete this label?')) return

    setIsLoading(true)
    try {
      await onLabelDelete(labelId)
    } catch (error) {
      console.error('Error deleting label:', error)
      alert('Failed to delete label')
    } finally {
      setIsLoading(false)
    }
  }

  const startEdit = (label: LabelModel) => {
    setEditingLabel(label)
    setNewLabelName(label.name)
    setNewLabelColor(label.color)
  }

  const cancelEdit = () => {
    setEditingLabel(null)
    setNewLabelName('')
    setNewLabelColor('blue')
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Labels</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(true)}
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          Manage Labels
        </Button>
      </div>

      {/* Existing Labels */}
      <div className="space-y-2">
        {labels.length === 0 ? (
          <p className="text-sm text-gray-500">No labels yet. Create your first label!</p>
        ) : (
          labels.map((label) => (
            <div
              key={label.id}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: label.color }}
                />
                <span className="font-medium">{label.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => startEdit(label)}
                  className="h-8 w-8 p-0"
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteLabel(label.id)}
                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Label Dialog */}
      <Dialog open={isOpen || editingLabel !== null} onOpenChange={(open) => {
        if (!open) {
          setIsOpen(false)
          cancelEdit()
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5" />
              {editingLabel ? 'Edit Label' : 'Create New Label'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="label-name">Label Name</Label>
              <Input
                id="label-name"
                value={newLabelName}
                onChange={(e) => setNewLabelName(e.target.value)}
                placeholder="Enter label name..."
                maxLength={50}
              />
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <div className="grid grid-cols-5 gap-2">
                {LABEL_COLORS.map((color) => (
                  <button
                    key={color.id}
                    onClick={() => setNewLabelColor(color.id)}
                    className={cn(
                      'w-8 h-8 rounded-full border-2 transition-all',
                      newLabelColor === color.id
                        ? 'border-gray-800 scale-110'
                        : 'border-gray-300 hover:border-gray-500'
                    )}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={editingLabel ? cancelEdit : () => setIsOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={editingLabel ? handleUpdateLabel : handleCreateLabel}
                disabled={isLoading || !newLabelName.trim()}
              >
                {isLoading ? 'Saving...' : editingLabel ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
