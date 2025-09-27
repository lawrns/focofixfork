import { NextRequest, NextResponse } from 'next/server'
import { ollamaService } from '@/lib/services/ollama'
import { z } from 'zod'

const analyzeProjectSchema = z.object({
  project_id: z.string().min(1, 'Project ID is required'),
  include_tasks: z.boolean().default(true),
  include_milestones: z.boolean().default(true),
  analysis_type: z.enum(['progress', 'risks', 'recommendations', 'comprehensive']).default('comprehensive')
})

/**
 * POST /api/ai/analyze-project - Generate project analysis and insights
 */
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()

    // Validate request body
    const validationResult = analyzeProjectSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validationResult.error.issues
        },
        { status: 400 }
      )
    }

    const { project_id, include_tasks, include_milestones, analysis_type } = validationResult.data

    // Fetch project data
    const { data: project } = await fetch(
      `${request.nextUrl.origin}/api/projects/${project_id}`,
      {
        headers: { 'x-user-id': userId }
      }
    ).then(r => r.json())

    if (!project?.success) {
      return NextResponse.json(
        { success: false, error: 'Project not found or access denied' },
        { status: 404 }
      )
    }

    // Fetch tasks and milestones if requested
    let tasks = []
    let milestones = []

    if (include_tasks) {
      const { data: tasksData } = await fetch(
        `${request.nextUrl.origin}/api/tasks?project_id=${project_id}`,
        {
          headers: { 'x-user-id': userId }
        }
      ).then(r => r.json())
      tasks = tasksData?.data || []
    }

    if (include_milestones) {
      const { data: milestonesData } = await fetch(
        `${request.nextUrl.origin}/api/milestones?project_id=${project_id}`,
        {
          headers: { 'x-user-id': userId }
        }
      ).then(r => r.json())
      milestones = milestonesData?.data || []
    }

    // Generate analysis based on type
    let analysisTitle = 'Project Analysis'
    let analysisContent = ''

    switch (analysis_type) {
      case 'progress':
        analysisTitle = 'Progress Analysis'
        analysisContent = await generateProgressAnalysis(project.data, tasks, milestones)
        break
      case 'risks':
        analysisTitle = 'Risk Assessment'
        analysisContent = await generateRiskAnalysis(project.data, tasks, milestones)
        break
      case 'recommendations':
        analysisTitle = 'Action Recommendations'
        analysisContent = await generateRecommendations(project.data, tasks, milestones)
        break
      default:
        // Comprehensive analysis
        const progressAnalysis = await generateProgressAnalysis(project.data, tasks, milestones)
        const riskAnalysis = await generateRiskAnalysis(project.data, tasks, milestones)
        const recommendations = await generateRecommendations(project.data, tasks, milestones)

        analysisContent = `## Progress Analysis\n\n${progressAnalysis}\n\n## Risk Assessment\n\n${riskAnalysis}\n\n## Recommendations\n\n${recommendations}`
    }

    const analysis = {
      id: `analysis-${Date.now()}`,
      type: 'analysis' as const,
      title: analysisTitle,
      content: analysisContent,
      confidence: 0.9,
      metadata: {
        project_id: project_id,
        analysis_type: analysis_type,
        data_included: {
          tasks: include_tasks,
          milestones: include_milestones
        }
      },
      created_at: new Date().toISOString()
    }

    // Save analysis to database
    await ollamaService.saveSuggestion(analysis)

    return NextResponse.json({
      success: true,
      data: analysis,
      message: 'Project analysis completed'
    })

  } catch (error: any) {
    console.error('AI project analysis error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to analyze project',
        details: error.message
      },
      { status: 500 }
    )
  }
}

// Helper functions for different analysis types
async function generateProgressAnalysis(project: any, tasks: any[], milestones: any[]): Promise<string> {
  const context = {
    project: {
      name: project.name,
      progress: project.progress_percentage,
      status: project.status,
      due_date: project.due_date
    },
    tasks: tasks.map(t => ({
      title: t.title,
      status: t.status,
      priority: t.priority
    })),
    milestones: milestones.map(m => ({
      title: m.title,
      progress: m.progress_percentage,
      status: m.status,
      due_date: m.due_date
    }))
  }

  const prompt = `Analyze the current progress of this project and provide insights about completion status, velocity, and timeline adherence.

Project Data: ${JSON.stringify(context, null, 2)}

Focus on:
1. Overall completion percentage
2. Task completion rate
3. Milestone progress
4. Timeline status
5. Areas of concern`

  try {
    const response = await ollamaService.generate({
      model: ollamaService.config.defaultModel,
      prompt,
      options: { temperature: 0.3, num_predict: 600 }
    })
    return response.response
  } catch (error) {
    return 'Unable to generate progress analysis at this time.'
  }
}

async function generateRiskAnalysis(project: any, tasks: any[], milestones: any[]): Promise<string> {
  const context = {
    project: {
      name: project.name,
      due_date: project.due_date,
      status: project.status
    },
    overdueTasks: tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done'),
    overdueMilestones: milestones.filter(m => m.due_date && new Date(m.due_date) < new Date() && m.status !== 'completed'),
    blockedTasks: tasks.filter(t => t.status === 'review') // Assuming review status indicates potential blockers
  }

  const prompt = `Assess potential risks and issues in this project based on the current data.

Project Data: ${JSON.stringify(context, null, 2)}

Identify:
1. Timeline risks (overdue items)
2. Task completion risks
3. Milestone delivery risks
4. Potential bottlenecks
5. Resource allocation concerns`

  try {
    const response = await ollamaService.generate({
      model: ollamaService.config.defaultModel,
      prompt,
      options: { temperature: 0.3, num_predict: 600 }
    })
    return response.response
  } catch (error) {
    return 'Unable to generate risk analysis at this time.'
  }
}

async function generateRecommendations(project: any, tasks: any[], milestones: any[]): Promise<string> {
  const context = {
    project: {
      name: project.name,
      progress: project.progress_percentage,
      status: project.status
    },
    incompleteTasks: tasks.filter(t => t.status !== 'done'),
    incompleteMilestones: milestones.filter(m => m.status !== 'completed')
  }

  const prompt = `Provide actionable recommendations to improve project outcomes and accelerate completion.

Project Data: ${JSON.stringify(context, null, 2)}

Recommend:
1. Priority task assignments
2. Milestone adjustments
3. Process improvements
4. Resource reallocations
5. Risk mitigation strategies`

  try {
    const response = await ollamaService.generate({
      model: ollamaService.config.defaultModel,
      prompt,
      options: { temperature: 0.4, num_predict: 600 }
    })
    return response.response
  } catch (error) {
    return 'Unable to generate recommendations at this time.'
  }
}
