import { z } from 'zod'

/**
 * Schema for POST /api/ai/create-project
 */
export const AICreateProjectSchema = z.object({
  body: z.object({
    prompt: z.string().min(5).max(2000),
    organizationId: z.string().uuid().optional()
  }).strict(),
  query: z.object({}).optional()
})

/**
 * Schema for POST /api/ai/create-task
 */
export const AICreateTaskSchema = z.object({
  body: z.object({
    projectId: z.string().uuid(),
    brief: z.string().min(3).max(2000),
    count: z.number().int().min(1).max(50).default(5)
  }).strict(),
  query: z.object({}).optional()
})

/**
 * Schema for POST /api/ai/create-milestone
 */
export const AICreateMilestoneSchema = z.object({
  body: z.object({
    projectId: z.string().uuid(),
    context: z.string().min(3).max(2000)
  }).strict(),
  query: z.object({}).optional()
})

/**
 * Schema for POST /api/ai/suggest-milestone
 */
export const AISuggestMilestoneSchema = z.object({
  body: z.object({
    projectId: z.string().uuid(),
    context: z.string().min(3).max(4000)
  }).strict(),
  query: z.object({}).optional()
})

/**
 * Schema for POST /api/ai/suggest-task
 */
export const AISuggestTaskSchema = z.object({
  body: z.object({
    projectId: z.string().uuid(),
    context: z.string().min(3).max(4000)
  }).strict(),
  query: z.object({}).optional()
})

/**
 * Schema for POST /api/ai/chat
 */
export const AIChatSchema = z.object({
  body: z.object({
    threadId: z.string().uuid().optional(),
    messages: z.array(z.object({
      role: z.enum(['user', 'system', 'assistant']),
      content: z.string().min(1)
    })).min(1).max(50)
  }).strict(),
  query: z.object({}).optional()
})

/**
 * Schema for POST /api/ai/analyze
 */
export const AIAnalyzeSchema = z.object({
  body: z.object({
    projectId: z.string().uuid().optional(),
    text: z.string().min(5).max(8000)
  }).strict(),
  query: z.object({}).optional()
})

/**
 * Schema for POST /api/ai/generate-content
 */
export const AIGenerateContentSchema = z.object({
  body: z.object({
    type: z.enum(['summary', 'requirements', 'acceptanceCriteria', 'releaseNotes']),
    input: z.string().min(3).max(8000),
    style: z.enum(['concise', 'detailed']).default('concise')
  }).strict(),
  query: z.object({}).optional()
})
