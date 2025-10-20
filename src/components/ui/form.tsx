'use client'

import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"
import { Slot } from "@radix-ui/react-slot"
import { cn } from "@/lib/utils"
import { Check, X } from "lucide-react"

const Form = React.forwardRef<
  HTMLFormElement,
  React.FormHTMLAttributes<HTMLFormElement>
>(({ className, ...props }, ref) => (
  <form ref={ref} className={cn("space-y-4", className)} {...props} />
))
Form.displayName = "Form"

const FormField = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("space-y-2", className)} {...props} />
))
FormField.displayName = "FormField"

const FormLabel = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(
      "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
      className
    )}
    {...props}
  />
))
FormLabel.displayName = LabelPrimitive.Root.displayName

const FormControl = React.forwardRef<
  React.ElementRef<typeof Slot>,
  React.ComponentPropsWithoutRef<typeof Slot>
>(({ ...props }, ref) => <Slot ref={ref} {...props} />)
FormControl.displayName = "FormControl"

const FormDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
FormDescription.displayName = "FormDescription"

const FormMessage = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement> & {
    variant?: 'error' | 'success' | 'warning'
  }
>(({ className, variant = 'error', ...props }, ref) => {
  const variantClasses = {
    error: "text-red-500",
    success: "text-green-500", 
    warning: "text-yellow-500"
  }

  return (
    <p
      ref={ref}
      className={cn("text-sm flex items-center gap-1", variantClasses[variant], className)}
      {...props}
    />
  )
})
FormMessage.displayName = "FormMessage"

const FormItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("space-y-2", className)} {...props} />
))
FormItem.displayName = "FormItem"

interface ValidationState {
  isValid: boolean
  message?: string
  variant?: 'error' | 'success' | 'warning'
}

interface FormFieldWithValidationProps {
  children: React.ReactNode
  validation?: ValidationState
  className?: string
}

function FormFieldWithValidation({ 
  children, 
  validation, 
  className 
}: FormFieldWithValidationProps) {
  return (
    <FormField className={className}>
      {children}
      {validation && (
        <FormMessage variant={validation.variant}>
          {validation.variant === 'success' ? (
            <Check className="h-3 w-3" />
          ) : (
            <X className="h-3 w-3" />
          )}
          {validation.message}
        </FormMessage>
      )}
    </FormField>
  )
}

export {
  Form,
  FormField,
  FormFieldWithValidation,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
}
