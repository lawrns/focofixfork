'use client'

import React, { useState, useEffect } from 'react'
import { smartDateParser } from '@/lib/smart-date-parser'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Calendar, X, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

interface SmartDateInputProps {
  value?: Date | string | null
  onChange?: (date: Date | undefined) => void
  onDateStringChange?: (dateString: string | undefined) => void
  placeholder?: string
  disabled?: boolean
  error?: string
  required?: boolean
  className?: string
  minDate?: Date
  maxDate?: Date
  label?: string
  showSuggestions?: boolean
}

const COMMON_SUGGESTIONS = [
  { label: 'Today', value: 'today' },
  { label: 'Tomorrow', value: 'tomorrow' },
  { label: 'Next week', value: 'in 1 week' },
  { label: 'Next month', value: 'in 1 month' },
]

export function SmartDateInput({
  value,
  onChange,
  onDateStringChange,
  placeholder = 'Enter date or natural language',
  disabled,
  error,
  required,
  className,
  minDate,
  maxDate,
  label,
  showSuggestions = true,
}: SmartDateInputProps) {
  const [inputValue, setInputValue] = useState('')
  const [parsedDate, setParsedDate] = useState<Date | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [showPickerFallback, setShowPickerFallback] = useState(false)
  const [displayText, setDisplayText] = useState<string | null>(null)

  // Initialize input value from prop
  useEffect(() => {
    if (value) {
      const date = typeof value === 'string' ? new Date(value) : value
      if (!isNaN(date.getTime())) {
        setInputValue(format(date, 'yyyy-MM-dd'))
        setParsedDate(date)
        setDisplayText(date.toLocaleDateString('en-US', {
          weekday: 'short',
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }))
        setParseError(null)
      }
    } else {
      setInputValue('')
      setParsedDate(null)
      setDisplayText(null)
      setParseError(null)
    }
  }, [value])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)

    if (!newValue.trim()) {
      setParsedDate(null)
      setDisplayText(null)
      setParseError(null)
      onChange?.(undefined)
      onDateStringChange?.(undefined)
      return
    }

    // Try to parse the input
    const result = smartDateParser(newValue)

    if (result.isValid && result.date) {
      // Validate against min/max dates
      if (minDate && result.date < minDate) {
        setParseError(`Date must be on or after ${format(minDate, 'MMM d, yyyy')}`)
        setParsedDate(null)
        setDisplayText(null)
        return
      }

      if (maxDate && result.date > maxDate) {
        setParseError(`Date must be on or before ${format(maxDate, 'MMM d, yyyy')}`)
        setParsedDate(null)
        setDisplayText(null)
        return
      }

      setParsedDate(result.date)
      setDisplayText(result.displayText || null)
      setParseError(null)
      onChange?.(result.date)
      onDateStringChange?.(result.isoString)
    } else {
      // Try parsing as ISO date format
      const dateObj = new Date(newValue)
      if (!isNaN(dateObj.getTime())) {
        setParsedDate(dateObj)
        setDisplayText(dateObj.toLocaleDateString('en-US', {
          weekday: 'short',
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }))
        setParseError(null)
        onChange?.(dateObj)
        onDateStringChange?.(format(dateObj, 'yyyy-MM-dd'))
      } else {
        setParseError(result.error || 'Invalid date format')
        setParsedDate(null)
        setDisplayText(null)
      }
    }
  }

  const handleClear = () => {
    setInputValue('')
    setParsedDate(null)
    setDisplayText(null)
    setParseError(null)
    setShowPickerFallback(false)
    onChange?.(undefined)
    onDateStringChange?.(undefined)
  }

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion)
    const result = smartDateParser(suggestion)
    if (result.isValid && result.date) {
      setParsedDate(result.date)
      setDisplayText(result.displayText || null)
      setParseError(null)
      onChange?.(result.date)
      onDateStringChange?.(result.isoString)
    }
  }

  const handlePickerDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    if (newValue) {
      const date = new Date(newValue)
      if (!isNaN(date.getTime())) {
        setInputValue(newValue)
        setParsedDate(date)
        setDisplayText(date.toLocaleDateString('en-US', {
          weekday: 'short',
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }))
        setParseError(null)
        onChange?.(date)
        onDateStringChange?.(newValue)
        setShowPickerFallback(false)
      }
    }
  }

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <Label className={cn(
          'text-sm font-medium text-foreground',
          required && "after:content-['*'] after:text-destructive after:ml-1"
        )}>
          {label}
        </Label>
      )}

      {/* Text Input */}
      <div className="space-y-2">
        <div className="relative">
          <Input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              'pr-20',
              (error || parseError) && 'border-destructive focus:border-destructive focus:ring-destructive/20'
            )}
            aria-invalid={!!(error || parseError)}
            aria-describedby={(error || parseError) ? 'date-error' : undefined}
          />

          {/* Icons */}
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
            {parsedDate && (
              <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
            )}
            {parsedDate && (
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
            {!parsedDate && (
              <Calendar className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </div>

        {/* Parsed Date Preview */}
        {parsedDate && displayText && (
          <div className="text-xs text-muted-foreground px-3 py-2 rounded bg-muted/50">
            Parsed as: <span className="font-medium text-foreground">{displayText}</span>
          </div>
        )}

        {/* Error Message */}
        {(error || parseError) && (
          <p id="date-error" className="text-xs text-destructive font-medium">
            {error || parseError}
          </p>
        )}

        {/* Common Suggestions */}
        {showSuggestions && !parsedDate && !showPickerFallback && (
          <div className="flex flex-wrap gap-2 pt-2">
            {COMMON_SUGGESTIONS.map((suggestion) => (
              <Button
                key={suggestion.value}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleSuggestionClick(suggestion.value)}
                disabled={disabled}
                className="text-xs"
              >
                {suggestion.label}
              </Button>
            ))}
          </div>
        )}

        {/* Date Picker Fallback */}
        {!showPickerFallback && !parsedDate && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowPickerFallback(true)}
            disabled={disabled}
            className="w-full mt-2"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Use Date Picker
          </Button>
        )}

        {/* Date Picker */}
        {showPickerFallback && (
          <div className="border rounded-md p-3 bg-muted/30 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Select Date</label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowPickerFallback(false)}
                className="h-6 w-6 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <input
              type="date"
              value={inputValue}
              onChange={handlePickerDateChange}
              min={minDate ? format(minDate, 'yyyy-MM-dd') : undefined}
              max={maxDate ? format(maxDate, 'yyyy-MM-dd') : undefined}
              className="w-full h-10 px-3 py-2 text-sm rounded-md border border-input bg-background"
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default SmartDateInput
