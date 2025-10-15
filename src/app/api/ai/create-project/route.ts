import { NextRequest } from 'next/server'
import { wrapRoute } from '@/server/http/wrapRoute'
import { AICreateProjectSchema } from '@/lib/validation/schemas/ai-api.schema'
import { checkRateLimit } from '@/server/utils/rateLimit'
import { aiService } from '@/lib/services/openai'
import { ProjectsService } from '@/features/projects/services/projectService'

/**
 * POST /api/ai/create-project - Generate project using AI
 * Rate limited: 10 AI requests per minute
 */
export async function POST(request: NextRequest) {
  return wrapRoute(AICreateProjectSchema, async ({ input, user, req, correlationId }) => {
    console.log('🤖 AI create project API called for user:', user.id, 'with prompt:', input.body.prompt?.substring(0, 50))
    // AI rate limit: 10 requests per minute
    await checkRateLimit(user.id, req.headers.get('x-forwarded-for'), 'ai')

    const result = await aiService.generateProject({
      prompt: input.body.prompt,
      organizationId: input.body.organizationId,
      userId: user.id,
      correlationId
    })

    if (!result.success) {
      const err: any = new Error(result.error || 'AI service failed')
      err.code = 'AI_SERVICE_ERROR'
      err.statusCode = 500
      throw err
    }

    // Create the actual project in the database
    const projectData = {
      name: result.data.project.name,
      description: result.data.project.description,
      priority: result.data.project.priority,
      organization_id: input.body.organizationId,
      status: 'planning'
    }

    const createResult = await ProjectsService.createProject(user.id, projectData)

    if (!createResult.success) {
      const err: any = new Error(createResult.error || 'Failed to create project')
      err.code = 'DATABASE_ERROR'
      err.statusCode = 500
      throw err
    }

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
