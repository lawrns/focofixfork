'use client'

import { ReactNode } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AlertCircle, Check, X } from 'lucide-react'

interface InlineEditFieldProps {
  fieldName: string
  fieldType: 'text' | 'date' | 'select' | 'number'
  value: any
  editValue: any
  isEditing: boolean
  isLoading: boolean
  error: string | null
  selectOptions?: { value: string; label: string }[]
  placeholder?: string
  onStartEdit: () => void
  onSave: (value: any) => Promise<boolean>
  onCancel: () => void
  onKeyDown: (e: React.KeyboardEvent) => void
  onBlur: () => void
  onChange: (value: any) => void
  inputRef: React.RefObject<HTMLInputElement | HTMLSelectElement | null>
  displayValue?: (value: any) => string
  children?: ReactNode
}

export function InlineEditField({
  fieldName,
  fieldType,
  value,
  editValue,
  isEditing,
  isLoading,
  error,
  selectOptions = [],
  placeholder = '',
  onStartEdit,
  onSave,
  onCancel,
  onKeyDown,
  onBlur,
  onChange,
  inputRef,
  displayValue,
  children,
}: InlineEditFieldProps) {
  if (isEditing) {
    return (
      <div
        className="inline-block relative"
        data-testid="inline-edit-container"
      >
        {/* Edit Input Container with Border */}
        <div className="border border-primary rounded-md bg-white dark:bg-zinc-900 p-1 inline-flex items-center gap-1">
          {fieldType === 'text' && (
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              data-testid={`inline-${fieldName}-edit`}
              type="text"
              value={editValue}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={onKeyDown}
              onBlur={onBlur}
              placeholder={placeholder}
              disabled={isLoading}
              className="bg-transparent outline-none flex-1 px-2 py-1 text-sm min-w-[200px] disabled:opacity-50"
              aria-label={`Edit ${fieldName}`}
            />
          )}

          {fieldType === 'date' && (
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              data-testid={`inline-${fieldName}-edit`}
              type="date"
              value={editValue || ''}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={onKeyDown}
              onBlur={onBlur}
              disabled={isLoading}
              className="bg-transparent outline-none flex-1 px-2 py-1 text-sm disabled:opacity-50"
              aria-label={`Edit ${fieldName}`}
            />
          )}

          {fieldType === 'number' && (
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              data-testid={`inline-${fieldName}-edit`}
              type="number"
              value={editValue}
              onChange={(e) => onChange(parseFloat(e.target.value) || '')}
              onKeyDown={onKeyDown}
              onBlur={onBlur}
              disabled={isLoading}
              className="bg-transparent outline-none flex-1 px-2 py-1 text-sm disabled:opacity-50"
              aria-label={`Edit ${fieldName}`}
            />
          )}

          {fieldType === 'select' && (
            <Select value={editValue} onValueChange={onChange} disabled={isLoading}>
              <SelectTrigger
                ref={inputRef as React.RefObject<HTMLSelectElement>}
                data-testid={`inline-${fieldName}-edit`}
                className="w-auto border-0 outline-none"
                aria-label={`Edit ${fieldName}`}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {selectOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-1 ml-1">
            <button
              onClick={() => onSave(editValue)}
              disabled={isLoading}
              className="p-1 rounded hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 disabled:opacity-50"
              aria-label="Save changes"
              title="Save"
            >
              <Check className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 disabled:opacity-50"
              aria-label="Cancel editing"
              title="Cancel"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div
            className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center gap-1"
            role="alert"
          >
            <AlertCircle className="h-3 w-3" aria-hidden="true" />
            {error}
          </div>
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div
            className="absolute inset-0 bg-white/50 dark:bg-zinc-900/50 rounded-md flex items-center justify-center"
            data-testid="inline-saving-indicator"
          >
            <div className="animate-spin h-3 w-3 border border-primary border-t-transparent rounded-full" />
          </div>
        )}
      </div>
    )
  }

  // Display Mode
  return (
    <div
      role="button"
      tabIndex={0}
      onDoubleClick={onStartEdit}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onStartEdit()
        }
      }}
      className="cursor-pointer rounded px-1 py-0.5 hover:bg-muted transition-colors"
      aria-label={`Double-click to edit ${fieldName}`}
    >
      {children || (displayValue ? displayValue(value) : value)}
    </div>
  )
}
