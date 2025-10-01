import { supabase } from '@/lib/supabase'

export interface OllamaConfig {
  host: string
  defaultModel: string
  codeModel: string
  chatModel: string
  timeout: number
  maxRetries: number
}

export interface OllamaRequest {
  model: string
  prompt: string
  context?: string
  stream?: boolean
  options?: {
    temperature?: number
    top_p?: number
    top_k?: number
    num_predict?: number
    num_ctx?: number
  }
}

export interface OllamaResponse {
  model: string
  created_at: string
  response: string
  done: boolean
  context?: number[]
  total_duration?: number
  load_duration?: number
  prompt_eval_count?: number
  eval_count?: number
  eval_duration?: number
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

export class OllamaService {
  public config: OllamaConfig
  private abortController: AbortController | null = null
  private isProduction: boolean

  constructor(config?: Partial<OllamaConfig>) {
    this.isProduction = process.env.NODE_ENV === 'production' ||
                       process.env.NEXT_PUBLIC_VERCEL_ENV === 'production' ||
                       !process.env.NEXT_PUBLIC_OLLAMA_HOST

    this.config = {
      host: this.isProduction ? '' : (process.env.NEXT_PUBLIC_OLLAMA_HOST || 'http://127.0.0.1:11434'),
      defaultModel: process.env.NEXT_PUBLIC_OLLAMA_DEFAULT_MODEL || 'llama2',
      codeModel: process.env.NEXT_PUBLIC_OLLAMA_CODE_MODEL || 'codellama',
      chatModel: process.env.NEXT_PUBLIC_OLLAMA_CHAT_MODEL || 'mistral',
      timeout: 30000,
      maxRetries: 3,
      ...config
    }
  }

  /**
   * Test connection to Ollama server
   */
  async testConnection(): Promise<{ success: boolean; message: string; models?: string[] }> {
    // In production, Ollama is not available
    if (this.isProduction) {
      return {
        success: false,
        message: 'Ollama AI service is not available in production environment'
      }
    }

    try {
      const response = await this.makeRequest('/api/tags')

      if (response.ok) {
        const data = await response.json()
        const models = data.models?.map((m: any) => m.name) || []
        return {
          success: true,
          message: 'Ollama server is running',
          models
        }
      } else {
        return {
          success: false,
          message: `Ollama server responded with status ${response.status}`
        }
      }
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to connect to Ollama: ${error.message}`
      }
    }
  }

  /**
   * Generate text using Ollama
   */
  async generate(request: OllamaRequest): Promise<OllamaResponse> {
    if (this.isProduction) {
      throw new Error('Ollama AI service is not available in production environment')
    }

    const payload = {
      model: request.model,
      prompt: request.prompt,
      context: request.context,
      stream: false,
      options: {
        temperature: 0.7,
        top_p: 0.9,
        ...request.options
      }
    }

    const response = await this.makeRequest('/api/generate', {
      method: 'POST',
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`)
    }

    return await response.json()
  }

  /**
   * Generate streaming response
   */
  async *generateStream(request: OllamaRequest): AsyncGenerator<OllamaResponse, void, unknown> {
    const payload = {
      model: request.model,
      prompt: request.prompt,
      context: request.context,
      stream: true,
      options: {
        temperature: 0.7,
        top_p: 0.9,
        ...request.options
      }
    }

    this.abortController = new AbortController()

    const response = await this.makeRequest('/api/generate', {
      method: 'POST',
      body: JSON.stringify(payload),
      signal: this.abortController.signal
    })

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('Failed to get response reader')
    }

    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()

        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')

        // Keep the last potentially incomplete line in buffer
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.trim()) {
            try {
              const data: OllamaResponse = JSON.parse(line)
              yield data

              if (data.done) {
                return
              }
            } catch (error) {
              console.warn('Failed to parse streaming response:', line, error)
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  /**
   * Stop current generation
   */
  stopGeneration() {
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }
  }

  /**
   * List available models
   */
  async listModels(): Promise<{ name: string; size: number; modified_at: string }[]> {
    const response = await this.makeRequest('/api/tags')

    if (!response.ok) {
      throw new Error(`Failed to list models: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return data.models || []
  }

  /**
   * Pull a model
   */
  async pullModel(modelName: string): Promise<void> {
    const response = await this.makeRequest('/api/pull', {
      method: 'POST',
      body: JSON.stringify({ name: modelName })
    })

    if (!response.ok) {
      throw new Error(`Failed to pull model: ${response.status} ${response.statusText}`)
    }
  }

  /**
   * Delete a model
   */
  async deleteModel(modelName: string): Promise<void> {
    const response = await this.makeRequest('/api/delete', {
      method: 'DELETE',
      body: JSON.stringify({ name: modelName })
    })

    if (!response.ok) {
      throw new Error(`Failed to delete model: ${response.status} ${response.statusText}`)
    }
  }

  /**
   * Generate task suggestions based on project context
   */
  async suggestTasks(projectId: string, context?: string): Promise<AISuggestion[]> {
    const prompt = `Based on the following project context, suggest specific, actionable tasks that should be created. Return the suggestions as a JSON array of objects with 'title', 'description', and 'priority' fields.

Project Context: ${context || 'General project management'}

Please provide 3-5 specific task suggestions that would help advance this project.`

    try {
      const response = await this.generate({
        model: this.config.defaultModel,
        prompt,
        options: {
          temperature: 0.7,
          num_predict: 500
        }
      })

      // Parse the JSON response
      const suggestions = JSON.parse(response.response)

      return suggestions.map((suggestion: any, index: number) => ({
        id: `task-suggestion-${Date.now()}-${index}`,
        type: 'task' as const,
        title: suggestion.title || 'Task suggestion',
        content: suggestion.description || suggestion.title || 'AI-generated task',
        confidence: 0.8,
        metadata: {
          priority: suggestion.priority || 'medium',
          project_id: projectId
        },
        created_at: new Date().toISOString()
      }))
    } catch (error) {
      console.error('Failed to generate task suggestions:', error)
      return []
    }
  }

  /**
   * Generate milestone suggestions
   */
  async suggestMilestones(projectId: string, existingTasks: any[]): Promise<AISuggestion[]> {
    const tasksContext = existingTasks.map(t => `- ${t.title}: ${t.description || ''}`).join('\n')

    const prompt = `Based on the following existing tasks, suggest logical milestones that would organize these tasks into coherent phases. Return as JSON array with 'title', 'description', and 'task_ids' fields.

Existing Tasks:
${tasksContext}

Suggest 2-4 milestones that would group these tasks logically.`

    try {
      const response = await this.generate({
        model: this.config.codeModel,
        prompt,
        options: {
          temperature: 0.6,
          num_predict: 600
        }
      })

      const suggestions = JSON.parse(response.response)

      return suggestions.map((suggestion: any, index: number) => ({
        id: `milestone-suggestion-${Date.now()}-${index}`,
        type: 'milestone' as const,
        title: suggestion.title || 'Milestone suggestion',
        content: suggestion.description || suggestion.title || 'AI-generated milestone',
        confidence: 0.85,
        metadata: {
          task_ids: suggestion.task_ids || [],
          project_id: projectId
        },
        created_at: new Date().toISOString()
      }))
    } catch (error) {
      console.error('Failed to generate milestone suggestions:', error)
      return []
    }
  }

  /**
   * Analyze project progress and provide insights
   */
  async analyzeProject(project: any, tasks: any[], milestones: any[]): Promise<AISuggestion> {
    const context = {
      project: {
        name: project.name,
        description: project.description,
        status: project.status,
        progress: project.progress_percentage,
        due_date: project.due_date
      },
      tasks: tasks.map(t => ({
        title: t.title,
        status: t.status,
        priority: t.priority,
        assignee: t.assignee_name
      })),
      milestones: milestones.map(m => ({
        title: m.title,
        status: m.status,
        progress: m.progress_percentage,
        due_date: m.due_date
      }))
    }

    const prompt = `Analyze this project data and provide insights about progress, risks, and recommendations. Focus on:
1. Current progress assessment
2. Potential risks or blockers
3. Recommendations for next steps

Project Data: ${JSON.stringify(context, null, 2)}

Provide a concise analysis with actionable insights.`

    try {
      const response = await this.generate({
        model: this.config.defaultModel,
        prompt,
        options: {
          temperature: 0.3,
          num_predict: 800
        }
      })

      return {
        id: `analysis-${Date.now()}`,
        type: 'analysis',
        title: 'Project Analysis',
        content: response.response,
        confidence: 0.9,
        metadata: {
          project_id: project.id,
          analysis_type: 'progress'
        },
        created_at: new Date().toISOString()
      }
    } catch (error) {
      console.error('Failed to analyze project:', error)
      return {
        id: `analysis-${Date.now()}`,
        type: 'analysis',
        title: 'Analysis Unavailable',
        content: 'Unable to generate project analysis at this time.',
        confidence: 0.0,
        metadata: { project_id: project.id },
        created_at: new Date().toISOString()
      }
    }
  }

  /**
   * Generate code suggestions (for technical projects)
   */
  async suggestCode(task: any, context?: string): Promise<AISuggestion[]> {
    const prompt = `Based on this task, suggest code implementations or technical approaches. Be specific and provide actionable code suggestions.

Task: ${task.title}
Description: ${task.description || 'No description provided'}
Context: ${context || 'General development task'}

Provide 1-3 specific code suggestions or implementation approaches.`

    try {
      const response = await this.generate({
        model: this.config.codeModel,
        prompt,
        options: {
          temperature: 0.4,
          num_predict: 1000
        }
      })

      return [{
        id: `code-suggestion-${Date.now()}`,
        type: 'code',
        title: 'Code Implementation Suggestion',
        content: response.response,
        confidence: 0.75,
        metadata: {
          task_id: task.id,
          language: this.detectLanguage(context)
        },
        created_at: new Date().toISOString()
      }]
    } catch (error) {
      console.error('Failed to generate code suggestions:', error)
      return []
    }
  }

  /**
   * Store AI suggestion in database
   */
  async saveSuggestion(suggestion: AISuggestion): Promise<void> {
    try {
      const { error } = await supabase
        .from('ai_suggestions')
        .insert({
          suggestion_type: suggestion.type,
          content: suggestion.content,
          metadata: suggestion.metadata || {},
          created_at: suggestion.created_at
        })

      if (error) {
        console.error('Failed to save AI suggestion:', error)
      }
    } catch (error) {
      console.error('Error saving AI suggestion:', error)
    }
  }

  /**
   * Get stored AI suggestions
   */
  async getSuggestions(type?: string, limit = 50): Promise<AISuggestion[]> {
    try {
      let query = supabase
        .from('ai_suggestions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (type) {
        query = query.eq('type', type)
      }

      const { data, error } = await query

      if (error) {
        console.error('Failed to fetch AI suggestions:', error)
        return []
      }

      return (data || []).map(row => ({
        id: row.id,
        type: row.suggestion_type as any,
        title: 'AI Suggestion', // Default since not in DB
        content: row.content,
        confidence: 0.8, // Default since not in DB
        metadata: (row.metadata as Record<string, any>) || {},
        created_at: row.created_at || new Date().toISOString()
      }))
    } catch (error) {
      console.error('Error fetching AI suggestions:', error)
      return []
    }
  }

  /**
   * Private helper methods
   */
  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
    if (this.isProduction) {
      throw new Error('Ollama AI service is not available in production environment')
    }

    const url = `${this.config.host}${endpoint}`

    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
      },
      ...options
    }

    return fetch(url, defaultOptions)
  }

  private detectLanguage(context?: string): string {
    if (!context) return 'unknown'

    const lowerContext = context.toLowerCase()

    if (lowerContext.includes('javascript') || lowerContext.includes('typescript') || lowerContext.includes('react') || lowerContext.includes('node')) {
      return 'javascript'
    }

    if (lowerContext.includes('python') || lowerContext.includes('django') || lowerContext.includes('flask')) {
      return 'python'
    }

    if (lowerContext.includes('java') || lowerContext.includes('spring')) {
      return 'java'
    }

    if (lowerContext.includes('go') || lowerContext.includes('golang')) {
      return 'go'
    }

    return 'unknown'
  }
}

// Export singleton instance
export const ollamaService = new OllamaService()
