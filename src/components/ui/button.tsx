import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  `inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg
   text-sm font-medium transition-all duration-150
   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
   disabled:pointer-events-none disabled:opacity-50
   active:scale-[0.98]`,
  {
    variants: {
      variant: {
        primary: `
          bg-primary-500 text-white shadow-sm
          hover:bg-primary-600 hover:shadow-primary
          focus-visible:ring-primary-500
          dark:hover:shadow-primary
        `,
        default: `
          bg-primary-500 text-white shadow-sm
          hover:bg-primary-600 hover:shadow-primary
          focus-visible:ring-primary-500
          dark:hover:shadow-primary
        `,
        secondary: `
          bg-white dark:bg-gray-800 
          text-primary-600 dark:text-primary-400 
          border border-primary-200 dark:border-primary-800
          hover:bg-primary-50 dark:hover:bg-primary-900/30
          focus-visible:ring-primary-500
        `,
        ghost: `
          text-gray-700 dark:text-gray-300
          hover:bg-gray-100 dark:hover:bg-gray-800
          focus-visible:ring-gray-500
        `,
        danger: `
          bg-red-500 text-white shadow-sm
          hover:bg-red-600
          focus-visible:ring-red-500
        `,
        success: `
          bg-green-500 text-white shadow-sm
          hover:bg-green-600
          focus-visible:ring-green-500
        `,
        link: `
          text-primary-600 dark:text-primary-400
          underline-offset-4 hover:underline
          p-0 h-auto
        `,
        outline: `
          border border-gray-300 dark:border-gray-600
          text-gray-700 dark:text-gray-300
          hover:bg-gray-50 dark:hover:bg-gray-800
          focus-visible:ring-gray-500
        `,
        destructive: `
          bg-red-500 text-white shadow-sm
          hover:bg-red-600
          focus-visible:ring-red-500
        `,
      },
      size: {
        xs: 'h-7 px-2.5 text-xs rounded-md',
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-5 text-base',
        xl: 'h-14 px-6 text-lg',
        compact: 'h-10 px-3 rounded-lg text-sm',
        icon: 'h-10 w-10',
        'icon-sm': 'h-8 w-8',
        'icon-xs': 'h-6 w-6',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading

    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        {...props}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          leftIcon
        )}
        {children}
        {!loading && rightIcon}
      </button>
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }


