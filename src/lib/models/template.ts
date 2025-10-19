export type TemplateType = 'project' | 'board' | 'card'

export type TemplateCategory = 'marketing' | 'engineering' | 'design' | 'sales' | 'personal' | 'general'

export interface ProjectTemplate {
  id: string
  name: string
  description: string
  category: TemplateCategory
  type: TemplateType
  data: {
    // Project structure
    name: string
    description?: string
    status: string
    priority: 'low' | 'medium' | 'high' | 'urgent'
    
    // Columns/Statuses
    columns: Array<{
      id: string
      name: string
      position: number
      color?: string
    }>
    
    // Sample cards/tasks
    cards: Array<{
      id: string
      title: string
      description?: string
      status: string
      priority: 'low' | 'medium' | 'high' | 'urgent'
      due_date?: string
      assignee?: string
      labels?: string[]
      checklist?: Array<{
        text: string
        completed: boolean
      }>
      attachments?: string[]
    }>
    
    // Labels
    labels: Array<{
      id: string
      name: string
      color: string
    }>
    
    // Settings
    settings?: {
      default_view?: 'table' | 'kanban' | 'gantt'
      auto_assign?: boolean
      notifications?: boolean
    }
  }
  is_public: boolean
  created_by: string
  created_at: string
  updated_at: string
  usage_count?: number
  rating?: number
  tags?: string[]
  thumbnail?: string
}

export interface TemplateMetadata {
  id: string
  name: string
  description: string
  category: TemplateCategory
  type: TemplateType
  is_public: boolean
  created_by: string
  created_at: string
  updated_at: string
  usage_count: number
  rating: number
  tags: string[]
  thumbnail?: string
}

// Predefined project templates
export const PREDEFINED_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'agile-sprint',
    name: 'Agile Sprint Board',
    description: 'Complete agile sprint setup with user stories, tasks, and sprint planning',
    category: 'engineering',
    type: 'project',
    data: {
      name: 'Sprint Board',
      description: 'Agile sprint management with user stories and tasks',
      status: 'active',
      priority: 'high',
      columns: [
        { id: 'backlog', name: 'Backlog', position: 0, color: '#6b7280' },
        { id: 'todo', name: 'To Do', position: 1, color: '#3b82f6' },
        { id: 'in-progress', name: 'In Progress', position: 2, color: '#f59e0b' },
        { id: 'review', name: 'Review', position: 3, color: '#8b5cf6' },
        { id: 'done', name: 'Done', position: 4, color: '#10b981' }
      ],
      cards: [
        {
          id: 'story-1',
          title: 'User Authentication System',
          description: 'Implement secure user login and registration',
          status: 'todo',
          priority: 'high',
          labels: ['backend', 'security'],
          checklist: [
            { text: 'Design database schema', completed: false },
            { text: 'Implement JWT tokens', completed: false },
            { text: 'Add password hashing', completed: false },
            { text: 'Write unit tests', completed: false }
          ]
        },
        {
          id: 'story-2',
          title: 'Dashboard UI Components',
          description: 'Create reusable dashboard components',
          status: 'in-progress',
          priority: 'medium',
          labels: ['frontend', 'ui'],
          checklist: [
            { text: 'Design component library', completed: true },
            { text: 'Implement base components', completed: false },
            { text: 'Add responsive design', completed: false }
          ]
        },
        {
          id: 'story-3',
          title: 'API Documentation',
          description: 'Document all API endpoints',
          status: 'done',
          priority: 'low',
          labels: ['documentation']
        }
      ],
      labels: [
        { id: 'backend', name: 'Backend', color: '#ef4444' },
        { id: 'frontend', name: 'Frontend', color: '#3b82f6' },
        { id: 'ui', name: 'UI/UX', color: '#8b5cf6' },
        { id: 'security', name: 'Security', color: '#f59e0b' },
        { id: 'documentation', name: 'Documentation', color: '#10b981' }
      ],
      settings: {
        default_view: 'kanban',
        auto_assign: false,
        notifications: true
      }
    },
    is_public: true,
    created_by: 'system',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    usage_count: 0,
    rating: 4.8,
    tags: ['agile', 'sprint', 'scrum', 'development']
  },
  {
    id: 'content-calendar',
    name: 'Content Calendar',
    description: 'Plan and manage content creation across all channels',
    category: 'marketing',
    type: 'project',
    data: {
      name: 'Content Calendar',
      description: 'Plan and schedule content across all marketing channels',
      status: 'active',
      priority: 'medium',
      columns: [
        { id: 'ideas', name: 'Ideas', position: 0, color: '#6b7280' },
        { id: 'planned', name: 'Planned', position: 1, color: '#3b82f6' },
        { id: 'in-creation', name: 'In Creation', position: 2, color: '#f59e0b' },
        { id: 'review', name: 'Review', position: 3, color: '#8b5cf6' },
        { id: 'published', name: 'Published', position: 4, color: '#10b981' }
      ],
      cards: [
        {
          id: 'content-1',
          title: 'Q1 Product Launch Blog Post',
          description: 'Comprehensive blog post about our new product features',
          status: 'planned',
          priority: 'high',
          due_date: '2024-03-15',
          labels: ['blog', 'product'],
          checklist: [
            { text: 'Research competitor analysis', completed: false },
            { text: 'Write first draft', completed: false },
            { text: 'Design graphics', completed: false },
            { text: 'SEO optimization', completed: false }
          ]
        },
        {
          id: 'content-2',
          title: 'Social Media Campaign',
          description: 'Launch social media campaign for brand awareness',
          status: 'in-creation',
          priority: 'medium',
          labels: ['social', 'campaign']
        }
      ],
      labels: [
        { id: 'blog', name: 'Blog', color: '#ef4444' },
        { id: 'social', name: 'Social Media', color: '#3b82f6' },
        { id: 'email', name: 'Email', color: '#8b5cf6' },
        { id: 'video', name: 'Video', color: '#f59e0b' },
        { id: 'product', name: 'Product', color: '#10b981' },
        { id: 'campaign', name: 'Campaign', color: '#ec4899' }
      ],
      settings: {
        default_view: 'kanban',
        auto_assign: true,
        notifications: true
      }
    },
    is_public: true,
    created_by: 'system',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    usage_count: 0,
    rating: 4.6,
    tags: ['content', 'marketing', 'calendar', 'social-media']
  },
  {
    id: 'bug-tracking',
    name: 'Bug Tracking',
    description: 'Track and manage software bugs and issues',
    category: 'engineering',
    type: 'project',
    data: {
      name: 'Bug Tracking',
      description: 'Comprehensive bug tracking and issue management',
      status: 'active',
      priority: 'high',
      columns: [
        { id: 'reported', name: 'Reported', position: 0, color: '#ef4444' },
        { id: 'confirmed', name: 'Confirmed', position: 1, color: '#f59e0b' },
        { id: 'in-progress', name: 'In Progress', position: 2, color: '#3b82f6' },
        { id: 'testing', name: 'Testing', position: 3, color: '#8b5cf6' },
        { id: 'resolved', name: 'Resolved', position: 4, color: '#10b981' }
      ],
      cards: [
        {
          id: 'bug-1',
          title: 'Login page crashes on mobile',
          description: 'Users report app crashes when trying to login on mobile devices',
          status: 'confirmed',
          priority: 'urgent',
          labels: ['mobile', 'critical'],
          checklist: [
            { text: 'Reproduce the issue', completed: true },
            { text: 'Identify root cause', completed: false },
            { text: 'Implement fix', completed: false },
            { text: 'Test on multiple devices', completed: false }
          ]
        },
        {
          id: 'bug-2',
          title: 'Slow page load times',
          description: 'Dashboard takes too long to load',
          status: 'in-progress',
          priority: 'medium',
          labels: ['performance']
        }
      ],
      labels: [
        { id: 'critical', name: 'Critical', color: '#ef4444' },
        { id: 'high', name: 'High', color: '#f59e0b' },
        { id: 'medium', name: 'Medium', color: '#3b82f6' },
        { id: 'low', name: 'Low', color: '#10b981' },
        { id: 'mobile', name: 'Mobile', color: '#8b5cf6' },
        { id: 'performance', name: 'Performance', color: '#ec4899' }
      ],
      settings: {
        default_view: 'table',
        auto_assign: true,
        notifications: true
      }
    },
    is_public: true,
    created_by: 'system',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    usage_count: 0,
    rating: 4.7,
    tags: ['bugs', 'issues', 'tracking', 'quality-assurance']
  },
  {
    id: 'event-planning',
    name: 'Event Planning',
    description: 'Plan and manage events from conception to execution',
    category: 'general',
    type: 'project',
    data: {
      name: 'Event Planning',
      description: 'Complete event planning and management workflow',
      status: 'active',
      priority: 'medium',
      columns: [
        { id: 'planning', name: 'Planning', position: 0, color: '#6b7280' },
        { id: 'preparation', name: 'Preparation', position: 1, color: '#3b82f6' },
        { id: 'execution', name: 'Execution', position: 2, color: '#f59e0b' },
        { id: 'follow-up', name: 'Follow-up', position: 3, color: '#8b5cf6' },
        { id: 'completed', name: 'Completed', position: 4, color: '#10b981' }
      ],
      cards: [
        {
          id: 'event-1',
          title: 'Venue Booking',
          description: 'Book venue for the annual company retreat',
          status: 'preparation',
          priority: 'high',
          due_date: '2024-02-28',
          labels: ['venue', 'logistics']
        },
        {
          id: 'event-2',
          title: 'Catering Arrangements',
          description: 'Arrange catering for 200 people',
          status: 'planning',
          priority: 'medium',
          labels: ['catering', 'logistics']
        }
      ],
      labels: [
        { id: 'venue', name: 'Venue', color: '#ef4444' },
        { id: 'catering', name: 'Catering', color: '#f59e0b' },
        { id: 'logistics', name: 'Logistics', color: '#3b82f6' },
        { id: 'marketing', name: 'Marketing', color: '#8b5cf6' },
        { id: 'budget', name: 'Budget', color: '#10b981' }
      ],
      settings: {
        default_view: 'kanban',
        auto_assign: false,
        notifications: true
      }
    },
    is_public: true,
    created_by: 'system',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    usage_count: 0,
    rating: 4.5,
    tags: ['events', 'planning', 'management', 'logistics']
  },
  {
    id: 'product-roadmap',
    name: 'Product Roadmap',
    description: 'Plan and track product development roadmap',
    category: 'engineering',
    type: 'project',
    data: {
      name: 'Product Roadmap',
      description: 'Strategic product development and feature planning',
      status: 'active',
      priority: 'high',
      columns: [
        { id: 'discovery', name: 'Discovery', position: 0, color: '#6b7280' },
        { id: 'planned', name: 'Planned', position: 1, color: '#3b82f6' },
        { id: 'in-development', name: 'In Development', position: 2, color: '#f59e0b' },
        { id: 'testing', name: 'Testing', position: 3, color: '#8b5cf6' },
        { id: 'released', name: 'Released', position: 4, color: '#10b981' }
      ],
      cards: [
        {
          id: 'feature-1',
          title: 'Advanced Analytics Dashboard',
          description: 'Build comprehensive analytics dashboard for users',
          status: 'planned',
          priority: 'high',
          labels: ['analytics', 'dashboard'],
          checklist: [
            { text: 'Define requirements', completed: true },
            { text: 'Design mockups', completed: false },
            { text: 'Implement backend', completed: false },
            { text: 'Build frontend', completed: false }
          ]
        },
        {
          id: 'feature-2',
          title: 'Mobile App',
          description: 'Develop native mobile application',
          status: 'discovery',
          priority: 'medium',
          labels: ['mobile', 'app']
        }
      ],
      labels: [
        { id: 'analytics', name: 'Analytics', color: '#ef4444' },
        { id: 'dashboard', name: 'Dashboard', color: '#3b82f6' },
        { id: 'mobile', name: 'Mobile', color: '#8b5cf6' },
        { id: 'api', name: 'API', color: '#f59e0b' },
        { id: 'ui', name: 'UI/UX', color: '#10b981' }
      ],
      settings: {
        default_view: 'kanban',
        auto_assign: true,
        notifications: true
      }
    },
    is_public: true,
    created_by: 'system',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    usage_count: 0,
    rating: 4.9,
    tags: ['product', 'roadmap', 'features', 'development']
  },
  {
    id: 'sales-pipeline',
    name: 'Sales Pipeline',
    description: 'Track leads and manage sales opportunities',
    category: 'sales',
    type: 'project',
    data: {
      name: 'Sales Pipeline',
      description: 'Complete sales process from lead to close',
      status: 'active',
      priority: 'high',
      columns: [
        { id: 'leads', name: 'Leads', position: 0, color: '#6b7280' },
        { id: 'qualified', name: 'Qualified', position: 1, color: '#3b82f6' },
        { id: 'proposal', name: 'Proposal', position: 2, color: '#f59e0b' },
        { id: 'negotiation', name: 'Negotiation', position: 3, color: '#8b5cf6' },
        { id: 'closed', name: 'Closed', position: 4, color: '#10b981' }
      ],
      cards: [
        {
          id: 'lead-1',
          title: 'Enterprise Client - TechCorp',
          description: 'Large enterprise client interested in our platform',
          status: 'proposal',
          priority: 'high',
          labels: ['enterprise', 'high-value'],
          checklist: [
            { text: 'Initial discovery call', completed: true },
            { text: 'Send proposal', completed: false },
            { text: 'Schedule demo', completed: false },
            { text: 'Follow up', completed: false }
          ]
        },
        {
          id: 'lead-2',
          title: 'SMB Client - StartupXYZ',
          description: 'Small business looking for basic features',
          status: 'qualified',
          priority: 'medium',
          labels: ['smb', 'basic']
        }
      ],
      labels: [
        { id: 'enterprise', name: 'Enterprise', color: '#ef4444' },
        { id: 'smb', name: 'SMB', color: '#3b82f6' },
        { id: 'high-value', name: 'High Value', color: '#f59e0b' },
        { id: 'basic', name: 'Basic', color: '#8b5cf6' },
        { id: 'renewal', name: 'Renewal', color: '#10b981' }
      ],
      settings: {
        default_view: 'kanban',
        auto_assign: true,
        notifications: true
      }
    },
    is_public: true,
    created_by: 'system',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    usage_count: 0,
    rating: 4.6,
    tags: ['sales', 'pipeline', 'leads', 'crm']
  }
]

export function getTemplatesByCategory(category: TemplateCategory): ProjectTemplate[] {
  return PREDEFINED_TEMPLATES.filter(template => template.category === category)
}

export function getTemplatesByType(type: TemplateType): ProjectTemplate[] {
  return PREDEFINED_TEMPLATES.filter(template => template.type === type)
}

export function searchTemplates(query: string): ProjectTemplate[] {
  const lowercaseQuery = query.toLowerCase()
  return PREDEFINED_TEMPLATES.filter(template => 
    template.name.toLowerCase().includes(lowercaseQuery) ||
    template.description.toLowerCase().includes(lowercaseQuery) ||
    template.tags?.some(tag => tag.toLowerCase().includes(lowercaseQuery))
  )
}

export function getPopularTemplates(limit: number = 6): ProjectTemplate[] {
  return PREDEFINED_TEMPLATES
    .sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0))
    .slice(0, limit)
}

export function getHighestRatedTemplates(limit: number = 6): ProjectTemplate[] {
  return PREDEFINED_TEMPLATES
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, limit)
}
