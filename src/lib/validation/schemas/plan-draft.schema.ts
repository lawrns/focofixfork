import { z } from 'zod'

/**
 * Canonical Zod schemas for voice-generated plan drafts v1.0.0
 * Matches the JSON Schema in schemas/plan-draft.v1.json
 */

// Base enums for consistency across the system
export const TaskStatusSchema = z.enum(['backlog', 'next', 'in_progress', 'review', 'blocked', 'done'])
export const PrioritySchema = z.enum(['urgent', 'high', 'medium', 'low', 'none'])
export const LanguageCodeSchema = z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/)

// Task definition schema
export const TaskSchema = z.object({
  title: z.string()
    .min(1, 'Task title is required')
    .max(200, 'Task title must be less than 200 characters')
    .regex(/^[A-Za-z0-9\s\-_()&]+$/, 'Task title contains invalid characters'),
  
  description: z.string()
    .max(2000, 'Task description must be less than 2000 characters')
    .optional(),
  
  status: TaskStatusSchema.default('backlog'),
  priority: PrioritySchema.default('none'),
  
  assignee_hint: z.string()
    .max(100, 'Assignee hint must be less than 100 characters')
    .nullable()
    .optional(),
  
  estimate_hours: z.number()
    .min(0, 'Estimate must be positive')
    .max(1000, 'Estimate must be less than 1000 hours')
    .multipleOf(0.5, 'Estimate must be in 0.5 hour increments')
    .nullable()
    .optional(),
  
  actual_hours: z.number()
    .min(0, 'Actual hours must be positive')
    .max(1000, 'Actual hours must be less than 1000 hours')
    .multipleOf(0.5, 'Actual hours must be in 0.5 hour increments')
    .nullable()
    .optional(),
  
  due_date: z.string()
    .datetime('Invalid datetime format')
    .nullable()
    .optional(),
  
  depends_on: z.array(z.string()
    .min(1, 'Dependency task title cannot be empty')
    .max(200, 'Dependency task title too long'))
    .max(10, 'Cannot have more than 10 dependencies')
    .default([]),
  
  tags: z.array(z.string()
    .min(1, 'Tag cannot be empty')
    .max(50, 'Tag must be less than 50 characters')
    .regex(/^[a-z0-9\-_]+$/, 'Tag must contain only lowercase letters, numbers, hyphens, and underscores'))
    .max(10, 'Cannot have more than 10 tags')
    .default([]),
  
  acceptance_criteria: z.array(z.string()
    .min(1, 'Acceptance criterion cannot be empty')
    .max(500, 'Acceptance criterion must be less than 500 characters'))
    .max(10, 'Cannot have more than 10 acceptance criteria')
    .optional()
})

// Milestone definition schema
export const MilestoneSchema = z.object({
  title: z.string()
    .min(3, 'Milestone title must be at least 3 characters')
    .max(200, 'Milestone title must be less than 200 characters')
    .regex(/^[A-Za-z0-9\s\-_()&]+$/, 'Milestone title contains invalid characters'),
  
  description: z.string()
    .max(1000, 'Milestone description must be less than 1000 characters')
    .optional(),
  
  start_date: z.string()
    .datetime('Invalid start date format')
    .nullable()
    .optional(),
  
  due_date: z.string()
    .datetime('Invalid due date format')
    .nullable()
    .optional(),
  
  priority: PrioritySchema.default('none'),
  status: TaskStatusSchema.default('backlog'),
  
  progress_percentage: z.number()
    .min(0, 'Progress must be between 0 and 100')
    .max(100, 'Progress must be between 0 and 100')
    .default(0),
  
  tasks: z.array(TaskSchema)
    .min(1, 'Each milestone must have at least one task')
    .max(50, 'Each milestone can have at most 50 tasks')
})

// Project definition schema
export const ProjectSchema = z.object({
  title: z.string()
    .min(3, 'Project title must be at least 3 characters')
    .max(200, 'Project title must be less than 200 characters')
    .regex(/^[A-Za-z0-9\s\-_()&]+$/, 'Project title contains invalid characters'),
  
  description: z.string()
    .min(1, 'Project description is required')
    .max(2000, 'Project description must be less than 2000 characters'),
  
  start_date: z.string()
    .datetime('Invalid start date format')
    .nullable()
    .optional(),
  
  due_date: z.string()
    .datetime('Invalid due date format')
    .nullable()
    .optional(),
  
  priority: PrioritySchema.default('medium'),
  
  estimated_budget: z.number()
    .min(0, 'Budget must be positive')
    .max(999999999, 'Budget exceeds maximum limit')
    .nullable()
    .optional(),
  
  tags: z.array(z.string()
    .min(1, 'Tag cannot be empty')
    .max(50, 'Tag must be less than 50 characters')
    .regex(/^[a-z0-9\-_]+$/, 'Tag must contain only lowercase letters, numbers, hyphens, and underscores'))
    .max(10, 'Cannot have more than 10 tags')
    .optional()
})

// Metadata schema
export const PlanMetadataSchema = z.object({
  confidence_score: z.number()
    .min(0.0, 'Confidence score must be between 0.0 and 1.0')
    .max(1.0, 'Confidence score must be between 0.0 and 1.0')
    .optional(),
  
  processing_time_ms: z.number()
    .min(0, 'Processing time must be positive')
    .max(60000, 'Processing time exceeds maximum limit')
    .optional(),
  
  ai_model_version: z.string()
    .regex(/^[a-z0-9\-.]+$/, 'Invalid AI model version format')
    .optional(),
  
  language: LanguageCodeSchema.optional(),
  
  transcript_length: z.number()
    .min(1, 'Transcript length must be positive')
    .max(10000, 'Transcript length exceeds maximum')
    .optional(),
  
  complexity_score: z.number()
    .min(1, 'Complexity score must be between 1 and 10')
    .max(10, 'Complexity score must be between 1 and 10')
    .optional()
})

// Main plan draft schema
export const PlanDraftSchema = z.object({
  schema_version: z.literal('1.0.0'),
  
  project: ProjectSchema,
  
  milestones: z.array(MilestoneSchema)
    .min(1, 'Plan must have at least one milestone')
    .max(20, 'Plan cannot have more than 20 milestones'),
  
  risks: z.array(z.string()
    .min(1, 'Risk cannot be empty')
    .max(500, 'Risk must be less than 500 characters'))
    .max(20, 'Cannot have more than 20 risks')
    .default([]),
  
  assumptions: z.array(z.string()
    .min(1, 'Assumption cannot be empty')
    .max(500, 'Assumption must be less than 500 characters'))
    .max(20, 'Cannot have more than 20 assumptions')
    .default([]),
  
  open_questions: z.array(z.string()
    .min(1, 'Question cannot be empty')
    .max(500, 'Question must be less than 500 characters'))
    .max(20, 'Cannot have more than 20 questions')
    .default([]),
  
  metadata: PlanMetadataSchema.optional()
})

// Custom refinements for business logic
export const PlanDraftSchemaWithValidation = PlanDraftSchema
  .refine((data) => {
    // Validate date consistency
    if (data.project.start_date && data.project.due_date) {
      return new Date(data.project.due_date) >= new Date(data.project.start_date)
    }
    return true
  }, {
    message: 'Project due date must be after start date',
    path: ['project', 'due_date']
  })
  .refine((data) => {
    // Validate milestone dates are within project dates
    const projectStart = data.project.start_date ? new Date(data.project.start_date) : null
    const projectEnd = data.project.due_date ? new Date(data.project.due_date) : null
    
    return data.milestones.every(milestone => {
      const milestoneStart = milestone.start_date ? new Date(milestone.start_date) : null
      const milestoneEnd = milestone.due_date ? new Date(milestone.due_date) : null
      
      // Check milestone dates are within project dates
      if (projectStart && milestoneStart && milestoneStart < projectStart) {
        return false
      }
      if (projectEnd && milestoneEnd && milestoneEnd > projectEnd) {
        return false
      }
      
      // Check milestone internal date consistency
      if (milestoneStart && milestoneEnd && milestoneEnd < milestoneStart) {
        return false
      }
      
      return true
    })
  }, {
    message: 'Milestone dates must be within project date range and internally consistent',
    path: ['milestones']
  })
  .refine((data) => {
    // Validate task dependencies exist within the plan
    const allTaskTitles = new Set<string>()
    data.milestones.forEach(milestone => {
      milestone.tasks.forEach(task => {
        allTaskTitles.add(task.title)
      })
    })
    
    return data.milestones.every(milestone => {
      return milestone.tasks.every(task => {
        return task.depends_on.every(dep => allTaskTitles.has(dep))
      })
    })
  }, {
    message: 'Task dependencies must reference existing tasks within the plan',
    path: ['milestones']
  })
  .refine((data) => {
    // Check for circular dependencies
    const taskGraph = new Map<string, string[]>()
    
    // Build dependency graph
    data.milestones.forEach(milestone => {
      milestone.tasks.forEach(task => {
        taskGraph.set(task.title, task.depends_on)
      })
    })
    
    // Check for cycles using DFS
    const visited = new Set<string>()
    const recursionStack = new Set<string>()
    
    function hasCycle(task: string): boolean {
      if (recursionStack.has(task)) return true
      if (visited.has(task)) return false
      
      visited.add(task)
      recursionStack.add(task)
      
      const dependencies = taskGraph.get(task) || []
      for (const dep of dependencies) {
        if (hasCycle(dep)) return true
      }
      
      recursionStack.delete(task)
      return false
    }
    
    for (const task of taskGraph.keys()) {
      if (!visited.has(task) && hasCycle(task)) {
        return false
      }
    }
    
    return true
  }, {
    message: 'Circular dependencies detected in task relationships',
    path: ['milestones']
  })

// Type exports for TypeScript
export type PlanDraft = z.infer<typeof PlanDraftSchemaWithValidation>
export type Task = z.infer<typeof TaskSchema>
export type Milestone = z.infer<typeof MilestoneSchema>
export type Project = z.infer<typeof ProjectSchema>
export type PlanMetadata = z.infer<typeof PlanMetadataSchema>

// Validation helper functions
export class PlanDraftValidator {
  static validate(json: unknown): PlanDraft {
    return PlanDraftSchemaWithValidation.parse(json)
  }
  
  static safeValidate(json: unknown): { success: true; data: PlanDraft } | { success: false; error: z.ZodError } {
    const result = PlanDraftSchemaWithValidation.safeParse(json)
    return result.success ? { success: true, data: result.data } : { success: false, error: result.error }
  }
  
  static validatePartial(json: unknown): Partial<PlanDraft> {
    return PlanDraftSchema.partial().parse(json)
  }
}

// Example valid plan draft for testing
export const EXAMPLE_PLAN_DRAFT: PlanDraft = {
  schema_version: '1.0.0',
  project: {
    title: 'Mobile App Launch',
    description: 'Launch a new mobile application for iOS and Android platforms',
    start_date: '2025-01-15T09:00:00Z',
    due_date: '2025-06-30T17:00:00Z',
    priority: 'high',
    tags: ['mobile', 'launch', 'q1-2025']
  },
  milestones: [
    {
      title: 'Design & Planning',
      description: 'Complete UI/UX design and technical planning',
      start_date: '2025-01-15T09:00:00Z',
      due_date: '2025-02-15T17:00:00Z',
      priority: 'high',
      status: 'backlog',
      progress_percentage: 0,
      tasks: [
        {
          title: 'Create wireframes and mockups',
          description: 'Design all user interface screens',
          status: 'backlog',
          priority: 'high',
          assignee_hint: 'design-team',
          estimate_hours: 40,
          depends_on: [],
          acceptance_criteria: [
            'All screens designed',
            'Design system established',
            'Stakeholder approval received'
          ]
        },
        {
          title: 'Technical architecture planning',
          description: 'Define system architecture and technology stack',
          status: 'backlog',
          priority: 'high',
          assignee_hint: 'tech-lead',
          estimate_hours: 24,
          depends_on: ['Create wireframes and mockups'],
          acceptance_criteria: [
            'Architecture documented',
            'Technology stack selected',
            'API contracts defined'
          ]
        }
      ]
    }
  ],
  risks: [
    'Third-party API integration delays',
    'App store approval process uncertainty'
  ],
  assumptions: [
    'Development team available full-time',
    'Design requirements stable'
  ],
  open_questions: [
    'Which payment gateway to integrate?',
    'Target market prioritization?'
  ],
  metadata: {
    confidence_score: 0.85,
    processing_time_ms: 3200,
    ai_model_version: 'gpt-4o-2024-08-06',
    language: 'en',
    transcript_length: 245,
    complexity_score: 6
  }
}
