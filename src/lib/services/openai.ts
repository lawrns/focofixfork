import OpenAI from 'openai'

export interface AIConfig {
  apiKey: string
  model: string
  chatModel: string
  timeout: number
  maxRetries: number
}

export interface AIRequest {
  prompt: string
  context?: string
  systemPrompt?: string
  temperature?: number
  maxTokens?: number
}

export interface AIResponse {
  content: string
  model: string
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export interface AISuggestion {
  id: string
  type: 'task' | 'milestone' | 'description' | 'analysis' | 'code'
  title: string
  content: string
  confidence: number
  metadata?: Record<string, any>
  created_at: string
}

export class OpenAIService {
  public config: AIConfig
  private client: OpenAI
  private isProduction: boolean

  constructor(config?: Partial<AIConfig>) {
    this.isProduction = process.env.NODE_ENV === 'production' ||
                       process.env.NEXT_PUBLIC_VERCEL_ENV === 'production'

    const apiKey = process.env.OPENAI_API_KEY || ''

    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required')
    }

    this.config = {
      apiKey,
      model: process.env.NEXT_PUBLIC_OPENAI_MODEL || 'gpt-4o-mini',
      chatModel: process.env.NEXT_PUBLIC_OPENAI_CHAT_MODEL || 'gpt-4o-mini',
      timeout: 30000,
      maxRetries: 3,
      ...config
    }

    this.client = new OpenAI({
      apiKey: this.config.apiKey,
    })
  }

  /**
   * Test connection to OpenAI API
   */
  async testConnection(): Promise<{ success: boolean; message: string; models?: string[] }> {
    try {
      // Try a simple models list call to verify API key
      const models = await this.client.models.list()

      return {
        success: true,
        message: 'OpenAI API is accessible',
        models: models.data.slice(0, 5).map(m => m.id)
      }
    } catch (error: any) {
      console.error('OpenAI connection test failed:', error)
      return {
        success: false,
        message: error.message || 'Failed to connect to OpenAI API'
      }
    }
  }

  /**
   * Generate text completion using OpenAI
   */
  async generate(request: AIRequest): Promise<AIResponse> {
    try {
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = []

      if (request.systemPrompt) {
        messages.push({
          role: 'system',
          content: request.systemPrompt
        })
      }

      if (request.context) {
        messages.push({
          role: 'system',
          content: `Context: ${request.context}`
        })
      }

      messages.push({
        role: 'user',
        content: request.prompt
      })

      const completion = await this.client.chat.completions.create({
        model: this.config.model,
        messages,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? 2000,
      })

      const content = completion.choices[0]?.message?.content || ''

      return {
        content,
        model: completion.model,
        usage: completion.usage ? {
          prompt_tokens: completion.usage.prompt_tokens,
          completion_tokens: completion.usage.completion_tokens,
          total_tokens: completion.usage.total_tokens
        } : undefined
      }
    } catch (error: any) {
      console.error('OpenAI generation error:', error)
      throw new Error(`Failed to generate response: ${error.message}`)
    }
  }

  /**
   * Generate chat response
   */
  async chat(message: string, context?: string): Promise<string> {
    const response = await this.generate({
      prompt: message,
      context,
      systemPrompt: 'You are a helpful AI assistant for project management. Provide concise, actionable advice.'
    })

    return response.content
  }

  /**
   * Generate task suggestions
   */
  async suggestTasks(projectDescription: string, context?: string): Promise<AISuggestion[]> {
    const prompt = `Based on this project description, suggest 3-5 specific tasks that need to be completed:

Project: ${projectDescription}
${context ? `\nContext: ${context}` : ''}

Provide the tasks in JSON array format with this structure:
[
  {
    "title": "Task title",
    "content": "Detailed description of what needs to be done",
    "confidence": 0.9
  }
]`

    const response = await this.generate({
      prompt,
      systemPrompt: 'You are a project management expert. Generate specific, actionable tasks.',
      temperature: 0.7
    })

    try {
      const tasks = JSON.parse(response.content)
      return tasks.map((task: any, index: number) => ({
        id: `task-${Date.now()}-${index}`,
        type: 'task' as const,
        title: task.title,
        content: task.content,
        confidence: task.confidence || 0.8,
        created_at: new Date().toISOString()
      }))
    } catch (error) {
      console.error('Failed to parse task suggestions:', error)
      return []
    }
  }

  /**
   * Generate milestone suggestions
   */
  async suggestMilestones(projectDescription: string, context?: string): Promise<AISuggestion[]> {
    const prompt = `Based on this project, suggest 3-4 key milestones:

Project: ${projectDescription}
${context ? `\nContext: ${context}` : ''}

Provide the milestones in JSON array format:
[
  {
    "title": "Milestone title",
    "content": "What this milestone represents and why it's important",
    "confidence": 0.85
  }
]`

    const response = await this.generate({
      prompt,
      systemPrompt: 'You are a project planning expert. Generate meaningful project milestones.',
      temperature: 0.7
    })

    try {
      const milestones = JSON.parse(response.content)
      return milestones.map((milestone: any, index: number) => ({
        id: `milestone-${Date.now()}-${index}`,
        type: 'milestone' as const,
        title: milestone.title,
        content: milestone.content,
        confidence: milestone.confidence || 0.8,
        created_at: new Date().toISOString()
      }))
    } catch (error) {
      console.error('Failed to parse milestone suggestions:', error)
      return []
    }
  }

  /**
   * Analyze project and provide insights
   */
  async analyzeProject(projectData: any): Promise<string> {
    const prompt = `Analyze this project and provide insights:

Project Name: ${projectData.name}
Status: ${projectData.status}
Priority: ${projectData.priority}
${projectData.description ? `Description: ${projectData.description}` : ''}
${projectData.progress ? `Progress: ${projectData.progress}%` : ''}

Provide a brief analysis covering:
1. Current status assessment
2. Potential risks or blockers
3. Recommendations for next steps`

    const response = await this.generate({
      prompt,
      systemPrompt: 'You are a project analysis expert. Provide actionable insights.',
      temperature: 0.6
    })

    return response.content
  }

  /**
   * Generate project description
   */
  async generateDescription(projectName: string, keywords?: string[]): Promise<string> {
    const keywordText = keywords && keywords.length > 0
      ? `Keywords: ${keywords.join(', ')}`
      : ''

    const prompt = `Generate a professional project description for: ${projectName}
${keywordText}

Provide a concise, professional description (2-3 sentences) that explains what this project is about and its main objectives.`

    const response = await this.generate({
      prompt,
      systemPrompt: 'You are a professional project manager. Write clear, concise project descriptions.',
      temperature: 0.7
    })

    return response.content
  }
}

// Export singleton instance
export const aiService = new OpenAIService()
