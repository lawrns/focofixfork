'use client'

import { useState, useRef } from 'react'
import { Plus, GripVertical, Trash2, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { ChecklistItem } from './checklist-item'
import { cn } from '@/lib/utils'

export interface ChecklistItemData {
  id: string
  text: string
  completed: boolean
  position: number
}

interface ChecklistProps {
  items: ChecklistItemData[]
  onItemsChange: (items: ChecklistItemData[]) => void
  onItemAdd?: (text: string) => void
  onItemUpdate?: (id: string, text: string) => void
  onItemToggle?: (id: string, completed: boolean) => void
  onItemDelete?: (id: string) => void
  onItemReorder?: (items: ChecklistItemData[]) => void
  className?: string
  disabled?: boolean
}

export function Checklist({
  items,
  onItemsChange,
  onItemAdd,
  onItemUpdate,
  onItemToggle,
  onItemDelete,
  onItemReorder,
  className,
  disabled = false
}: ChecklistProps) {
  const [newItemText, setNewItemText] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const completedCount = items.filter(item => item.completed).length
  const totalCount = items.length
  const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

  const handleAddItem = () => {
    if (!newItemText.trim()) return

    const newItem: ChecklistItemData = {
      id: `item-${Date.now()}`,
      text: newItemText.trim(),
      completed: false,
      position: items.length
    }

    const updatedItems = [...items, newItem]
    onItemsChange(updatedItems)
    onItemAdd?.(newItemText.trim())
    
    setNewItemText('')
    setIsAdding(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddItem()
    } else if (e.key === 'Escape') {
      setNewItemText('')
      setIsAdding(false)
    }
  }

  const handleItemUpdate = (id: string, text: string) => {
    const updatedItems = items.map(item =>
      item.id === id ? { ...item, text } : item
    )
    onItemsChange(updatedItems)
    onItemUpdate?.(id, text)
  }

  const handleItemToggle = (id: string, completed: boolean) => {
    const updatedItems = items.map(item =>
      item.id === id ? { ...item, completed } : item
    )
    onItemsChange(updatedItems)
    onItemToggle?.(id, completed)
  }

  const handleItemDelete = (id: string) => {
    const updatedItems = items.filter(item => item.id !== id)
    // Reorder positions
    const reorderedItems = updatedItems.map((item, index) => ({
      ...item,
      position: index
    }))
    onItemsChange(reorderedItems)
    onItemDelete?.(id)
    onItemReorder?.(reorderedItems)
  }

  const handleItemReorder = (dragIndex: number, hoverIndex: number) => {
    const draggedItem = items[dragIndex]
    const newItems = [...items]
    newItems.splice(dragIndex, 1)
    newItems.splice(hoverIndex, 0, draggedItem)
    
    // Update positions
    const reorderedItems = newItems.map((item, index) => ({
      ...item,
      position: index
    }))
    
    onItemsChange(reorderedItems)
    onItemReorder?.(reorderedItems)
  }

  const startAdding = () => {
    setIsAdding(true)
    setTimeout(() => {
      inputRef.current?.focus()
    }, 0)
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Header with progress */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Checklist
          </span>
          {totalCount > 0 && (
            <span className="text-xs text-gray-500">
              {completedCount}/{totalCount}
            </span>
          )}
        </div>
        {totalCount > 0 && (
          <div className="w-20">
            <Progress value={progressPercentage} className="h-2" />
          </div>
        )}
      </div>

      {/* Items */}
      <div className="space-y-1">
        {items.map((item, index) => (
          <ChecklistItem
            key={item.id}
            item={item}
            index={index}
            onUpdate={(text) => handleItemUpdate(item.id, text)}
            onToggle={(completed) => handleItemToggle(item.id, completed)}
            onDelete={() => handleItemDelete(item.id)}
            onReorder={handleItemReorder}
            disabled={disabled}
          />
        ))}
      </div>

      {/* Add new item */}
      {isAdding ? (
        <div className="flex items-center gap-2 p-2 border border-gray-200 dark:border-gray-700 rounded-lg">
          <GripVertical className="w-4 h-4 text-gray-400" />
          <Input
            ref={inputRef}
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              if (!newItemText.trim()) {
                setIsAdding(false)
              }
            }}
            placeholder="Add checklist item..."
            className="flex-1 border-0 shadow-none focus-visible:ring-0"
            disabled={disabled}
          />
          <Button
            size="sm"
            onClick={handleAddItem}
            disabled={!newItemText.trim() || disabled}
            className="h-8 px-3"
          >
            Add
          </Button>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={startAdding}
          disabled={disabled}
          className="w-full justify-start text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add an item
        </Button>
      )}
    </div>
  )
}
