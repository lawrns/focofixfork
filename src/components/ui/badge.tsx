import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-gradient-to-r from-primary to-primary-hover text-white shadow-sm hover:shadow-md',
        secondary:
          'border-transparent bg-gradient-to-r from-slate-100 to-slate-200 text-slate-900 hover:from-slate-200 hover:to-slate-300',
        destructive:
          'border-transparent bg-gradient-to-r from-error to-red-600 text-white shadow-sm hover:shadow-md',
        outline: 'text-foreground border-border hover:bg-primary/5 hover:border-primary/30',
        success:
          'border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 hover:bg-emerald-200',
        warning:
          'border-transparent bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 hover:bg-amber-200',
        info:
          'border-transparent bg-blue-500 text-white dark:bg-blue-900/40 dark:text-blue-300 hover:bg-blue-200',
        muted:
          'border-transparent bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-300 hover:bg-slate-200',
        glass:
          'bg-white/80 backdrop-blur-sm border-white/20 text-slate-900 shadow-sm hover:bg-white/90'
      },
      size: {
        sm: 'px-2 py-0.5 text-xs',
        default: 'px-3 py-1 text-xs',
        lg: 'px-4 py-1.5 text-sm'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props} />
  )
}

export { Badge, badgeVariants }


