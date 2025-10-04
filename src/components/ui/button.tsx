import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-lg text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background',
  {
    variants: {
      variant: {
        default: 'bg-gradient-to-r from-primary to-primary-hover text-white shadow-md hover:shadow-lg hover:scale-105 active:scale-95',
        destructive: 'bg-gradient-to-r from-error to-red-600 text-white shadow-md hover:shadow-lg hover:scale-105 active:scale-95',
        outline: 'border-2 border-border hover:border-primary/50 hover:bg-primary/5 hover:shadow-sm transition-all',
        secondary: 'bg-gradient-to-r from-slate-100 to-slate-200 text-slate-900 hover:from-slate-200 hover:to-slate-300 shadow-sm hover:shadow-md',
        ghost: 'hover:bg-primary/10 hover:text-primary transition-colors',
        link: 'underline-offset-4 hover:underline text-primary hover:text-primary-hover',
        glass: 'bg-white/80 backdrop-blur-md border border-white/20 shadow-lg hover:bg-white/90 hover:shadow-xl',
        success: 'bg-gradient-to-r from-success to-emerald-600 text-white shadow-md hover:shadow-lg hover:scale-105 active:scale-95',
      },
      size: {
        default: 'h-11 py-2.5 px-5 rounded-lg',
        sm: 'h-9 px-4 rounded-lg text-xs',
        lg: 'h-12 px-8 rounded-xl text-base',
        icon: 'h-11 w-11 rounded-lg',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
  loadingText?: string
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, loadingText, children, disabled, ...props }, ref) => {
    const isDisabled = disabled || loading;

    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        {...props}
      >
        {loading ? (
          <>
            <span className="sr-only">{loadingText || 'Loading...'}</span>
            <span aria-hidden="true">{loadingText || 'Loading...'}</span>
          </>
        ) : (
          children
        )}
      </button>
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }


