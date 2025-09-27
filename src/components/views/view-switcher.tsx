'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Table, Kanban, GanttChart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

export type ViewType = 'table' | 'kanban' | 'gantt'

interface ViewSwitcherProps {
  currentView: ViewType
  onViewChange: (view: ViewType) => void
  className?: string
  disabled?: boolean
  showLabels?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const viewConfig = {
  table: {
    icon: Table,
    label: 'Table',
    description: 'Detailed list view with all columns',
    shortcut: 'Ctrl+1'
  },
  kanban: {
    icon: Kanban,
    label: 'Kanban',
    description: 'Visual board with columns for each status',
    shortcut: 'Ctrl+2'
  },
  gantt: {
    icon: GanttChart,
    label: 'Gantt',
    description: 'Timeline view showing project schedule',
    shortcut: 'Ctrl+3'
  }
}

const ViewSwitcher: React.FC<ViewSwitcherProps> = ({
  currentView,
  onViewChange,
  className,
  disabled = false,
  showLabels = true,
  size = 'md'
}) => {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12'
  }

  const buttonSizeClass = sizeClasses[size]

  // Keyboard shortcuts handler
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (disabled) return

      // Check for Ctrl+number combinations
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case '1':
            event.preventDefault()
            onViewChange('table')
            break
          case '2':
            event.preventDefault()
            onViewChange('kanban')
            break
          case '3':
            event.preventDefault()
            onViewChange('gantt')
            break
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onViewChange, disabled])

  return (
    <TooltipProvider>
      <div className={cn('flex items-center gap-1 p-1 bg-muted rounded-lg', className)}>
        {(Object.keys(viewConfig) as ViewType[]).map((viewType) => {
          const config = viewConfig[viewType]
          const IconComponent = config.icon
          const isActive = currentView === viewType

          return (
            <Tooltip key={viewType}>
              <TooltipTrigger asChild>
                <Button
                  variant={isActive ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => onViewChange(viewType)}
                  disabled={disabled}
                  className={cn(
                    'transition-all duration-200',
                    buttonSizeClass,
                    isActive
                      ? 'shadow-sm bg-primary text-primary-foreground'
                      : 'hover:bg-background/80'
                  )}
                >
                  <IconComponent className={cn(
                    size === 'sm' ? 'h-4 w-4' :
                    size === 'md' ? 'h-5 w-5' :
                    'h-6 w-6'
                  )} />

                  {showLabels && (
                    <span className="sr-only md:not-sr-only md:ml-2 text-xs font-medium">
                      {config.label}
                    </span>
                  )}
                </Button>
              </TooltipTrigger>

              <TooltipContent side="bottom" className="text-center">
                <div>
                  <div className="font-medium">{config.label}</div>
                  <div className="text-xs text-muted-foreground">{config.description}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Press {config.shortcut}
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          )
        })}
      </div>
    </TooltipProvider>
  )
}

export default ViewSwitcher

// Hook for managing view state with localStorage persistence
export function useViewSwitcher(initialView: ViewType = 'table') {
  const [currentView, setCurrentView] = React.useState<ViewType>(() => {
    // Try to get from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('foco-view-preference')
      if (saved && ['table', 'kanban', 'gantt'].includes(saved)) {
        return saved as ViewType
      }
    }
    return initialView
  })

  const changeView = React.useCallback((view: ViewType) => {
    setCurrentView(view)
    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('foco-view-preference', view)
    }
  }, [])

  return [currentView, changeView] as const
}

// Higher-order component for views that need view switching
export function withViewSwitcher<P extends object>(
  Component: React.ComponentType<P>,
  viewSwitcherProps?: Omit<ViewSwitcherProps, 'currentView' | 'onViewChange'>
) {
  return function WrappedComponent(props: P & {
    initialView?: ViewType
    onViewChange?: (view: ViewType) => void
  }) {
    const { initialView = 'table', onViewChange, ...restProps } = props
    const [currentView, setCurrentView] = useViewSwitcher(initialView)

    const handleViewChange = React.useCallback((view: ViewType) => {
      setCurrentView(view)
      onViewChange?.(view)
    }, [setCurrentView, onViewChange])

    return (
      <div className="space-y-4">
        <ViewSwitcher
          currentView={currentView}
          onViewChange={handleViewChange}
          {...viewSwitcherProps}
        />
        <Component {...(restProps as P)} currentView={currentView} />
      </div>
    )
  }
}
