'use client'

interface Suggestion {
  id: string
  type: 'tip' | 'action' | 'feature'
  title: string
  description: string
  action?: string
  priority: 'low' | 'medium' | 'high'
  category: 'onboarding' | 'productivity' | 'collaboration' | 'analytics' | 'optimization'
  icon?: string
  dismissible: boolean
  expiresAt?: number
}

interface UserPreferences {
  dismissedSuggestions: Set<string>
  completedActions: Set<string>
  userLevel: 'beginner' | 'intermediate' | 'advanced'
  interests: string[]
  lastActive: number
}

interface SuggestionRule {
  id: string
  condition: (context: any) => boolean
  suggestion: Omit<Suggestion, 'id'>
  cooldown: number
  lastTriggered?: number
}

class SuggestionEngine {
  private suggestions: Suggestion[] = []
  private userPreferences: UserPreferences
  private rules: SuggestionRule[] = []
  private listeners: Array<(suggestion: Suggestion) => void> = []

  constructor() {
    this.userPreferences = {
      dismissedSuggestions: new Set(),
      completedActions: new Set(),
      userLevel: 'beginner',
      interests: [],
      lastActive: Date.now()
    }

    this.loadUserPreferences()
    this.initializeRules()
  }

  private loadUserPreferences() {
    if (typeof window === 'undefined') return

    try {
      const saved = localStorage.getItem('foco-ai-preferences')
      if (saved) {
        const parsed = JSON.parse(saved)
        this.userPreferences = {
          ...this.userPreferences,
          ...parsed,
          dismissedSuggestions: new Set(parsed.dismissedSuggestions || []),
          completedActions: new Set(parsed.completedActions || [])
        }
      }
    } catch (error) {
      console.error('[SuggestionEngine] Failed to load preferences:', error)
    }
  }

  private saveUserPreferences() {
    if (typeof window === 'undefined') return

    try {
      const toSave = {
        ...this.userPreferences,
        dismissedSuggestions: Array.from(this.userPreferences.dismissedSuggestions),
        completedActions: Array.from(this.userPreferences.completedActions)
      }
      localStorage.setItem('foco-ai-preferences', JSON.stringify(toSave))
    } catch (error) {
      console.error('[SuggestionEngine] Failed to save preferences:', error)
    }
  }

  private initializeRules() {
    this.rules = [
      // Onboarding suggestions
      {
        id: 'welcome_tour',
        condition: (context) => {
          return context.isNewUser && 
                 !this.userPreferences.completedActions.has('tour_completed') &&
                 context.timeOnSite < 300000 // 5 minutes
        },
        suggestion: {
          type: 'action',
          title: 'Take a Quick Tour',
          description: 'Let me show you around Foco! I\'ll guide you through the key features in just 2 minutes.',
          action: 'start_tour',
          priority: 'high',
          category: 'onboarding',
          icon: 'compass',
          dismissible: true
        },
        cooldown: 0
      },

      {
        id: 'create_first_project',
        condition: (context) => {
          return context.projectsCount === 0 && 
                 context.timeOnSite > 60000 && // 1 minute
                 !this.userPreferences.completedActions.has('first_project_created')
        },
        suggestion: {
          type: 'action',
          title: 'Create Your First Project',
          description: 'Start by creating a project. I can help you set it up with templates and best practices.',
          action: 'create_project',
          priority: 'high',
          category: 'onboarding',
          icon: 'folder-plus',
          dismissible: false
        },
        cooldown: 300000 // 5 minutes
      },

      // Productivity suggestions
      {
        id: 'add_tasks_to_project',
        condition: (context) => {
          return context.projectsCount > 0 && 
                 context.tasksCount === 0 &&
                 context.timeOnSite > 120000 // 2 minutes
        },
        suggestion: {
          type: 'tip',
          title: 'Break Down Your Project',
          description: 'Projects work better with tasks. Break your project into actionable steps to track progress effectively.',
          action: 'add_tasks',
          priority: 'medium',
          category: 'productivity',
          icon: 'list',
          dismissible: true
        },
        cooldown: 600000 // 10 minutes
      },

      {
        id: 'set_deadlines',
        condition: (context) => {
          return context.tasksCount > 0 && 
                 context.tasksWithoutDeadlines > context.tasksCount * 0.5
        },
        suggestion: {
          type: 'tip',
          title: 'Set Task Deadlines',
          description: 'Deadlines help keep projects on track. Set realistic due dates for your tasks to improve productivity.',
          action: 'set_deadlines',
          priority: 'medium',
          category: 'productivity',
          icon: 'calendar',
          dismissible: true
        },
        cooldown: 900000 // 15 minutes
      },

      // Collaboration suggestions
      {
        id: 'invite_team_members',
        condition: (context) => {
          return context.projectsCount > 0 && 
                 context.teamMembersCount === 0 &&
                 context.timeOnSite > 300000 // 5 minutes
        },
        suggestion: {
          type: 'feature',
          title: 'Invite Your Team',
          description: 'Collaboration makes projects more successful. Invite team members to work together and share progress.',
          action: 'invite_team',
          priority: 'medium',
          category: 'collaboration',
          icon: 'users',
          dismissible: true
        },
        cooldown: 1200000 // 20 minutes
      },

      {
        id: 'use_ai_features',
        condition: (context) => {
          return context.tasksCount >= 5 && 
                 !this.userPreferences.completedActions.has('ai_features_used')
        },
        suggestion: {
          type: 'feature',
          title: 'Try AI-Powered Features',
          description: 'Let AI help you create tasks, suggest improvements, and analyze your project performance.',
          action: 'explore_ai',
          priority: 'low',
          category: 'productivity',
          icon: 'sparkles',
          dismissible: true
        },
        cooldown: 1800000 // 30 minutes
      },

      // Analytics suggestions
      {
        id: 'view_analytics',
        condition: (context) => {
          return context.tasksCount >= 10 && 
                 !this.userPreferences.completedActions.has('analytics_viewed')
        },
        suggestion: {
          type: 'tip',
          title: 'Check Your Progress',
          description: 'See how your team is performing with detailed analytics and insights.',
          action: 'view_analytics',
          priority: 'low',
          category: 'analytics',
          icon: 'bar-chart',
          dismissible: true
        },
        cooldown: 3600000 // 1 hour
      },

      // Optimization suggestions
      {
        id: 'organize_projects',
        condition: (context) => {
          return context.projectsCount >= 5 && 
                 context.unorganizedProjects > context.projectsCount * 0.3
        },
        suggestion: {
          type: 'tip',
          title: 'Organize Your Projects',
          description: 'Keep your workspace tidy by organizing projects into folders and using tags.',
          action: 'organize_projects',
          priority: 'low',
          category: 'optimization',
          icon: 'folder',
          dismissible: true
        },
        cooldown: 1800000 // 30 minutes
      },

      {
        id: 'use_keyboard_shortcuts',
        condition: (context) => {
          return context.userLevel === 'intermediate' && 
                 context.keyboardUsage < 0.1 // Less than 10% keyboard usage
        },
        suggestion: {
          type: 'tip',
          title: 'Speed Up with Shortcuts',
          description: 'Learn keyboard shortcuts to work faster and more efficiently.',
          action: 'learn_shortcuts',
          priority: 'low',
          category: 'optimization',
          icon: 'keyboard',
          dismissible: true
        },
        cooldown: 3600000 // 1 hour
      }
    ]
  }

  public generateSuggestions(context: any): Suggestion[] {
    const now = Date.now()
    const activeSuggestions: Suggestion[] = []

    for (const rule of this.rules) {
      // Check cooldown
      if (rule.lastTriggered && (now - rule.lastTriggered) < rule.cooldown) {
        continue
      }

      // Check if already dismissed
      if (this.userPreferences.dismissedSuggestions.has(rule.id)) {
        continue
      }

      // Check if action already completed
      if (rule.suggestion.action && this.userPreferences.completedActions.has(rule.suggestion.action)) {
        continue
      }

      // Check condition
      if (rule.condition(context)) {
        const suggestion: Suggestion = {
          id: rule.id,
          ...rule.suggestion,
          expiresAt: now + (rule.cooldown || 3600000) // Default 1 hour expiry
        }

        activeSuggestions.push(suggestion)
        rule.lastTriggered = now
      }
    }

    // Sort by priority
    activeSuggestions.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })

    // Limit to max 3 suggestions
    return activeSuggestions.slice(0, 3)
  }

  public dismissSuggestion(suggestionId: string) {
    this.userPreferences.dismissedSuggestions.add(suggestionId)
    this.saveUserPreferences()
  }

  public completeAction(actionId: string) {
    this.userPreferences.completedActions.add(actionId)
    this.saveUserPreferences()
  }

  public updateUserLevel(level: 'beginner' | 'intermediate' | 'advanced') {
    this.userPreferences.userLevel = level
    this.saveUserPreferences()
  }

  public addInterest(interest: string) {
    if (!this.userPreferences.interests.includes(interest)) {
      this.userPreferences.interests.push(interest)
      this.saveUserPreferences()
    }
  }

  public subscribe(listener: (suggestion: Suggestion) => void) {
    this.listeners.push(listener)
  }

  public unsubscribe(listener: (suggestion: Suggestion) => void) {
    this.listeners = this.listeners.filter(l => l !== listener)
  }

  private notifyListeners(suggestion: Suggestion) {
    this.listeners.forEach(listener => listener(suggestion))
  }

  public triggerSuggestion(suggestion: Suggestion) {
    this.notifyListeners(suggestion)
  }

  public getActiveSuggestions(): Suggestion[] {
    const now = Date.now()
    return this.suggestions.filter(s => 
      !s.expiresAt || s.expiresAt > now
    )
  }

  public clearExpiredSuggestions() {
    const now = Date.now()
    this.suggestions = this.suggestions.filter(s => 
      !s.expiresAt || s.expiresAt > now
    )
  }

  public reset() {
    this.userPreferences = {
      dismissedSuggestions: new Set(),
      completedActions: new Set(),
      userLevel: 'beginner',
      interests: [],
      lastActive: Date.now()
    }
    this.suggestions = []
    this.saveUserPreferences()
  }
}

export const suggestionEngine = new SuggestionEngine()
