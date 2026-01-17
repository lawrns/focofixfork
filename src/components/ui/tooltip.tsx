'use client'

import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"
import { cn } from "@/lib/utils"
import { useMobile } from "@/lib/hooks/use-mobile"

const TooltipProvider = TooltipPrimitive.Provider

/**
 * Mobile-aware Tooltip wrapper.
 * On mobile devices, tooltips show instantly (delayDuration=0) on touch/focus.
 * Note: Tooltips are primarily designed for hover interactions on desktop.
 * For critical information on mobile, consider using inline text, badges, or
 * info buttons that trigger popovers instead of relying on tooltips.
 */
const Tooltip = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Root>
>(({ delayDuration, ...props }, _ref) => {
  const isMobile = useMobile();

  return (
    <TooltipPrimitive.Root
      // On mobile, show instantly; on desktop, use provided delay or default
      delayDuration={isMobile ? 0 : delayDuration}
      {...props}
    />
  );
});
Tooltip.displayName = "Tooltip"

const TooltipTrigger = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Trigger>
>(({ ...props }, ref) => {
  const isMobile = useMobile();

  return (
    <TooltipPrimitive.Trigger
      ref={ref}
      // Make tooltips focusable on mobile for accessibility
      tabIndex={isMobile ? 0 : props.tabIndex}
      {...props}
    />
  );
});
TooltipTrigger.displayName = TooltipPrimitive.Trigger.displayName

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      "z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      className
    )}
    {...props}
  />
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }