import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  helperText?: string
  error?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type,
      label,
      helperText,
      error,
      leftIcon,
      rightIcon,
      disabled,
      ...props
    },
    ref
  ) => {
    const id = React.useId()

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={id}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
          >
            {label}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              {leftIcon}
            </div>
          )}

          <input
            id={id}
            type={type}
            disabled={disabled}
            className={cn(
              `w-full rounded-lg border bg-white px-3 py-2.5
               text-gray-900 placeholder:text-gray-400
               transition-all duration-150
               focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500
               disabled:cursor-not-allowed disabled:bg-gray-100 disabled:opacity-60
               dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500
               dark:border-gray-700 dark:disabled:bg-gray-800`,
              error
                ? 'border-red-500 focus:ring-red-500/30 focus:border-red-500'
                : 'border-gray-300 dark:border-gray-700',
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              className
            )}
            ref={ref}
            {...props}
          />

          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              {rightIcon}
            </div>
          )}
        </div>

        {(helperText || error) && (
          <p
            className={cn(
              'mt-1.5 text-xs',
              error ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'
            )}
          >
            {error || helperText}
          </p>
        )}
      </div>
    )
  }
)
Input.displayName = 'Input'

export { Input }


