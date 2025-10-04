import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const inputVariants = cva(
  'flex h-11 w-full rounded-lg border-2 border-border bg-white px-4 py-2.5 text-sm font-medium ring-offset-background transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:shadow-sm hover:border-border-dark disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-50',
  {
    variants: {
      variant: {
        default: '',
        error: 'border-error/50 focus-visible:border-error focus-visible:ring-error/20 bg-error/5',
        success: 'border-success/50 focus-visible:border-success focus-visible:ring-success/20 bg-success/5'
      }
    },
    defaultVariants: {
      variant: 'default'
    }
  }
)

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof inputVariants> {
  'aria-describedby'?: string
  'aria-invalid'?: boolean | 'true' | 'false'
  'aria-required'?: boolean | 'true' | 'false'
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, variant, type, 'aria-describedby': ariaDescribedBy, 'aria-invalid': ariaInvalid, 'aria-required': ariaRequired, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(inputVariants({ variant, className }))}
        ref={ref}
        aria-describedby={ariaDescribedBy}
        aria-invalid={ariaInvalid}
        aria-required={ariaRequired}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

export { Input, inputVariants }


