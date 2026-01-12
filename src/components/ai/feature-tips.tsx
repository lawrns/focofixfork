'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/design-system'
import { 
  Lightbulb, 
  X, 
  CheckCircle, 
  ArrowRight,
  Sparkles,
  Users,
  BarChart,
  Folder,
  Keyboard,
  Calendar,
  List
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { suggestionEngine } from '@/lib/ai/suggestion-engine'

interface FeatureTipProps {
  target?: string
  title: string
  description: string
  action?: string
  priority: 'low' | 'medium' | 'high'
  category: 'onboarding' | 'productivity' | 'collaboration' | 'analytics' | 'optimization'
  icon?: string
  dismissible?: boolean
  onAction?: (action: string) => void
  onDismiss?: () => void
}

export function FeatureTip({
  target,
  title,
  description,
  action,
  priority,
  category,
  icon,
  dismissible = true,
  onAction,
  onDismiss
}: FeatureTipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)
  const tipRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Show tip after a short delay
    const timer = setTimeout(() => {
      setIsVisible(true)
    }, 500)

    return () => clearTimeout(timer)
  }, [])

  const handleDismiss = () => {
    setIsDismissed(true)
    onDismiss?.()
  }

  const handleAction = () => {
    if (action) {
      onAction?.(action)
    }
    handleDismiss()
  }

  const getIcon = () => {
    switch (icon) {
      case 'sparkles':
        return <Sparkles className="w-5 h-5" />
      case 'users':
        return <Users className="w-5 h-5" />
      case 'bar-chart':
        return <BarChart className="w-5 h-5" />
      case 'folder':
        return <Folder className="w-5 h-5" />
      case 'keyboard':
        return <Keyboard className="w-5 h-5" />
      case 'calendar':
        return <Calendar className="w-5 h-5" />
      case 'list':
        return <List className="w-5 h-5" />
      default:
        return <Lightbulb className="w-5 h-5" />
    }
  }

  const getPriorityColor = () => {
    switch (priority) {
      case 'high':
        return 'border-red-200 bg-red-50'
      case 'medium':
        return 'border-yellow-200 bg-yellow-50'
      case 'low':
        return 'border-blue-200 bg-blue-50'
      default:
        return 'border-gray-200 bg-gray-50'
    }
  }

  if (isDismissed) return null

  return (
    <div
      ref={tipRef}
      className={cn(
        'fixed z-50 transition-all duration-300 ease-in-out',
        isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
      )}
      style={{
        top: target ? '50%' : '20px',
        right: target ? 'auto' : '20px',
        left: target ? '50%' : 'auto',
        transform: target ? 'translate(-50%, -50%)' : 'none'
      }}
    >
      <Card className={cn('max-w-sm shadow-lg border-2', getPriorityColor())}>
        <div className="p-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 text-blue-600">
              {getIcon()}
            </div>
            
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-gray-900 mb-1">
                {title}
              </h4>
              <p className="text-sm text-gray-600 mb-3">
                {description}
              </p>
              
              <div className="flex items-center space-x-2">
                {action && (
                  <Button
                    size="sm"
                    onClick={handleAction}
                    className="text-xs"
                  >
                    {action}
                    <ArrowRight className="w-3 h-3" />
                  </Button>
                )}
                
                {dismissible && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDismiss}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Got it
                  </Button>
                )}
              </div>
            </div>
            
            {dismissible && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}

interface FeatureTipsManagerProps {
  className?: string
}

export function FeatureTipsManager({ className }: FeatureTipsManagerProps) {
  const [activeTips, setActiveTips] = useState<FeatureTipProps[]>([])
  const [context, setContext] = useState<any>({})

  useEffect(() => {
    // Listen for context changes and generate suggestions
    const handleContextChange = () => {
      const suggestions = suggestionEngine.generateSuggestions(context)
      setActiveTips(suggestions)
    }

    // Initial context check
    handleContextChange()

    // Listen for suggestion events
    const handleSuggestion = (event: CustomEvent) => {
      const suggestion = event.detail
      setActiveTips(prev => [...prev, suggestion])
    }

    window.addEventListener('ai-suggestion', handleSuggestion as EventListener)

    return () => {
      window.removeEventListener('ai-suggestion', handleSuggestion as EventListener)
    }
  }, [context])

  const handleTipAction = (action: string) => {
    // Handle tip actions
    switch (action) {
      case 'start_tour':
        window.dispatchEvent(new CustomEvent('start-product-tour'))
        break
      case 'create_project':
        window.location.href = '/projects?create=true'
        break
      case 'add_tasks':
        window.location.href = '/tasks?create=true'
        break
      case 'invite_team':
        window.location.href = '/organizations?invite=true'
        break
      case 'view_analytics':
        window.location.href = '/dashboard/analytics'
        break
      case 'explore_ai':
        window.dispatchEvent(new CustomEvent('open-ai-assistant'))
        break
      case 'set_deadlines':
        window.location.href = '/tasks?filter=no-deadline'
        break
      case 'organize_projects':
        window.location.href = '/projects?organize=true'
        break
      case 'learn_shortcuts':
        window.dispatchEvent(new CustomEvent('show-keyboard-shortcuts'))
        break
      default:
        console.log('Unknown action:', action)
    }

    // Mark action as completed
    suggestionEngine.completeAction(action)
  }

  const handleTipDismiss = (tipId: string) => {
    suggestionEngine.dismissSuggestion(tipId)
    setActiveTips(prev => prev.filter(tip => tip.title !== tipId))
  }

  return (
    <div className={cn('fixed inset-0 pointer-events-none z-40', className)}>
      {activeTips.map((tip, index) => (
        <FeatureTip
          key={`${tip.title}-${index}`}
          {...tip}
          onAction={handleTipAction}
          onDismiss={() => handleTipDismiss(tip.title)}
        />
      ))}
    </div>
  )
}
