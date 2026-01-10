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
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5"
          >
            {label}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
              {leftIcon}
            </div>
          )}

          <input
            id={id}
            type={type}
            disabled={disabled}
            className={cn(
              `w-full rounded-lg border bg-white px-3 py-2.5
               text-zinc-900 placeholder:text-zinc-400
               transition-colors duration-150
               focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400
               disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:opacity-60
               dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500
               dark:border-zinc-700 dark:disabled:bg-zinc-800
               dark:focus:ring-zinc-100/10 dark:focus:border-zinc-500`,
              error
                ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500'
                : 'border-zinc-200 dark:border-zinc-700',
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              className
            )}
            ref={ref}
            {...props}
          />

          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400">
              {rightIcon}
            </div>
          )}
        </div>

        {(helperText || error) && (
          <p
            className={cn(
              'mt-1.5 text-xs',
              error ? 'text-red-500' : 'text-zinc-500 dark:text-zinc-400'
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


