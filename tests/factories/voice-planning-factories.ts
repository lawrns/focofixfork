import { Task, Milestone, PlanDraft } from '@/features/voice/components/VoicePlanningWorkbench'

// Factory for creating test tasks
export const createTask = (overrides: Partial<Task> = {}): Task => {
  const id = overrides.id || `task-${Date.now()}-${Math.random()}`
  return {
    id,
    title: overrides.title || 'Test Task',
    description: overrides.description || 'Test task description',
    status: overrides.status || 'todo',
    estimatedDuration: overrides.estimatedDuration || 3,
    priority: overrides.priority || 'medium',
    assigneeId: overrides.assigneeId || null,
    ...overrides
  }
}

// Factory for creating test milestones
export const createMilestone = (overrides: Partial<Milestone> = {}): Milestone => {
  const id = overrides.id || `milestone-${Date.now()}-${Math.random()}`
  const taskCount = overrides.tasks?.length || 2
  
  return {
    id,
    title: overrides.title || 'Test Milestone',
    description: overrides.description || 'Test milestone description',
    targetDate: overrides.targetDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    status: overrides.status || 'pending',
    tasks: overrides.tasks || Array.from({ length: taskCount }, (_, i) => 
      createTask({
        id: `${id}-task-${i + 1}`,
        title: `Task ${i + 1}`,
        description: `Description for task ${i + 1}`
      })
    ),
    ...overrides
  }
}

// Factory for creating test plan drafts
export const createPlanDraft = (overrides: Partial<PlanDraft> = {}): PlanDraft => {
  const milestoneCount = overrides.milestones?.length || 3
  
  return {
    title: overrides.title || 'Test Project',
    description: overrides.description || 'Test project description',
    milestones: overrides.milestones || Array.from({ length: milestoneCount }, (_, i) => 
      createMilestone({
        id: `milestone-${i + 1}`,
        title: `Milestone ${i + 1}`,
        description: `Description for milestone ${i + 1}`,
        targetDate: new Date(Date.now() + (i + 1) * 7 * 24 * 60 * 60 * 1000).toISOString()
      })
    ),
    ...overrides
  }
}

// Factory for creating transcript data
export const createTranscript = (overrides: Partial<{
  text: string
  confidence: number
  language: string
  duration: number
}> = {}) => {
  return {
    text: overrides.text || 'We need to build a mobile application with user authentication and offline sync capabilities. The project should be completed in 10 weeks with a team of 3 developers.',
    confidence: overrides.confidence || 0.95,
    language: overrides.language || 'en',
    duration: overrides.duration || 45.2
  }
}

// Factory for creating intent extraction results
export const createIntentExtraction = (overrides: Partial<{
  intents: string[]
  timeline: {
    deadline?: string
    mvp?: string
    beta?: string
  }
  team: {
    developers?: number
    designers?: number
    managers?: number
  }
  technologies: string[]
  features: string[]
}> = {}) => {
  return {
    intents: overrides.intents || [
      'mobile application',
      'user authentication',
      'offline sync',
      '10 weeks',
      '3 developers'
    ],
    timeline: overrides.timeline || {
      deadline: '10 weeks',
      mvp: '6 weeks',
      beta: '8 weeks'
    },
    team: overrides.team || {
      developers: 3,
      designers: 1,
      managers: 1
    },
    technologies: overrides.technologies || ['React Native', 'Node.js', 'PostgreSQL'],
    features: overrides.features || ['authentication', 'offline sync', 'real-time updates']
  }
}

// Factory for creating quality gates data
export const createQualityGates = (overrides: Partial<{
  transcriptionConfidence: number
  intentExtraction: number
  planningLatency: number
  overallScore: number
}> = {}) => {
  const transcriptionConfidence = overrides.transcriptionConfidence || 0.95
  const intentExtraction = overrides.intentExtraction || 0.88
  const planningLatency = overrides.planningLatency || 0.75
  
  return {
    transcriptionConfidence,
    intentExtraction,
    planningLatency,
    overallScore: overrides.overallScore || (transcriptionConfidence + intentExtraction + planningLatency) / 3
  }
}

// Factory for creating API responses
export const createTranscriptionResponse = (overrides: Partial<{
  text: string
  confidence: number
  language: string
  duration: number
}> = {}) => {
  return {
    success: true,
    data: createTranscript(overrides)
  }
}

export const createPlanGenerationResponse = (overrides: Partial<{
  plan: PlanDraft
  confidence: number
  processingTime: number
}> = {}) => {
  return {
    success: true,
    data: {
      plan: overrides.plan || createPlanDraft(),
      confidence: overrides.confidence || 0.88,
      processingTime: overrides.processingTime || 2.1
    }
  }
}

export const createErrorResponse = (message: string, status: number = 500) => {
  return {
    success: false,
    error: message,
    status
  }
}

// Factory for creating user data
export const createUser = (overrides: Partial<{
  id: string
  name: string
  email: string
  role: string
}> = {}) => {
  return {
    id: overrides.id || `user-${Date.now()}`,
    name: overrides.name || 'Test User',
    email: overrides.email || 'test@example.com',
    role: overrides.role || 'developer'
  }
}

// Factory for creating audio data
export const createAudioData = (size: number = 1024) => {
  const arrayBuffer = new ArrayBuffer(size)
  const view = new Uint8Array(arrayBuffer)
  for (let i = 0; i < size; i++) {
    view[i] = Math.floor(Math.random() * 256)
  }
  return new Blob([arrayBuffer], { type: 'audio/webm' })
}

// Factory for creating WebSocket messages
export const createWebSocketMessage = (type: string, data: any) => {
  return {
    type,
    timestamp: new Date().toISOString(),
    data
  }
}

// Factory for creating audio visualization data
export const createAudioVisualizationData = (length: number = 128) => {
  return Array.from({ length }, () => Math.random() * 255)
}

// Preset factories for common test scenarios
export const factories = {
  // Simple mobile app project
  simpleMobileApp: () => createPlanDraft({
    title: 'Mobile Task Manager',
    description: 'A simple mobile app for task management',
    milestones: [
      createMilestone({
        title: 'Design Phase',
        tasks: [
          createTask({ title: 'Create wireframes', priority: 'high' }),
          createTask({ title: 'Design mockups', priority: 'medium' })
        ]
      }),
      createMilestone({
        title: 'Development',
        tasks: [
          createTask({ title: 'Setup project', priority: 'high' }),
          createTask({ title: 'Implement authentication', priority: 'high' }),
          createTask({ title: 'Create task management', priority: 'medium' })
        ]
      })
    ]
  }),

  // Complex enterprise project
  enterpriseSystem: () => createPlanDraft({
    title: 'Enterprise Resource Planning System',
    description: 'Comprehensive ERP system for large organizations',
    milestones: Array.from({ length: 5 }, (_, i) => 
      createMilestone({
        title: `Phase ${i + 1}`,
        tasks: Array.from({ length: 8 }, (_, j) => 
          createTask({
            title: `Task ${i + 1}.${j + 1}`,
            priority: j < 3 ? 'high' : j < 6 ? 'medium' : 'low'
          })
        )
      })
    )
  }),

  // Small website project
  smallWebsite: () => createPlanDraft({
    title: 'Company Website',
    description: 'Simple company website with contact form',
    milestones: [
      createMilestone({
        title: 'Design',
        tasks: [
          createTask({ title: 'Create design', priority: 'high' }),
          createTask({ title: 'Get approval', priority: 'medium' })
        ]
      }),
      createMilestone({
        title: 'Development',
        tasks: [
          createTask({ title: 'Setup hosting', priority: 'high' }),
          createTask({ title: 'Build pages', priority: 'high' }),
          createTask({ title: 'Add contact form', priority: 'medium' })
        ]
      })
    ]
  }),

  // Transcript with PII
  transcriptWithPII: () => createTranscript({
    text: 'Contact John Doe at john.doe@example.com or call (555) 123-4567. His SSN is 123-45-6789. We need to build a mobile app for his company.'
  }),

  // Transcript with technical requirements
  technicalTranscript: () => createTranscript({
    text: 'Build a microservices-based application using React, Node.js, PostgreSQL, and Redis. Implement JWT authentication, OAuth2 integration, real-time updates with WebSockets, and deploy to AWS with Docker containers.'
  }),

  // Transcript with tight deadline
  urgentTranscript: () => createTranscript({
    text: 'Emergency project needed ASAP! We need to launch in 2 weeks, MVP in 5 days. This is critical for our business survival. Need 24/7 development until launch.'
  })
}

// Helper functions for test data manipulation
export const helpers = {
  // Add a task to a milestone
  addTaskToMilestone: (milestone: Milestone, task: Task): Milestone => {
    return {
      ...milestone,
      tasks: [...milestone.tasks, task]
    }
  },

  // Remove a task from a milestone
  removeTaskFromMilestone: (milestone: Milestone, taskId: string): Milestone => {
    return {
      ...milestone,
      tasks: milestone.tasks.filter(task => task.id !== taskId)
    }
  },

  // Update a task in a milestone
  updateTaskInMilestone: (milestone: Milestone, taskId: string, updates: Partial<Task>): Milestone => {
    return {
      ...milestone,
      tasks: milestone.tasks.map(task => 
        task.id === taskId ? { ...task, ...updates } : task
      )
    }
  },

  // Add a milestone to a plan
  addMilestoneToPlan: (plan: PlanDraft, milestone: Milestone): PlanDraft => {
    return {
      ...plan,
      milestones: [...plan.milestones, milestone]
    }
  },

  // Calculate total estimated duration for a plan
  calculateTotalDuration: (plan: PlanDraft): number => {
    return plan.milestones.reduce((total, milestone) => {
      return total + milestone.tasks.reduce((milestoneTotal, task) => {
        return milestoneTotal + task.estimatedDuration
      }, 0)
    }, 0)
  },

  // Get high priority tasks from a plan
  getHighPriorityTasks: (plan: PlanDraft): Task[] => {
    return plan.milestones.flatMap(milestone => 
      milestone.tasks.filter(task => task.priority === 'high')
    )
  },

  // Get completed tasks from a plan
  getCompletedTasks: (plan: PlanDraft): Task[] => {
    return plan.milestones.flatMap(milestone => 
      milestone.tasks.filter(task => task.status === 'done')
    )
  },

  // Mark all tasks in a milestone as complete
  completeMilestone: (milestone: Milestone): Milestone => {
    return {
      ...milestone,
      tasks: milestone.tasks.map(task => ({ ...task, status: 'done' as const })),
      status: 'completed' as const
    }
  }
}

export default {
  createTask,
  createMilestone,
  createPlanDraft,
  createTranscript,
  createIntentExtraction,
  createQualityGates,
  createTranscriptionResponse,
  createPlanGenerationResponse,
  createErrorResponse,
  createUser,
  createAudioData,
  createWebSocketMessage,
  createAudioVisualizationData,
  factories,
  helpers
}
