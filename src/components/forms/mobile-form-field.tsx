'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Calendar, Clock, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useMobile } from '@/lib/hooks/use-mobile'

interface MobileFormFieldProps {
  label: string
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'textarea'
  placeholder?: string
  value?: string
  onChange?: (value: string) => void
  error?: string
  required?: boolean
  disabled?: boolean
  helperText?: string
  tooltip?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  className?: string
  inputClassName?: string
  rows?: number
  autoComplete?: string
  pattern?: string
  min?: string | number
  max?: string | number
  step?: string | number
}

export function MobileFormField({
  label,
  type = 'text',
  placeholder,
  value = '',
  onChange,
  error,
  required,
  disabled,
  helperText,
  tooltip,
  leftIcon,
  rightIcon,
  className,
  inputClassName,
  rows = 3,
  autoComplete,
  pattern,
  min,
  max,
  step
}: MobileFormFieldProps) {
  const isMobile = useMobile()
  const [showPassword, setShowPassword] = useState(false)
  const [isFocused, setIsFocused] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onChange?.(e.target.value)
  }

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword)
  }

  // Mobile-specific input props
  const mobileInputProps = {
    className: cn(
      // Base mobile styles
      'w-full rounded-lg border bg-background text-base', // Larger text for mobile
      'transition-colors duration-200',
      // Focus states
      'focus:border-primary focus:ring-2 focus:ring-primary/20',
      // Error states
      error ? 'border-destructive focus:border-destructive focus:ring-destructive/20' : 'border-input',
      // Disabled states
      disabled && 'opacity-50 cursor-not-allowed',
      // Mobile touch targets
      'min-h-[48px] px-4 py-3', // 48px minimum touch target
      inputClassName
    ),
    placeholder,
    value,
    onChange: handleChange,
    onFocus: () => setIsFocused(true),
    onBlur: () => setIsFocused(false),
    disabled,
    required,
    autoComplete,
    pattern,
    min,
    max,
    step,
    'aria-invalid': !!error,
    'aria-describedby': error ? `${label}-error` : helperText ? `${label}-helper` : undefined
  }

  if (isMobile) {
    return (
      <div className={cn('space-y-2', className)}>
        {/* Mobile Label with Tooltip */}
        <div className="flex items-center justify-between">
          <Label
            htmlFor={label}
            className={cn(
              'text-sm font-medium text-foreground flex items-center gap-2',
              required && "after:content-['*'] after:text-destructive after:ml-1"
            )}
          >
            {label}
            {tooltip && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="p-1 h-6 w-6">
                    <HelpCircle className="w-3 h-3 text-muted-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">{tooltip}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </Label>
        </div>

        {/* Input Container with Icons */}
        <div className="relative">
          {/* Left Icon */}
          {leftIcon && (
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground z-10">
              {leftIcon}
            </div>
          )}

          {/* Input Field */}
          <div className="relative">
            {type === 'textarea' ? (
              <Textarea
                {...mobileInputProps}
                id={label}
                rows={rows}
                className={cn(mobileInputProps.className, leftIcon && 'pl-12', rightIcon && 'pr-12')}
              />
            ) : (
              <Input
                {...mobileInputProps}
                id={label}
                type={type === 'password' && showPassword ? 'text' : type}
                className={cn(
                  mobileInputProps.className,
                  leftIcon && 'pl-12',
                  (rightIcon || type === 'password') && 'pr-12'
                )}
              />
            )}
          </div>

          {/* Right Icon / Password Toggle */}
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
            {type === 'password' && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={togglePasswordVisibility}
                className="p-1 h-8 w-8 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </Button>
            )}
            {rightIcon && rightIcon}
          </div>

          {/* Focus Ring Animation */}
          {isFocused && !error && (
            <motion.div
              className="absolute inset-0 rounded-lg border-2 border-primary/50 pointer-events-none"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            />
          )}
        </div>

        {/* Helper Text */}
        {helperText && !error && (
          <p id={`${label}-helper`} className="text-xs text-muted-foreground">
            {helperText}
          </p>
        )}

        {/* Error Message */}
        {error && (
          <motion.p
            id={`${label}-error`}
            className="text-xs text-destructive font-medium flex items-center gap-1"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <span className="w-1 h-1 bg-destructive rounded-full flex-shrink-0" />
            {error}
          </motion.p>
        )}
      </div>
    )
  }

  // Desktop Layout (fallback to standard form field)
  return (
    <div className={cn('space-y-2', className)}>
      {/* Desktop Label */}
      <div className="flex items-center gap-2">
        <Label
          htmlFor={label}
          className={cn(
            'text-sm font-medium text-foreground',
            required && "after:content-['*'] after:text-destructive after:ml-1"
          )}
        >
          {label}
        </Label>
        {tooltip && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="p-1 h-6 w-6">
                <HelpCircle className="w-3 h-3 text-muted-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">{tooltip}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Input Container */}
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
            {leftIcon}
          </div>
        )}

        {type === 'textarea' ? (
          <Textarea
            {...mobileInputProps}
            id={label}
            rows={rows}
            className={cn(
              'min-h-[80px] px-3 py-2 text-sm', // Smaller on desktop
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              inputClassName
            )}
          />
        ) : (
          <Input
            {...mobileInputProps}
            id={label}
            type={type === 'password' && showPassword ? 'text' : type}
            className={cn(
              'h-10 px-3 py-2 text-sm', // Smaller on desktop
              leftIcon && 'pl-10',
              (rightIcon || type === 'password') && 'pr-10',
              inputClassName
            )}
          />
        )}

        {/* Password Toggle */}
        {type === 'password' && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={togglePasswordVisibility}
              className="p-1 h-8 w-8 text-muted-foreground hover:text-foreground"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </Button>
          </div>
        )}

        {rightIcon && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
            {rightIcon}
          </div>
        )}
      </div>

      {/* Helper Text */}
      {helperText && !error && (
        <p className="text-xs text-muted-foreground">
          {helperText}
        </p>
      )}

      {/* Error Message */}
      {error && (
        <p className="text-xs text-destructive font-medium">
          {error}
        </p>
      )}
    </div>
  )
}

export default MobileFormField
