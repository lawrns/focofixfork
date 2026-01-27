'use client';

import React, { forwardRef, useState, useEffect, useId } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AccessibilityService } from '@/lib/accessibility/accessibility';
import { cn } from '@/lib/utils';

interface AccessibleFieldProps {
  id: string;
  label: string;
  description?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function AccessibleField({
  id,
  label,
  description,
  error,
  required,
  className,
  children
}: AccessibleFieldProps) {
  const errorId = `${id}-error`;
  const descriptionId = description ? `${id}-description` : undefined;

  return (
    <div className={cn('space-y-2', className)}>
      <Label
        htmlFor={id}
        className={cn(
          'text-sm font-medium',
          required && "after:content-['*'] after:text-red-500 after:ml-1"
        )}
      >
        {label}
      </Label>

      {description && (
        <p
          id={descriptionId}
          className="text-sm text-muted-foreground"
        >
          {description}
        </p>
      )}

      <div className="relative">
        {React.cloneElement(children as React.ReactElement, {
          id,
          'aria-describedby': [descriptionId, error ? errorId : undefined]
            .filter(Boolean)
            .join(' ') || undefined,
          'aria-invalid': error ? 'true' : 'false',
          'aria-required': required ? 'true' : 'false',
          required,
        })}
      </div>

      {error && (
        <div
          id={errorId}
          role="alert"
          aria-live="polite"
          className="text-sm text-red-600"
        >
          {error}
        </div>
      )}
    </div>
  );
}

interface AccessibleInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  description?: string;
  error?: string;
  required?: boolean;
  className?: string;
}

export const AccessibleInput = forwardRef<HTMLInputElement, AccessibleInputProps>(
  ({ label, description, error, required, className, ...props }, ref) => {
    const generatedId = useId();
    const id = props.id || generatedId;

    return (
      <AccessibleField
        id={id}
        label={label}
        description={description}
        error={error}
        required={required}
        className={className}
      >
        <Input
          ref={ref}
          {...props}
          aria-describedby={
            [description ? `${id}-description` : undefined, error ? `${id}-error` : undefined]
              .filter(Boolean)
              .join(' ') || undefined
          }
          aria-invalid={error ? 'true' : 'false'}
          aria-required={required ? 'true' : 'false'}
        />
      </AccessibleField>
    );
  }
);
AccessibleInput.displayName = 'AccessibleInput';

interface AccessibleTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  description?: string;
  error?: string;
  required?: boolean;
  className?: string;
}

export const AccessibleTextarea = forwardRef<HTMLTextAreaElement, AccessibleTextareaProps>(
  ({ label, description, error, required, className, ...props }, ref) => {
    const generatedId = useId();
    const id = props.id || generatedId;

    return (
      <AccessibleField
        id={id}
        label={label}
        description={description}
        error={error}
        required={required}
        className={className}
      >
        <Textarea
          ref={ref}
          {...props}
          aria-describedby={
            [description ? `${id}-description` : undefined, error ? `${id}-error` : undefined]
              .filter(Boolean)
              .join(' ') || undefined
          }
          aria-invalid={error ? 'true' : 'false'}
          aria-required={required ? 'true' : 'false'}
        />
      </AccessibleField>
    );
  }
);
AccessibleTextarea.displayName = 'AccessibleTextarea';

interface AccessibleSelectProps {
  id?: string;
  label: string;
  description?: string;
  error?: string;
  required?: boolean;
  placeholder?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  className?: string;
}

export function AccessibleSelect({
  id,
  label,
  description,
  error,
  required,
  placeholder,
  value,
  onValueChange,
  options,
  className
}: AccessibleSelectProps) {
  const generatedId = useId();
  const selectId = id || generatedId;

  return (
    <AccessibleField
      id={selectId}
      label={label}
      description={description}
      error={error}
      required={required}
      className={className}
    >
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger
          aria-describedby={
            [description ? `${selectId}-description` : undefined, error ? `${selectId}-error` : undefined]
              .filter(Boolean)
              .join(' ') || undefined
          }
          aria-invalid={error ? 'true' : 'false'}
          aria-required={required ? 'true' : 'false'}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </AccessibleField>
  );
}



interface AccessibleRadioGroupProps {
  id?: string;
  label: string;
  description?: string;
  error?: string;
  required?: boolean;
  value?: string;
  onValueChange?: (value: string) => void;
  options: Array<{ value: string; label: string; description?: string; disabled?: boolean }>;
  className?: string;
}

export function AccessibleRadioGroup({
  id,
  label,
  description,
  error,
  required,
  value,
  onValueChange,
  options,
  className
}: AccessibleRadioGroupProps) {
  const generatedId = useId();
  const groupId = id || generatedId;

  return (
    <AccessibleField
      id={groupId}
      label={label}
      description={description}
      error={error}
      required={required}
      className={className}
    >
      <RadioGroup
        value={value}
        onValueChange={onValueChange}
        aria-describedby={
          [description ? `${groupId}-description` : undefined, error ? `${groupId}-error` : undefined]
            .filter(Boolean)
            .join(' ') || undefined
        }
        aria-invalid={error ? 'true' : 'false'}
        aria-required={required ? 'true' : 'false'}
      >
        {options.map((option) => (
          <div key={option.value} className="flex items-start space-x-2">
            <RadioGroupItem
              value={option.value}
              id={`${groupId}-${option.value}`}
              disabled={option.disabled}
            />
            <div className="grid gap-1.5 leading-none">
              <Label
                htmlFor={`${groupId}-${option.value}`}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {option.label}
              </Label>
              {option.description && (
                <p className="text-sm text-muted-foreground">
                  {option.description}
                </p>
              )}
            </div>
          </div>
        ))}
      </RadioGroup>
    </AccessibleField>
  );
}

interface SkipLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export function SkipLink({ href, children, className }: SkipLinkProps) {
  return (
    <a
      href={href}
      className={cn(
        'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-[#0052CC] focus:text-white focus:rounded-md focus:shadow-lg',
        className
      )}
    >
      {children}
    </a>
  );
}

interface LiveRegionProps {
  children: React.ReactNode;
  priority?: 'polite' | 'assertive';
  atomic?: boolean;
  className?: string;
}

export function LiveRegion({ children, priority = 'polite', atomic = true, className }: LiveRegionProps) {
  return (
    <div
      aria-live={priority}
      aria-atomic={atomic}
      className={cn('sr-only', className)}
    >
      {children}
    </div>
  );
}

interface ScreenReaderOnlyProps {
  children: React.ReactNode;
  className?: string;
}

export function ScreenReaderOnly({ children, className }: ScreenReaderOnlyProps) {
  return (
    <span className={cn('sr-only', className)}>
      {children}
    </span>
  );
}

interface AccessibleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingText?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const AccessibleButton = forwardRef<HTMLButtonElement, AccessibleButtonProps>(
  ({
    children,
    loading,
    loadingText = 'Loading...',
    disabled,
    className,
    ...props
  }, ref) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        {...props}
        className={cn(
          'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50',
          className
        )}
      >
        {loading ? (
          <>
            <span className="sr-only">{loadingText}</span>
            <span aria-hidden="true">{loadingText}</span>
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);
AccessibleButton.displayName = 'AccessibleButton';

export function useAccessibleForm<T extends Record<string, any>>(initialValues: T) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouchedState] = useState<Partial<Record<keyof T, boolean>>>({});

  const setValue = (field: keyof T, value: any) => {
    setValues(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const setError = (field: keyof T, error: string | undefined) => {
    setErrors(prev => ({ ...prev, [field]: error }));
  };

  const setFieldTouched = (field: keyof T, isTouched: boolean = true) => {
    setTouchedState(prev => ({ ...prev, [field]: isTouched }));
  };

  const validate = async (validationRules: Partial<Record<keyof T, (value: any) => string | undefined>>) => {
    const newErrors: Partial<Record<keyof T, string>> = {};

    for (const [field, rule] of Object.entries(validationRules)) {
      const error = rule?.(values[field as keyof T]);
      if (error) {
        newErrors[field as keyof T] = error;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValid = Object.values(errors).every(error => !error);

  // Announce form errors to screen readers
  useEffect(() => {
    const errorCount = Object.values(errors).filter(Boolean).length;
    if (errorCount > 0) {
      AccessibilityService.announce(`${errorCount} form errors found. Please review and correct them.`, 'assertive');
    }
  }, [errors]);

  return {
    values,
    errors,
    touched,
    setValue,
    setError,
    setFieldTouched,
    validate,
    isValid,
    reset: () => {
      setValues(initialValues);
      setErrors({});
      setTouchedState({});
    },
  };
}
