'use client'

import { useState, useRef, useEffect } from 'react'
import { Calendar, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { parseDate, looksLikeDate, type ParsedDate } from '@/lib/utils/date-parser'
import { cn } from '@/lib/utils'

export interface DateInputProps {
  value?: Date | null
  onChange: (date: Date | null) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  allowPast?: boolean
  minDate?: Date
  maxDate?: Date
}

export function DateInput({
  value,
  onChange,
  placeholder = 'Enter date...',
  className,
  disabled = false,
  allowPast = true,
  minDate,
  maxDate
}: DateInputProps) {
  const [inputValue, setInputValue] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [parseResult, setParseResult] = useState<ParsedDate | null>(null)
  const [showError, setShowError] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Initialize input value from prop
  useEffect(() => {
    if (value) {
      setInputValue(formatDateForInput(value))
    } else {
      setInputValue('')
    }
  }, [value])

  const formatDateForInput = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    setShowError(false)

    if (newValue.trim() === '') {
      setParseResult(null)
      onChange(null)
      return
    }

    // Parse the input
    const result = parseDate(newValue, {
      strictMode: !allowPast,
      referenceDate: new Date()
    })

    setParseResult(result)

    if (result.isValid && result.date) {
      // Validate against min/max dates
      if (minDate && result.date < minDate) {
        setShowError(true)
        return
      }
      if (maxDate && result.date > maxDate) {
        setShowError(true)
        return
      }

      onChange(result.date)
    } else if (looksLikeDate(newValue)) {
      setShowError(true)
    }
  }

  const handleCalendarSelect = (date: Date | undefined) => {
    if (date) {
      onChange(date)
      setIsOpen(false)
    }
  }

  const handleClear = () => {
    setInputValue('')
    setParseResult(null)
    setShowError(false)
    onChange(null)
    inputRef.current?.focus()
  }

  const handleBlur = () => {
    // On blur, if we have a valid parsed date, update the input to show the formatted date
    if (parseResult?.isValid && parseResult.date) {
      setInputValue(formatDateForInput(parseResult.date))
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (parseResult?.isValid && parseResult.date) {
        setInputValue(formatDateForInput(parseResult.date))
        inputRef.current?.blur()
      }
    }
    if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  return (
    <div className={cn('relative', className)}>
      <div className="relative">
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            'pr-20',
            showError && 'border-red-500 focus:border-red-500',
            parseResult?.isValid && !showError && 'border-green-500 focus:border-green-500'
          )}
        />
        
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {inputValue && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="h-6 w-6 p-0 hover:bg-gray-100"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
          
          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-gray-100"
                disabled={disabled}
              >
                <Calendar className="h-3 w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={value || undefined}
                onSelect={handleCalendarSelect}
                disabled={(date) => {
                  if (minDate && date < minDate) return true
                  if (maxDate && date > maxDate) return true
                  if (!allowPast && date < new Date()) return true
                  return false
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Parse result indicator */}
      {parseResult && (
        <div className={cn(
          'mt-1 text-xs',
          parseResult.isValid ? 'text-green-600' : 'text-red-600'
        )}>
          {parseResult.isValid ? parseResult.text : parseResult.error}
        </div>
      )}

      {/* Error message */}
      {showError && (
        <div className="mt-1 text-xs text-red-600">
          Invalid date format. Try &ldquo;tomorrow&rdquo;, &ldquo;Dec 25&rdquo;, or &ldquo;next week&rdquo;
        </div>
      )}
    </div>
  )
}
