import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  `inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg
   text-sm font-medium transition-colors duration-150
   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2
   disabled:pointer-events-none disabled:opacity-50`,
  {
    variants: {
      variant: {
        primary: `
          bg-zinc-900 text-white shadow-xs
          hover:bg-zinc-800 hover:shadow-sm
          dark:bg-zinc-100 dark:text-zinc-900
          dark:hover:bg-zinc-200
        `,
        default: `
          bg-zinc-900 text-white shadow-xs
          hover:bg-zinc-800 hover:shadow-sm
          dark:bg-zinc-100 dark:text-zinc-900
          dark:hover:bg-zinc-200
        `,
        secondary: `
          bg-white text-zinc-900 border border-zinc-200
          hover:bg-zinc-50
          dark:bg-zinc-900 dark:text-zinc-100 dark:border-zinc-700
          dark:hover:bg-zinc-800
        `,
        ghost: `
          text-zinc-700
          hover:bg-zinc-100
          dark:text-zinc-300
          dark:hover:bg-zinc-800
        `,
        danger: `
          bg-red-500 text-white
          hover:bg-red-600
        `,
        success: `
          bg-green-500 text-white
          hover:bg-green-600
        `,
        link: `
          text-zinc-900 dark:text-zinc-100
          underline-offset-4 hover:underline
          p-0 h-auto
        `,
        outline: `
          border border-zinc-200 text-zinc-700
          hover:bg-zinc-50
          dark:border-zinc-700 dark:text-zinc-300
          dark:hover:bg-zinc-800
        `,
        destructive: `
          bg-red-500 text-white
          hover:bg-red-600
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


