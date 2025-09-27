'use client'

import * as React from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, UseFormReturn, SubmitHandler, SubmitErrorHandler, FieldValues, DefaultValues } from 'react-hook-form'
import { z } from 'zod'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { FormProvider } from 'react-hook-form'

interface FormProps<T extends FieldValues = FieldValues> {
  children: React.ReactNode
  className?: string
  onSubmit: SubmitHandler<T>
  onError?: SubmitErrorHandler<T>
  defaultValues?: DefaultValues<T>
  schema?: z.ZodSchema<T>
  form?: UseFormReturn<T>
}

function Form<T extends FieldValues = FieldValues>({
  children,
  className,
  onSubmit,
  onError,
  defaultValues,
  schema,
  form: providedForm,
  ...props
}: FormProps<T> & React.FormHTMLAttributes<HTMLFormElement>) {
  const form = providedForm || useForm<T>({
    resolver: schema ? zodResolver(schema as any) : undefined,
    defaultValues,
    mode: 'onChange'
  })

  return (
    <FormProvider {...form}>
      <form
        className={cn('space-y-6', className)}
        onSubmit={form.handleSubmit(onSubmit, onError)}
        {...props}
      >
        {children}
      </form>
    </FormProvider>
  )
}

interface FormActionsProps {
  children?: React.ReactNode
  className?: string
  align?: 'left' | 'center' | 'right' | 'between'
}

const FormActions = React.forwardRef<HTMLDivElement, FormActionsProps>(
  ({ children, className, align = 'right', ...props }, ref) => {
    const alignmentClasses = {
      left: 'justify-start',
      center: 'justify-center',
      right: 'justify-end',
      between: 'justify-between'
    }

    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center gap-4 pt-6 border-t',
          alignmentClasses[align],
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
FormActions.displayName = 'FormActions'

interface FormSectionProps {
  title?: string
  description?: string
  children: React.ReactNode
  className?: string
}

const FormSection = React.forwardRef<HTMLDivElement, FormSectionProps>(
  ({ title, description, children, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('space-y-4', className)}
      {...props}
    >
      {(title || description) && (
        <div className="space-y-1">
          {title && (
            <h3 className="text-lg font-medium text-foreground">{title}</h3>
          )}
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      )}
      <div className="space-y-4">
        {children}
      </div>
    </div>
  )
)
FormSection.displayName = 'FormSection'

interface FormRowProps {
  children: React.ReactNode
  className?: string
  columns?: 1 | 2 | 3 | 4
}

const FormRow = React.forwardRef<HTMLDivElement, FormRowProps>(
  ({ children, className, columns = 1, ...props }, ref) => {
    const gridClasses = {
      1: 'grid-cols-1',
      2: 'grid-cols-1 md:grid-cols-2',
      3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
      4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
    }

    return (
      <div
        ref={ref}
        className={cn('grid gap-4', gridClasses[columns], className)}
        {...props}
      >
        {children}
      </div>
    )
  }
)
FormRow.displayName = 'FormRow'

export { Form, FormActions, FormSection, FormRow }

// Re-export form field components for convenience
export {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  useFormField
} from './form-field'
