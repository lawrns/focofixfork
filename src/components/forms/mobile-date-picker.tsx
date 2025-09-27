'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

interface MobileDatePickerProps {
  value?: Date
  onChange?: (date: Date | undefined) => void
  placeholder?: string
  disabled?: boolean
  error?: string
  required?: boolean
  className?: string
  minDate?: Date
  maxDate?: Date
  label?: string
}

export function MobileDatePicker({
  value,
  onChange,
  placeholder = 'Select date',
  disabled,
  error,
  required,
  className,
  minDate,
  maxDate,
  label
}: MobileDatePickerProps) {
  const [isMobile, setIsMobile] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Update input value when value changes
  useEffect(() => {
    if (value) {
      setInputValue(format(value, 'yyyy-MM-dd'))
    } else {
      setInputValue('')
    }
  }, [value])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)

    if (newValue) {
      const date = new Date(newValue)
      if (!isNaN(date.getTime())) {
        onChange?.(date)
      }
    } else {
      onChange?.(undefined)
    }
  }

  const handleClear = () => {
    setInputValue('')
    onChange?.(undefined)
    setShowPicker(false)
  }

  const openPicker = () => {
    if (!disabled) {
      setShowPicker(true)
    }
  }

  const closePicker = () => {
    setShowPicker(false)
  }

  if (isMobile) {
    // Mobile: Use native date picker
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
          <input
            ref={inputRef}
            type="date"
            value={inputValue}
            onChange={handleInputChange}
            disabled={disabled}
            required={required}
            min={minDate ? format(minDate, 'yyyy-MM-dd') : undefined}
            max={maxDate ? format(maxDate, 'yyyy-MM-dd') : undefined}
            className={cn(
              // Mobile-optimized styles
              'w-full min-h-[48px] px-4 py-3 text-base rounded-lg border bg-background',
              'transition-colors duration-200',
              'focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none',
              error ? 'border-destructive focus:border-destructive focus:ring-destructive/20' : 'border-input',
              disabled && 'opacity-50 cursor-not-allowed',
              'appearance-none', // Remove default date picker styling
              '[&::-webkit-calendar-picker-indicator]:hidden', // Hide default calendar icon
              'cursor-pointer' // Make it clear it's interactive
            )}
            placeholder={placeholder}
            aria-invalid={!!error}
          />

          {/* Custom Calendar Icon */}
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
            <Calendar className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>

        {error && (
          <p className="text-xs text-destructive font-medium">
            {error}
          </p>
        )}
      </div>
    )
  }

  // Desktop: Custom date picker with overlay
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
        <input
          type="text"
          value={value ? format(value, 'PPP') : ''}
          onClick={openPicker}
          readOnly
          disabled={disabled}
          required={required}
          className={cn(
            'w-full h-10 px-3 py-2 text-sm rounded-md border bg-background cursor-pointer',
            'transition-colors duration-200',
            'focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none',
            error ? 'border-destructive focus:border-destructive focus:ring-destructive/20' : 'border-input',
            disabled && 'opacity-50 cursor-not-allowed',
            'flex items-center justify-between'
          )}
          placeholder={placeholder}
          aria-invalid={!!error}
        />

        {/* Icons */}
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="p-1 h-6 w-6 text-muted-foreground hover:text-foreground"
              aria-label="Clear date"
            >
              <X className="w-3 h-3" />
            </Button>
          )}
          <Calendar className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>

      {/* Desktop Date Picker Overlay */}
      <AnimatePresence>
        {showPicker && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 bg-black/50 z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closePicker}
            />

            {/* Date Picker */}
            <motion.div
              className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-card border border-border rounded-lg shadow-lg p-4 z-50 min-w-[300px]"
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">
                  Select Date
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={closePicker}
                  className="p-1"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Simple month/year navigation would go here */}
              {/* For now, using a native date input in the overlay */}
              <input
                type="date"
                value={inputValue}
                onChange={handleInputChange}
                min={minDate ? format(minDate, 'yyyy-MM-dd') : undefined}
                max={maxDate ? format(maxDate, 'yyyy-MM-dd') : undefined}
                className="w-full h-10 px-3 py-2 text-sm rounded-md border border-input bg-background"
              />

              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={closePicker}>
                  Cancel
                </Button>
                <Button onClick={closePicker}>
                  Done
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {error && (
        <p className="text-xs text-destructive font-medium">
          {error}
        </p>
      )}
    </div>
  )
}

export default MobileDatePicker
