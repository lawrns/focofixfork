import { supabase } from '@/lib/supabase'

export interface MilestoneSuggestion {
  id: string
  name: string
  description: string
  estimated_duration: number // in days
  priority: 'low' | 'medium' | 'high' | 'urgent'
  dependencies?: string[]
  rationale: string
  confidence_score: number // 0-1
}

export interface TaskSuggestion {
  id: string
  name: string
  description: string
  estimated_duration: number // in hours
  assignee_suggestion?: string
  rationale: string
}

export interface ProjectAnalysis {
  summary: string
  risks: string[]
  recommendations: string[]
  estimated_completion: string
  resource_needs: string[]
}

export interface ContentGenerationRequest {
  type: 'milestone_description' | 'task_description' | 'project_summary'
  context: {
    project_name?: string
    milestone_name?: string
    task_name?: string
    existing_content?: string
  }
  requirements?: string[]
  tone?: 'professional' | 'casual' | 'technical'
}

export class AIService {
  private static ollamaUrl = process.env.NEXT_PUBLIC_OLLAMA_URL || 'http://localhost:11434'

  /**
   * Analyze project and suggest milestones
   */
  static async suggestMilestones(projectDescription: string, existingMilestones: any[] = []): Promise<MilestoneSuggestion[]> {
    try {
      const context = {
        project_description: projectDescription,
        existing_milestones: existingMilestones.map(m => ({
          name: m.name,
          description: m.description,
          status: m.status,
          priority: m.priority
        })),
        total_existing: existingMilestones.length
      }

      const prompt = `Based on this project description, suggest a comprehensive set of milestones that would be needed to complete the project successfully.

Project: ${JSON.stringify(context, null, 2)}

Please provide suggestions in this JSON format:
{
  "milestones": [
    {
      "name": "Clear milestone name",
      "description": "Detailed description of what this milestone entails",
      "estimated_duration": 14,
      "priority": "high|medium|low|urgent",
      "dependencies": ["milestone_name_if_any"],
      "rationale": "Why this milestone is important and when it should be done",
      "confidence_score": 0.85
    }
  ]
}

Consider:
- Start with planning and research phases
- Include development/implementation phases
- Add testing and quality assurance
- Include deployment and documentation
- End with review and optimization
- Estimate realistic durations
- Consider dependencies between milestones
- Provide high confidence scores for standard practices`

      const response = await this.callOllama(prompt)
      const parsed = JSON.parse(response)

      // Validate and clean the suggestions
      return parsed.milestones.map((suggestion: any, index: number) => ({
        id: `suggested_${Date.now()}_${index}`,
        name: suggestion.name || `Milestone ${index + 1}`,
        description: suggestion.description || '',
        estimated_duration: Math.max(1, Math.min(365, suggestion.estimated_duration || 7)),
        priority: ['low', 'medium', 'high', 'urgent'].includes(suggestion.priority)
          ? suggestion.priority : 'medium',
        dependencies: Array.isArray(suggestion.dependencies) ? suggestion.dependencies : [],
        rationale: suggestion.rationale || 'AI-generated suggestion',
        confidence_score: Math.max(0, Math.min(1, suggestion.confidence_score || 0.7))
      }))

    } catch (error) {
      console.error('AI milestone suggestion failed:', error)
      // Return fallback suggestions
      return this.getFallbackMilestoneSuggestions()
    }
  }

  /**
   * Suggest tasks for a milestone
   */
  static async suggestTasks(milestoneName: string, milestoneDescription: string, projectContext?: string): Promise<TaskSuggestion[]> {
    try {
      const context = {
        milestone_name: milestoneName,
        milestone_description: milestoneDescription,
        project_context: projectContext
      }

      const prompt = `Based on this milestone, suggest specific tasks that need to be completed.

Milestone: ${JSON.stringify(context, null, 2)}

Please provide task suggestions in this JSON format:
{
  "tasks": [
    {
      "name": "Clear task name",
      "description": "Detailed description of what needs to be done",
      "estimated_duration": 8,
      "assignee_suggestion": "Suggested role or person",
      "rationale": "Why this task is important"
    }
  ]
}

Consider:
- Break down the milestone into actionable tasks
- Estimate realistic timeframes (in hours)
- Suggest appropriate assignees based on task type
- Order tasks logically
- Include both technical and non-technical tasks`

      const response = await this.callOllama(prompt)
      const parsed = JSON.parse(response)

      return parsed.tasks.map((task: any, index: number) => ({
        id: `task_suggested_${Date.now()}_${index}`,
        name: task.name || `Task ${index + 1}`,
        description: task.description || '',
        estimated_duration: Math.max(0.5, Math.min(160, task.estimated_duration || 4)),
        assignee_suggestion: task.assignee_suggestion,
        rationale: task.rationale || 'AI-generated suggestion'
      }))

    } catch (error) {
      console.error('AI task suggestion failed:', error)
      return []
    }
  }

  /**
   * Analyze project and provide insights
   */
  static async analyzeProject(projectData: any): Promise<ProjectAnalysis> {
    try {
      const prompt = `Analyze this project and provide insights, risks, and recommendations.

Project Data: ${JSON.stringify(projectData, null, 2)}

Please provide analysis in this JSON format:
{
  "summary": "Brief project summary",
  "risks": ["Risk 1", "Risk 2"],
  "recommendations": ["Recommendation 1", "Recommendation 2"],
  "estimated_completion": "Estimated completion date or duration",
  "resource_needs": ["Resource 1", "Resource 2"]
}

Consider:
- Current progress vs timeline
- Resource allocation
- Potential bottlenecks
- Quality and testing needs
- Communication and collaboration needs`

      const response = await this.callOllama(prompt)
      const parsed = JSON.parse(response)

      return {
        summary: parsed.summary || 'Project analysis not available',
        risks: Array.isArray(parsed.risks) ? parsed.risks : [],
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
        estimated_completion: parsed.estimated_completion || 'Unknown',
        resource_needs: Array.isArray(parsed.resource_needs) ? parsed.resource_needs : []
      }

    } catch (error) {
      console.error('AI project analysis failed:', error)
      return {
        summary: 'Analysis not available',
        risks: [],
        recommendations: [],
        estimated_completion: 'Unknown',
        resource_needs: []
      }
    }
  }

  /**
   * Generate content (descriptions, summaries)
   */
  static async generateContent(request: ContentGenerationRequest): Promise<string> {
    try {
      const prompt = `Generate ${request.type.replace('_', ' ')} content.

Context: ${JSON.stringify(request.context, null, 2)}
Requirements: ${request.requirements?.join(', ') || 'None specified'}
Tone: ${request.tone || 'professional'}

Please provide well-written, ${request.tone || 'professional'} content that fits the context and requirements.`

      return await this.callOllama(prompt)

    } catch (error) {
      console.error('AI content generation failed:', error)
      return 'Content generation not available'
    }
  }

  /**
   * Suggest priority for a milestone/task
   */
  static async suggestPriority(itemData: any, projectContext?: any): Promise<{
    priority: 'low' | 'medium' | 'high' | 'urgent'
    rationale: string
    confidence: number
  }> {
    try {
      const prompt = `Based on this item and project context, suggest an appropriate priority level.

Item: ${JSON.stringify(itemData, null, 2)}
Project Context: ${JSON.stringify(projectContext, null, 2)}

Please respond in this JSON format:
{
  "priority": "low|medium|high|urgent",
  "rationale": "Explanation for the priority level",
  "confidence": 0.85
}

Consider:
- Impact on project timeline
- Dependencies and blockers
- Business value
- Risk level
- Resource requirements`

      const response = await this.callOllama(prompt)
      const parsed = JSON.parse(response)

      return {
        priority: ['low', 'medium', 'high', 'urgent'].includes(parsed.priority)
          ? parsed.priority : 'medium',
        rationale: parsed.rationale || 'AI-generated priority suggestion',
        confidence: Math.max(0, Math.min(1, parsed.confidence || 0.7))
      }

    } catch (error) {
      console.error('AI priority suggestion failed:', error)
      return {
        priority: 'medium',
        rationale: 'Default priority assigned',
        confidence: 0.5
      }
    }
  }

  /**
   * Suggest deadline based on context
   */
  static async suggestDeadline(itemData: any, projectTimeline?: any): Promise<{
    suggested_date: string
    rationale: string
    confidence: number
  }> {
    try {
      const prompt = `Suggest an appropriate deadline for this item based on project context.

Item: ${JSON.stringify(itemData, null, 2)}
Project Timeline: ${JSON.stringify(projectTimeline, null, 2)}

Please respond in this JSON format:
{
  "suggested_date": "YYYY-MM-DD",
  "rationale": "Explanation for the suggested deadline",
  "confidence": 0.85
}

Consider:
- Project overall deadline
- Dependencies and prerequisites
- Estimated duration
- Team capacity
- Business priorities`

      const response = await this.callOllama(prompt)
      const parsed = JSON.parse(response)

      return {
        suggested_date: parsed.suggested_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        rationale: parsed.rationale || 'AI-generated deadline suggestion',
        confidence: Math.max(0, Math.min(1, parsed.confidence || 0.7))
      }

    } catch (error) {
      console.error('AI deadline suggestion failed:', error)
      const defaultDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      return {
        suggested_date: defaultDate,
        rationale: 'Default deadline assigned',
        confidence: 0.5
      }
    }
  }

  /**
   * Call Ollama API
   */
  private static async callOllama(prompt: string): Promise<string> {
    try {
      const response = await fetch(`${this.ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama2', // or whichever model is available
          prompt: prompt,
          stream: false,
          options: {
            temperature: 0.7,
            top_p: 0.9,
            num_predict: 1024
          }
        }),
      })

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`)
      }

      const data = await response.json()
      return data.response || ''

    } catch (error) {
      console.error('Ollama API call failed:', error)
      throw error
    }
  }

  /**
   * Check if Ollama is available
   */
  static async checkHealth(): Promise<{ available: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.ollamaUrl}/api/tags`)
      return { available: response.ok }
    } catch (error) {
      return {
        available: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Fallback milestone suggestions when AI is unavailable
   */
  private static getFallbackMilestoneSuggestions(): MilestoneSuggestion[] {
    return [
      {
        id: 'planning',
        name: 'Planning & Requirements',
        description: 'Gather requirements, create project plan, and define scope',
        estimated_duration: 7,
        priority: 'high',
        rationale: 'Essential foundation for project success',
        confidence_score: 0.9
      },
      {
        id: 'design',
        name: 'Design & Architecture',
        description: 'Create technical design and system architecture',
        estimated_duration: 10,
        priority: 'high',
        dependencies: ['planning'],
        rationale: 'Technical foundation before development begins',
        confidence_score: 0.85
      },
      {
        id: 'development',
        name: 'Development & Implementation',
        description: 'Build the core functionality and features',
        estimated_duration: 30,
        priority: 'high',
        dependencies: ['design'],
        rationale: 'Main development phase of the project',
        confidence_score: 0.9
      },
      {
        id: 'testing',
        name: 'Testing & Quality Assurance',
        description: 'Comprehensive testing of all features and functionality',
        estimated_duration: 14,
        priority: 'high',
        dependencies: ['development'],
        rationale: 'Ensure quality before release',
        confidence_score: 0.85
      },
      {
        id: 'deployment',
        name: 'Deployment & Launch',
        description: 'Deploy to production and prepare for launch',
        estimated_duration: 5,
        priority: 'urgent',
        dependencies: ['testing'],
        rationale: 'Final step to make project available to users',
        confidence_score: 0.8
      }
    ]
  }

  /**
   * Save AI suggestion to database for tracking
   */
  static async saveSuggestion(suggestion: {
    type: 'milestone' | 'task' | 'priority' | 'deadline' | 'content'
    input_data: any
    output_data: any
    user_id?: string
    milestone_id?: string
  }): Promise<void> {
    try {
      await supabase
        .from('ai_suggestions')
        .insert({
          suggestion_type: suggestion.type,
          content: JSON.stringify(suggestion.output_data),
          metadata: {
            input_data: suggestion.input_data,
            output_data: suggestion.output_data
          },
          user_id: suggestion.user_id,
          milestone_id: suggestion.milestone_id,
          created_at: new Date().toISOString()
        })
    } catch (error) {
      console.error('Failed to save AI suggestion:', error)
      // Don't throw - AI suggestions should still work even if tracking fails
    }
  }
}