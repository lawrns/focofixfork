'use client'

interface UserAction {
  type: 'page_view' | 'click' | 'scroll' | 'hover' | 'form_input' | 'navigation'
  target?: string
  page: string
  timestamp: number
  data?: any
}

interface UserSession {
  id: string
  startTime: number
  actions: UserAction[]
  currentPage: string
  timeOnPage: number
  scrollDepth: number
  lastActionTime: number
}

interface ContextTrigger {
  id: string
  condition: (session: UserSession) => boolean
  suggestion: {
    type: 'tip' | 'action' | 'feature'
    title: string
    description: string
    action?: string
    priority: 'low' | 'medium' | 'high'
  }
  cooldown: number // milliseconds
  lastTriggered?: number
}

class ContextDetector {
  private session: UserSession | null = null
  private triggers: ContextTrigger[] = []
  private isTracking = false
  private pageStartTime = 0
  private lastScrollTime = 0
  private scrollTimeout: NodeJS.Timeout | null = null

  constructor() {
    this.initializeTriggers()
    this.startTracking()
  }

  private initializeTriggers() {
    this.triggers = [
      // Empty state triggers
      {
        id: 'empty_dashboard_30s',
        condition: (session) => {
          return session.currentPage === '/dashboard' && 
                 session.timeOnPage > 30000 &&
                 session.actions.filter(a => a.type === 'click').length === 0
        },
        suggestion: {
          type: 'action',
          title: 'Create Your First Project',
          description: 'Get started by creating your first project. I can help you set it up!',
          action: 'create_project',
          priority: 'high'
        },
        cooldown: 300000 // 5 minutes
      },

      // Repeated page visits without action
      {
        id: 'repeated_visits_no_action',
        condition: (session) => {
          const projectVisits = session.actions.filter(a => 
            a.type === 'page_view' && a.page.includes('/projects/') && !a.page.includes('?create=true')
          )
          return projectVisits.length >= 3 && 
                 session.actions.filter(a => a.type === 'click' && a.target?.includes('task')).length === 0
        },
        suggestion: {
          type: 'tip',
          title: 'Add Tasks to Your Project',
          description: 'Projects work better with tasks. Would you like help breaking down your project into actionable tasks?',
          action: 'add_tasks',
          priority: 'medium'
        },
        cooldown: 600000 // 10 minutes
      },

      // Team collaboration suggestions
      {
        id: 'no_team_members',
        condition: (session) => {
          const projectViews = session.actions.filter(a => a.type === 'page_view' && a.page.includes('/projects/'))
          return projectViews.length >= 2 &&
                 session.actions.filter(a => a.target?.includes('team') || a.target?.includes('invite')).length === 0
        },
        suggestion: {
          type: 'feature',
          title: 'Invite Team Members',
          description: 'Projects are more successful with team collaboration. Invite your colleagues to work together!',
          action: 'invite_team',
          priority: 'medium'
        },
        cooldown: 900000 // 15 minutes
      },

      // Analytics discovery
      {
        id: 'first_analytics_view',
        condition: (session) => {
          return session.actions.filter(a => a.type === 'page_view' && a.page.includes('/analytics')).length === 1
        },
        suggestion: {
          type: 'tip',
          title: 'Understanding Your Analytics',
          description: 'Here\'s how to interpret your project analytics and use them to improve team productivity.',
          priority: 'low'
        },
        cooldown: 1800000 // 30 minutes
      },

      // Task management patterns
      {
        id: 'multiple_tasks_created',
        condition: (session) => {
          const taskCreations = session.actions.filter(a => 
            a.type === 'click' && a.target?.includes('create-task')
          )
          return taskCreations.length >= 5
        },
        suggestion: {
          type: 'feature',
          title: 'AI Task Suggestions',
          description: 'Did you know I can suggest subtasks and help break down complex tasks automatically?',
          action: 'ai_tasks',
          priority: 'low'
        },
        cooldown: 3600000 // 1 hour
      },

      // Deadline management
      {
        id: 'overdue_tasks_detected',
        condition: (session) => {
          // This would typically check actual data, but for demo purposes:
          return session.actions.filter(a => a.type === 'page_view' && a.page.includes('/tasks')).length >= 3
        },
        suggestion: {
          type: 'action',
          title: 'Manage Overdue Tasks',
          description: 'I noticed some tasks are overdue. Let me help you prioritize and reschedule them.',
          action: 'manage_deadlines',
          priority: 'high'
        },
        cooldown: 1800000 // 30 minutes
      },

      // Feature discovery
      {
        id: 'bulk_actions_opportunity',
        condition: (session) => {
          const multipleSelections = session.actions.filter(a => 
            a.type === 'click' && a.target?.includes('checkbox')
          )
          return multipleSelections.length >= 3
        },
        suggestion: {
          type: 'tip',
          title: 'Bulk Actions Available',
          description: 'You can select multiple items and perform bulk actions like updating status or assigning to team members.',
          priority: 'low'
        },
        cooldown: 1200000 // 20 minutes
      }
    ]
  }

  private startTracking() {
    if (typeof window === 'undefined' || this.isTracking) return

    this.isTracking = true
    this.session = {
      id: `session_${Date.now()}`,
      startTime: Date.now(),
      actions: [],
      currentPage: window.location.pathname,
      timeOnPage: 0,
      scrollDepth: 0,
      lastActionTime: Date.now()
    }

    this.pageStartTime = Date.now()

    // Track page views
    window.addEventListener('popstate', () => {
      this.trackAction('navigation', window.location.pathname)
    })

    // Track clicks
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement
      this.trackAction('click', target.tagName, {
        id: target.id,
        className: target.className,
        text: target.textContent?.slice(0, 50)
      })
    })

    // Track scroll
    window.addEventListener('scroll', () => {
      this.lastScrollTime = Date.now()
      if (this.scrollTimeout) {
        clearTimeout(this.scrollTimeout)
      }
      this.scrollTimeout = setTimeout(() => {
        this.trackAction('scroll', 'page', {
          depth: Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100)
        })
      }, 100)
    })

    // Track form inputs
    document.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement
      this.trackAction('form_input', target.tagName, {
        id: target.id,
        type: target.type,
        value: target.value.slice(0, 20)
      })
    })

    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.updateTimeOnPage()
      } else {
        this.pageStartTime = Date.now()
      }
    })

    // Periodic session update
    setInterval(() => {
      this.updateTimeOnPage()
      this.checkTriggers()
    }, 5000)
  }

  private trackAction(type: UserAction['type'], target: string, data?: any) {
    if (!this.session) return

    const action: UserAction = {
      type,
      target,
      page: window.location.pathname,
      timestamp: Date.now(),
      data
    }

    this.session.actions.push(action)
    this.session.lastActionTime = Date.now()

    // Update current page if navigation
    if (type === 'navigation') {
      this.session.currentPage = target
      this.pageStartTime = Date.now()
    }

    // Check triggers after each action
    setTimeout(() => this.checkTriggers(), 1000)
  }

  private updateTimeOnPage() {
    if (!this.session) return

    const now = Date.now()
    this.session.timeOnPage += now - this.pageStartTime
    this.pageStartTime = now
  }

  private checkTriggers() {
    if (!this.session) return

    const now = Date.now()
    const activeTriggers = this.triggers.filter(trigger => {
      // Check cooldown
      if (trigger.lastTriggered && (now - trigger.lastTriggered) < trigger.cooldown) {
        return false
      }

      // Check condition
      return trigger.condition(this.session!)
    })

    // Trigger the highest priority suggestion
    if (activeTriggers.length > 0) {
      const highestPriority = activeTriggers.reduce((prev, current) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 }
        return priorityOrder[current.suggestion.priority] > priorityOrder[prev.suggestion.priority] 
          ? current 
          : prev
      })

      this.triggerSuggestion(highestPriority)
    }
  }

  private triggerSuggestion(trigger: ContextTrigger) {
    trigger.lastTriggered = Date.now()
    
    // Dispatch custom event for the assistant to listen to
    window.dispatchEvent(new CustomEvent('ai-suggestion', {
      detail: trigger.suggestion
    }))

    console.log('[ContextDetector] Triggered suggestion:', trigger.suggestion.title)
  }

  // Public methods
  public getSession(): UserSession | null {
    return this.session
  }

  public addCustomTrigger(trigger: ContextTrigger) {
    this.triggers.push(trigger)
  }

  public stopTracking() {
    this.isTracking = false
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout)
    }
  }

  public resetSession() {
    this.session = {
      id: `session_${Date.now()}`,
      startTime: Date.now(),
      actions: [],
      currentPage: window.location.pathname,
      timeOnPage: 0,
      scrollDepth: 0,
      lastActionTime: Date.now()
    }
    this.pageStartTime = Date.now()
  }
}

export const contextDetector = new ContextDetector()
