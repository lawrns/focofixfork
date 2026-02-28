import OpenAI from 'openai'

export type AIProviderType = 'openai' | 'glm' | 'deepseek'

export interface AIConfig {
  provider: AIProviderType
  apiKey: string
  model: string
  chatModel: string
  timeout: number
  maxRetries: number
  baseURL?: string
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
  private client!: OpenAI
  private isProduction: boolean

  constructor(config?: Partial<AIConfig>) {
    this.isProduction = process.env.NODE_ENV === 'production' ||
                       process.env.NEXT_PUBLIC_VERCEL_ENV === 'production'

    // Determine AI provider
    const provider = (process.env.AI_PROVIDER as AIProviderType) || 'glm'
    let apiKey = ''
    let baseURL: string | undefined
    let model = 'gpt-4o-mini'
    let chatModel = 'gpt-4o-mini'

    if (provider === 'glm') {
      // Support both GLM_API_KEY and Z_AI_API_KEY (user preference)
      apiKey = process.env.Z_AI_API_KEY || process.env.GLM_API_KEY || ''
      // Use the CODING endpoint for paid GLM Coding plans (Max-Quarterly, etc.)
      baseURL = 'https://api.z.ai/api/coding/paas/v4/'
      model = process.env.GLM_MODEL || 'glm-5'
      chatModel = model
      console.log('[OpenAIService] Using GLM (Z.AI) CODING endpoint with model:', model)
      console.log('[OpenAIService] API Key present:', apiKey ? 'Yes (length: ' + apiKey.length + ')' : 'No')
    } else if (provider === 'deepseek') {
      apiKey = process.env.DEEPSEEK_API_KEY || ''
      baseURL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com'
      model = 'deepseek-chat'
      chatModel = 'deepseek-chat'
      console.log('[OpenAIService] Using DeepSeek provider')
    } else {
      apiKey = process.env.OPENAI_API_KEY || ''
      model = process.env.NEXT_PUBLIC_OPENAI_MODEL || 'gpt-4o-mini'
      chatModel = process.env.NEXT_PUBLIC_OPENAI_CHAT_MODEL || 'gpt-4o-mini'
      console.log('[OpenAIService] Using OpenAI provider')
    }

    // In production without API key, we'll use mock responses
    // In development, also use mock responses instead of crashing
    if (!apiKey) {
      console.warn(`[OpenAIService] AI API key not configured for provider: ${provider} - using mock responses`)
    }

    this.config = {
      provider,
      apiKey,
      model,
      chatModel,
      timeout: 30000,
      maxRetries: 3,
      baseURL,
      ...config
    }

    // Only create OpenAI client if we have an API key
    if (this.config.apiKey) {
      this.client = new OpenAI({
        apiKey: this.config.apiKey,
        baseURL: this.config.baseURL,
      })
      console.log('[OpenAIService] AI client initialized with provider:', this.config.provider, 'model:', this.config.model)
    }
  }

  /**
   * Test connection to OpenAI API
   */
  async testConnection(): Promise<{ success: boolean; message: string; models?: string[] }> {
    if (!this.client) {
      return {
        success: false,
        message: 'OpenAI client not initialized - API key not configured'
      }
    }

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
    // Check if client is initialized (API key available)
    if (!this.client) {
      throw new Error('OpenAI client not initialized - API key not configured')
    }

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
  async chat(params: {
    threadId?: string
    messages: Array<{ role: 'user' | 'system' | 'assistant'; content: string }>
    userId: string
    correlationId?: string
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    if (!this.client) {
      return {
        success: false,
        error: 'OpenAI client not initialized - API key not configured'
      }
    }

    try {
      const systemPrompt = 'You are a helpful AI assistant for project management. Provide concise, actionable advice.'

      // Convert messages to OpenAI format
      const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = params.messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }))

      // If no system message, add one
      if (!openaiMessages.some(msg => msg.role === 'system')) {
        openaiMessages.unshift({
          role: 'system',
          content: systemPrompt
        })
      }

      const completion = await this.client.chat.completions.create({
        model: this.config.chatModel,
        messages: openaiMessages,
        temperature: 0.7,
        max_tokens: 2000,
      })

      const content = completion.choices[0]?.message?.content || ''

      return {
        success: true,
        data: {
          response: content,
          model: completion.model,
          usage: completion.usage ? {
            prompt_tokens: completion.usage.prompt_tokens,
            completion_tokens: completion.usage.completion_tokens,
            total_tokens: completion.usage.total_tokens
          } : undefined,
          threadId: params.threadId || `thread-${Date.now()}`
        }
      }
    } catch (error: any) {
      console.error('AI chat error:', error)
      return {
        success: false,
        error: error.message || 'Failed to generate chat response'
      }
    }
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

  /**
   * Generate content based on type
   */
  async generateContent(params: {
    type: 'summary' | 'requirements' | 'acceptanceCriteria' | 'releaseNotes'
    input: string
    style: 'concise' | 'detailed'
    userId: string
    correlationId?: string
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const typePrompts = {
        summary: 'Create a concise summary of the following content:',
        requirements: 'Extract and organize the requirements from the following content:',
        acceptanceCriteria: 'Create acceptance criteria for the following feature or requirement:',
        releaseNotes: 'Write release notes for the following changes:'
      }

      const styleInstruction = params.style === 'detailed'
        ? 'Provide a detailed and comprehensive response.'
        : 'Keep the response concise and to the point.'

      const prompt = `${typePrompts[params.type]}

${params.input}

${styleInstruction}`

      const response = await this.generate({
        prompt,
        systemPrompt: 'You are a professional content writer and technical analyst. Generate clear, well-structured content.',
        temperature: 0.6,
        maxTokens: 1500
      })

      return {
        success: true,
        data: {
          content: response.content,
          type: params.type,
          style: params.style,
          model: response.model,
          usage: response.usage
        }
      }
    } catch (error: any) {
      console.error('AI generateContent error:', error)
      return {
        success: false,
        error: error.message || 'Failed to generate content'
      }
    }
  }

  /**
   * Generate project from prompt
   */
  async generateProject(params: {
    prompt: string
    organizationId?: string
    userId: string
    correlationId?: string
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      console.log('🤖 AI generateProject called with prompt:', params.prompt.substring(0, 50) + '...')
      const projectStructure = await this.generateProjectStructure(params.prompt)

      return {
        success: true,
        data: {
          project: projectStructure,
          organizationId: params.organizationId
        }
      }
    } catch (error: any) {
      console.error('AI generateProject error:', error)
      return {
        success: false,
        error: error.message || 'Failed to generate project'
      }
    }
  }

  /**
   * Suggest tasks for a project
   */
  async suggestTask(params: {
    projectId: string
    context: string
    userId: string
    correlationId?: string
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const suggestions = await this.suggestTasks(params.context, `Project ID: ${params.projectId}`)

      return {
        success: true,
        data: {
          suggestions,
          projectId: params.projectId
        }
      }
    } catch (error: any) {
      console.error('AI suggestTask error:', error)
      return {
        success: false,
        error: error.message || 'Failed to suggest tasks'
      }
    }
  }

  /**
   * Suggest milestones for a project
   */
  async suggestMilestone(params: {
    projectId: string
    context: string
    userId: string
    correlationId?: string
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const suggestions = await this.suggestMilestones(params.context, `Project ID: ${params.projectId}`)

      return {
        success: true,
        data: {
          suggestions,
          projectId: params.projectId
        }
      }
    } catch (error: any) {
      console.error('AI suggestMilestone error:', error)
      return {
        success: false,
        error: error.message || 'Failed to suggest milestones'
      }
    }
  }

  /**
   * Generate milestones for a project
   */
  async generateMilestone(params: {
    projectId: string
    context: string
    userId: string
    correlationId?: string
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const suggestions = await this.suggestMilestones(params.context, `Project ID: ${params.projectId}`)

      return {
        success: true,
        data: {
          milestones: suggestions,
          projectId: params.projectId
        }
      }
    } catch (error: any) {
      console.error('AI generateMilestone error:', error)
      return {
        success: false,
        error: error.message || 'Failed to generate milestones'
      }
    }
  }

  /**
   * Generate tasks for a project
   */
  async generateTasks(params: {
    projectId: string
    brief: string
    count: number
    userId: string
    correlationId?: string
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const suggestions = await this.suggestTasks(params.brief, `Project ID: ${params.projectId}`)

      // Limit to requested count
      const limitedSuggestions = suggestions.slice(0, params.count)

      return {
        success: true,
        data: {
          tasks: limitedSuggestions,
          projectId: params.projectId,
          requestedCount: params.count,
          actualCount: limitedSuggestions.length
        }
      }
    } catch (error: any) {
      console.error('AI generateTasks error:', error)
      return {
        success: false,
        error: error.message || 'Failed to generate tasks'
      }
    }
  }

  /**
   * Analyze text and provide insights
   */
  async analyze(params: {
    projectId?: string
    text: string
    userId: string
    correlationId?: string
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      let contextPrompt = 'You are an expert project manager and analyst. Analyze the provided text and provide insights.'

      if (params.projectId) {
        contextPrompt += ' Consider this analysis in the context of project management and execution.'
      }

      const prompt = `Please analyze this text and provide detailed insights:

Text to analyze:
${params.text}

Provide your analysis covering:
1. Key themes and topics
2. Important findings or insights
3. Potential implications or recommendations
4. Any risks or concerns identified
5. Actionable next steps

Format your response as a structured analysis.`

      const response = await this.generate({
        prompt,
        systemPrompt: contextPrompt,
        temperature: 0.6,
        maxTokens: 2000
      })

      return {
        success: true,
        data: {
          analysis: response.content,
          model: response.model,
          usage: response.usage
        }
      }
    } catch (error: any) {
      console.error('AI analyze error:', error)
      return {
        success: false,
        error: error.message || 'Failed to analyze text'
      }
    }
  }

  /**
   * Generate complete project structure with milestones and tasks
   */
  async generateProjectStructure(description: string): Promise<{
    name: string
    description: string
    priority: 'low' | 'medium' | 'high' | 'urgent'
    milestones: {
      name: string
      description: string
      dueDate: string
      priority: 'low' | 'medium' | 'high' | 'urgent'
      tasks: {
        name: string
        description: string
        priority: 'low' | 'medium' | 'high' | 'urgent'
        estimatedHours: number
      }[]
    }[]
  }> {
    // Mock response when OpenAI is not available (production fallback)
    if (this.isProduction && !this.config.apiKey) {
      console.log('🎭 Using mock AI response for project generation - OpenAI not configured')
      console.log('🎭 Mock AI: Generating project structure for:', description.substring(0, 50))
      const today = new Date()
      const twoWeeksFromNow = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000)
      const sixWeeksFromNow = new Date(today.getTime() + 42 * 24 * 60 * 60 * 1000)
      const tenWeeksFromNow = new Date(today.getTime() + 70 * 24 * 60 * 60 * 1000)

      return {
        name: "Mobile App Redesign Project",
        description: description || "Complete mobile app redesign with UX improvements, performance optimization, and accessibility compliance",
        priority: "high",
        milestones: [
          {
            name: "Planning & Research",
            description: "Conduct user research, competitor analysis, and define project scope",
            dueDate: twoWeeksFromNow.toISOString().split('T')[0],
            priority: "high",
            tasks: [
              {
                name: "User Research & Interviews",
                description: "Conduct interviews with 10 current users to understand pain points",
                priority: "high",
                estimatedHours: 16
              },
              {
                name: "Competitor Analysis",
                description: "Analyze 5 competitor apps for UX patterns and features",
                priority: "medium",
                estimatedHours: 12
              },
              {
                name: "Requirements Gathering",
                description: "Document functional and non-functional requirements",
                priority: "high",
                estimatedHours: 20
              }
            ]
          },
          {
            name: "Design Phase",
            description: "Create wireframes, mockups, and design system",
            dueDate: sixWeeksFromNow.toISOString().split('T')[0],
            priority: "high",
            tasks: [
              {
                name: "Wireframes Creation",
                description: "Create low-fidelity wireframes for all screens",
                priority: "medium",
                estimatedHours: 24
              },
              {
                name: "UI Mockups",
                description: "Design high-fidelity mockups with new branding",
                priority: "high",
                estimatedHours: 32
              },
              {
                name: "Design System",
                description: "Create reusable components and design tokens",
                priority: "medium",
                estimatedHours: 16
              }
            ]
          },
          {
            name: "Development & Testing",
            description: "Implement new design, optimize performance, and test thoroughly",
            dueDate: tenWeeksFromNow.toISOString().split('T')[0],
            priority: "high",
            tasks: [
              {
                name: "Frontend Implementation",
                description: "Implement new UI components and layouts",
                priority: "high",
                estimatedHours: 80
              },
              {
                name: "Performance Optimization",
                description: "Optimize app performance and loading times",
                priority: "high",
                estimatedHours: 24
              },
              {
                name: "Accessibility Testing",
                description: "Ensure WCAG compliance and screen reader support",
                priority: "medium",
                estimatedHours: 16
              },
              {
                name: "Cross-platform Testing",
                description: "Test on iOS and Android devices",
                priority: "high",
                estimatedHours: 20
              }
            ]
          }
        ]
      }
    }

    const systemPrompt = `You are a project management AI assistant. Given a project description, create a focused project structure with milestones and tasks.

Return ONLY a valid JSON object with this exact structure (no additional text):
{
  "name": "Project name (max 80 chars)",
  "description": "Project description (max 300 chars)",
  "priority": "medium",
  "milestones": [
    {
      "name": "Milestone name (max 80 chars)",
      "description": "What this milestone achieves (max 200 chars)",
      "dueDate": "YYYY-MM-DD",
      "priority": "medium",
      "tasks": [
        {
          "name": "Task name (max 80 chars)",
          "description": "What needs to be done (max 150 chars)",
          "priority": "medium",
          "estimatedHours": 8
        }
      ]
    }
  ]
}

Guidelines:
- Create 2-3 milestones (focused on key phases)
- Each milestone should have 2-4 essential tasks
- Use realistic time estimates (2-40 hours per task)
- Start with planning, end with completion
- Set due dates (start 14 days from now, spread evenly)
- Prioritize: blockers = high, normal = medium
- Be concise and actionable`

    try {
    if (!this.client) {
      throw new Error('OpenAI client not initialized - API key not available')
    }

    const completion = await this.client.chat.completions.create({
      model: this.config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Create a project structure for: ${description}` }
      ],
      temperature: 0.6,
      max_tokens: 1500,
    })

      const content = completion.choices[0]?.message?.content
      if (!content) {
        throw new Error('No response from OpenAI')
      }

      // Try to parse JSON directly first
      let projectStructure
      try {
        projectStructure = JSON.parse(content)
      } catch (parseError) {
        // If direct parsing fails, try to extract JSON from markdown code blocks
        const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/)
        if (jsonMatch) {
          projectStructure = JSON.parse(jsonMatch[1])
        } else {
          // Last resort: try to find JSON-like content
          const jsonStart = content.indexOf('{')
          const jsonEnd = content.lastIndexOf('}')
          if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
            const jsonString = content.substring(jsonStart, jsonEnd + 1)
            projectStructure = JSON.parse(jsonString)
          } else {
            throw new Error('Could not extract valid JSON from response')
          }
        }
      }

      // Validate structure
      if (!projectStructure.name || !projectStructure.milestones) {
        throw new Error('Invalid project structure returned')
      }

      // Ensure priority fields exist with defaults
      projectStructure.priority = projectStructure.priority || 'medium'
      projectStructure.milestones = projectStructure.milestones.map((m: any) => ({
        ...m,
        priority: m.priority || 'medium',
        tasks: (m.tasks || []).map((t: any) => ({
          ...t,
          priority: t.priority || 'medium',
          estimatedHours: t.estimatedHours || 8
        }))
      }))

      return projectStructure
    } catch (error: any) {
      console.error('OpenAI project generation error:', error)
      throw new Error(`Failed to generate project structure: ${error.message}`)
    }
  }
}

// Export singleton instance
export const aiService = new OpenAIService()
