"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface AccordionContextValue {
  type: 'single' | 'multiple'
  value: string[]
  onToggle: (v: string) => void
  collapsible?: boolean
}
const AccordionContext = React.createContext<AccordionContextValue>({
  type: 'single',
  value: [],
  onToggle: () => {},
})

interface AccordionProps {
  type: 'single' | 'multiple'
  defaultValue?: string | string[]
  value?: string | string[]
  onValueChange?: (v: string | string[]) => void
  collapsible?: boolean
  className?: string
  children: React.ReactNode
}

function Accordion({
  type,
  defaultValue,
  value: controlledValue,
  onValueChange,
  collapsible = true,
  className,
  children,
}: AccordionProps) {
  const initialValue = defaultValue
    ? Array.isArray(defaultValue) ? defaultValue : [defaultValue]
    : []
  const [internalValue, setInternalValue] = React.useState<string[]>(initialValue)

  const value = controlledValue != null
    ? Array.isArray(controlledValue) ? controlledValue : [controlledValue]
    : internalValue

  const onToggle = (v: string) => {
    let next: string[]
    if (type === 'single') {
      next = value.includes(v) && collapsible ? [] : [v]
    } else {
      next = value.includes(v) ? value.filter((x) => x !== v) : [...value, v]
    }
    setInternalValue(next)
    onValueChange?.(type === 'single' ? (next[0] ?? '') : next)
  }

  return (
    <AccordionContext.Provider value={{ type, value, onToggle, collapsible }}>
      <div className={cn('space-y-1', className)}>{children}</div>
    </AccordionContext.Provider>
  )
}

interface AccordionItemContextValue {
  itemValue: string
}
const AccordionItemContext = React.createContext<AccordionItemContextValue>({ itemValue: '' })

interface AccordionItemProps {
  value: string
  className?: string
  children: React.ReactNode
}

function AccordionItem({ value, className, children }: AccordionItemProps) {
  return (
    <AccordionItemContext.Provider value={{ itemValue: value }}>
      <div className={cn('border-b', className)}>{children}</div>
    </AccordionItemContext.Provider>
  )
}

interface AccordionTriggerProps {
  className?: string
  children: React.ReactNode
}

function AccordionTrigger({ className, children }: AccordionTriggerProps) {
  const { value, onToggle } = React.useContext(AccordionContext)
  const { itemValue } = React.useContext(AccordionItemContext)
  const isOpen = value.includes(itemValue)

  return (
    <button
      type="button"
      onClick={() => onToggle(itemValue)}
      aria-expanded={isOpen}
      className={cn(
        'flex flex-1 w-full items-center justify-between py-3 font-medium transition-all',
        '[&>*]:pointer-events-none',
        className
      )}
    >
      {children}
      <ChevronDown
        className={cn(
          'h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200',
          isOpen && 'rotate-180'
        )}
      />
    </button>
  )
}

interface AccordionContentProps {
  className?: string
  children: React.ReactNode
}

function AccordionContent({ className, children }: AccordionContentProps) {
  const { value } = React.useContext(AccordionContext)
  const { itemValue } = React.useContext(AccordionItemContext)
  const isOpen = value.includes(itemValue)

  if (!isOpen) return null

  return (
    <div className={cn('pb-3 pt-0', className)}>
      {children}
    </div>
  )
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
