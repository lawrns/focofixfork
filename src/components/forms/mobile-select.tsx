'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, Search, X, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface SelectOption {
  value: string
  label: string
  disabled?: boolean
  icon?: React.ReactNode
}

interface MobileSelectProps {
  value?: string
  onChange?: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  disabled?: boolean
  error?: string
  required?: boolean
  className?: string
  searchable?: boolean
  searchPlaceholder?: string
  label?: string
  helperText?: string
  multiple?: boolean
}

export function MobileSelect({
  value,
  onChange,
  options,
  placeholder = 'Select option',
  disabled,
  error,
  required,
  className,
  searchable = false,
  searchPlaceholder = 'Search...',
  label,
  helperText,
  multiple = false
}: MobileSelectProps) {
  const [isMobile, setIsMobile] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedValues, setSelectedValues] = useState<Set<string>>(new Set())
  const selectRef = useRef<HTMLDivElement>(null)

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Initialize selected values for multiple select
  useEffect(() => {
    if (multiple && value) {
      const values = value.split(',').map(v => v.trim())
      setSelectedValues(new Set(values))
    }
  }, [multiple, value])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Filter options based on search term
  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const selectedOption = options.find(option => option.value === value)
  const selectedOptions = options.filter(option => selectedValues.has(option.value))

  const handleSelect = (optionValue: string) => {
    if (multiple) {
      const newSelected = new Set(selectedValues)
      if (newSelected.has(optionValue)) {
        newSelected.delete(optionValue)
      } else {
        newSelected.add(optionValue)
      }
      setSelectedValues(newSelected)
      const valuesArray = Array.from(newSelected)
      onChange?.(valuesArray.join(', '))
    } else {
      onChange?.(optionValue)
      setIsOpen(false)
    }
    setSearchTerm('')
  }

  const handleRemove = (optionValue: string) => {
    if (multiple) {
      const newSelected = new Set(selectedValues)
      newSelected.delete(optionValue)
      setSelectedValues(newSelected)
      const valuesArray = Array.from(newSelected)
      onChange?.(valuesArray.join(', '))
    }
  }

  const getDisplayText = () => {
    if (multiple) {
      if (selectedOptions.length === 0) return placeholder
      if (selectedOptions.length === 1) return selectedOptions[0].label
      return `${selectedOptions.length} selected`
    }
    return selectedOption?.label || placeholder
  }

  if (isMobile) {
    // Mobile: Use native select
    return (
      <div className={cn('space-y-2', className)}>
        {label && (
          <label className={cn(
            'text-sm font-medium text-foreground',
            required && "after:content-['*'] after:text-destructive after:ml-1"
          )}>
            {label}
          </label>
        )}

        <div className="relative">
          <select
            value={multiple ? '' : value || ''}
            onChange={(e) => handleSelect(e.target.value)}
            disabled={disabled}
            required={required}
            multiple={multiple}
            className={cn(
              'w-full min-h-[48px] px-4 py-3 text-base rounded-lg border bg-background cursor-pointer',
              'transition-colors duration-200',
              'focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none',
              error ? 'border-destructive focus:border-destructive focus:ring-destructive/20' : 'border-input',
              disabled && 'opacity-50 cursor-not-allowed',
              'appearance-none' // Remove default select styling
            )}
            aria-invalid={!!error}
          >
            <option value="" disabled={!multiple}>
              {placeholder}
            </option>
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>

          {/* Custom dropdown arrow */}
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>

        {/* Selected options display for multiple select */}
        {multiple && selectedOptions.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {selectedOptions.map((option) => (
              <div
                key={option.value}
                className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
              >
                {option.icon && <span className="flex-shrink-0">{option.icon}</span>}
                <span>{option.label}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemove(option.value)}
                  className="p-0 h-4 w-4 text-primary hover:text-primary/80"
                  aria-label={`Remove ${option.label}`}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {helperText && !error && (
          <p className="text-xs text-muted-foreground">
            {helperText}
          </p>
        )}

        {error && (
          <p className="text-xs text-destructive font-medium">
            {error}
          </p>
        )}
      </div>
    )
  }

  // Desktop: Custom dropdown with search
  return (
    <div className={cn('space-y-2', className)} ref={selectRef}>
      {label && (
        <label className={cn(
          'text-sm font-medium text-foreground',
          required && "after:content-['*'] after:text-destructive after:ml-1"
        )}>
          {label}
        </label>
      )}

      {/* Select Button */}
      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={cn(
            'w-full h-10 px-3 py-2 text-sm rounded-md border bg-background flex items-center justify-between cursor-pointer',
            'transition-colors duration-200',
            'focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none',
            error ? 'border-destructive focus:border-destructive focus:ring-destructive/20' : 'border-input',
            disabled && 'opacity-50 cursor-not-allowed',
            isOpen && 'ring-2 ring-primary/20 border-primary'
          )}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-invalid={!!error}
        >
          <span className={cn(
            'truncate',
            !selectedOption && !selectedOptions.length && 'text-muted-foreground'
          )}>
            {getDisplayText()}
          </span>
          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          )}
        </button>
      </div>

      {/* Selected options display for multiple select */}
      {multiple && selectedOptions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedOptions.map((option) => (
            <div
              key={option.value}
              className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
            >
              {option.icon && <span className="flex-shrink-0">{option.icon}</span>}
              <span>{option.label}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleRemove(option.value)}
                className="p-0 h-4 w-4 text-primary hover:text-primary/80"
                aria-label={`Remove ${option.label}`}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="absolute top-full left-0 right-0 z-50 mt-1 bg-card border border-border rounded-md shadow-lg max-h-60 overflow-hidden"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {/* Search */}
            {searchable && (
              <div className="p-2 border-b border-border">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder={searchPlaceholder}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-8"
                  />
                </div>
              </div>
            )}

            {/* Options */}
            <div className="max-h-48 overflow-y-auto">
              {filteredOptions.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  No options found
                </div>
              ) : (
                filteredOptions.map((option) => {
                  const isSelected = multiple
                    ? selectedValues.has(option.value)
                    : value === option.value

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => !option.disabled && handleSelect(option.value)}
                      disabled={option.disabled}
                      className={cn(
                        'w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center justify-between',
                        isSelected && 'bg-primary/10 text-primary',
                        option.disabled && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {option.icon && <span className="flex-shrink-0">{option.icon}</span>}
                        <span className="truncate">{option.label}</span>
                      </div>
                      {isSelected && (
                        <Check className="w-4 h-4 text-primary flex-shrink-0" />
                      )}
                    </button>
                  )
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {helperText && !error && (
        <p className="text-xs text-muted-foreground">
          {helperText}
        </p>
      )}

      {error && (
        <p className="text-xs text-destructive font-medium">
          {error}
        </p>
      )}
    </div>
  )
}

export default MobileSelect
