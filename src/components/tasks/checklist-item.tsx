'use client'

import { useState, useRef } from 'react'
import { Check, GripVertical, Trash2, Edit2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ChecklistItemData } from './checklist'
import { cn } from '@/lib/utils'

interface ChecklistItemProps {
  item: ChecklistItemData
  index: number
  onUpdate: (text: string) => void
  onToggle: (completed: boolean) => void
  onDelete: () => void
  onReorder: (dragIndex: number, hoverIndex: number) => void
  disabled?: boolean
}

export function ChecklistItem({
  item,
  index,
  onUpdate,
  onToggle,
  onDelete,
  onReorder,
  disabled = false
}: ChecklistItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(item.text)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleStartEdit = () => {
    setIsEditing(true)
    setEditText(item.text)
    setTimeout(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    }, 0)
  }

  const handleSaveEdit = () => {
    if (editText.trim() && editText !== item.text) {
      onUpdate(editText.trim())
    }
    setIsEditing(false)
  }

  const handleCancelEdit = () => {
    setEditText(item.text)
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSaveEdit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleCancelEdit()
    }
  }

  const handleToggle = () => {
    onToggle(!item.completed)
  }

  return (
    <div className="group flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors">
      {/* Drag handle */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
        <GripVertical className="w-4 h-4 text-gray-400" />
      </div>

      {/* Checkbox */}
      <button
        onClick={handleToggle}
        disabled={disabled}
        className={cn(
          'flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
          item.completed
            ? 'bg-blue-500 border-blue-500 text-white'
            : 'border-gray-300 dark:border-gray-600 hover:border-blue-400',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        {item.completed && <Check className="w-3 h-3" />}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <Input
            ref={inputRef}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSaveEdit}
            className="h-6 text-sm border-0 shadow-none focus-visible:ring-0 p-0"
            disabled={disabled}
          />
        ) : (
          <span
            className={cn(
              'text-sm cursor-pointer',
              item.completed
                ? 'line-through text-gray-500 dark:text-gray-400'
                : 'text-gray-900 dark:text-gray-100'
            )}
            onClick={handleStartEdit}
          >
            {item.text}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
        {!isEditing && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleStartEdit}
            disabled={disabled}
            className="h-6 w-6 p-0"
          >
            <Edit2 className="w-3 h-3" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          disabled={disabled}
          className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
    </div>
  )
}
