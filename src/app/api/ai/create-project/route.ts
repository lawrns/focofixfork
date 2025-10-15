import { NextRequest } from 'next/server'
import { wrapRoute } from '@/server/http/wrapRoute'
import { AICreateProjectSchema } from '@/lib/validation/schemas/ai-api.schema'
import { checkRateLimit } from '@/server/utils/rateLimit'
import { aiService } from '@/lib/services/openai'
import { ProjectsService } from '@/features/projects/services/projectService'

// Configure route for longer execution time (needed for OpenAI API calls)
// Netlify free tier: 10s, Pro: 26s, Enterprise: 60s+
export const maxDuration = 26
export const dynamic = 'force-dynamic'

/**
 * POST /api/ai/create-project - Generate project using AI
 * Rate limited: 10 AI requests per minute
 */
export async function POST(request: NextRequest) {
  return wrapRoute(AICreateProjectSchema, async ({ input, user, req, correlationId }) => {
    console.log('[AI Create Project] Request received:', {
      userId: user.id,
      promptLength: input.body.prompt?.length,
      promptPreview: input.body.prompt?.substring(0, 50),
      organizationId: input.body.organizationId,
      correlationId
    })

    // AI rate limit: 10 requests per minute
    await checkRateLimit(user.id, req.headers.get('x-forwarded-for'), 'ai')

    console.log('[AI Create Project] Calling AI service...')
    const result = await aiService.generateProject({
      prompt: input.body.prompt,
      organizationId: input.body.organizationId,
      userId: user.id,
      correlationId
    })

    if (!result.success) {
      console.error('[AI Create Project] AI service failed:', {
        error: result.error,
        userId: user.id,
        correlationId
      })
      const err: any = new Error(result.error || 'AI service failed')
      err.code = 'AI_SERVICE_ERROR'
      err.statusCode = 500
      throw err
    }

    console.log('[AI Create Project] AI generation successful:', {
      projectName: result.data.project.name,
      milestonesCount: result.data.project.milestones?.length || 0,
      tasksCount: result.data.project.milestones?.reduce((sum, m) => sum + (m.tasks?.length || 0), 0) || 0
    })

    // Create the actual project in the database
    const projectData = {
      name: result.data.project.name,
      description: result.data.project.description,
      priority: result.data.project.priority,
      organization_id: input.body.organizationId,
      status: 'planning' as const,
      created_by: user.id,
      start_date: new Date().toISOString().split('T')[0], // Today
      due_date: result.data.project.milestones?.[result.data.project.milestones.length - 1]?.dueDate || null,
      progress_percentage: 0
    }

    console.log('[AI Create Project] Creating project in database:', {
      name: projectData.name,
      organizationId: projectData.organization_id,
      userId: user.id
    })

    const createResult = await ProjectsService.createProject(user.id, projectData)

    if (!createResult.success) {
      console.error('[AI Create Project] Database creation failed:', {
        error: createResult.error,
        projectData,
        userId: user.id,
        correlationId
      })
      const err: any = new Error(createResult.error || 'Failed to create project')
      err.code = 'DATABASE_ERROR'
      err.statusCode = 500
      throw err
    }

    console.log('[AI Create Project] Success! Project created:', {
      projectId: createResult.data.id,
      projectName: createResult.data.name,
      userId: user.id,
      correlationId
    })

    // Return the created project with summary
    return {
      project: createResult.data,
      summary: {
        project_name: result.data.project.name,
        total_milestones: result.data.project.milestones?.length || 0,
        total_tasks: result.data.project.milestones?.reduce((sum, m) => sum + (m.tasks?.length || 0), 0) || 0
      }
    }
  })(request)
}
