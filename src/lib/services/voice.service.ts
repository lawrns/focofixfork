/**
 * Voice Service - Conversational Project Management
 *
 * Handles voice transcription, intent parsing, multi-turn conversations,
 * and action execution for voice-first project management.
 *
 * Part of Foco's transformation to conversational PM (Phase 1: Voice Foundation)
 */

import OpenAI from 'openai'
import { aiService } from './ai-service'

// ============================================================================
// TYPES
// ============================================================================

// Basic entity types (inline to avoid import issues)
interface Task {
  id?: string
  title: string
  description?: string
  status?: 'todo' | 'in_progress' | 'review' | 'done' | 'blocked'
  priority?: 'low' | 'medium' | 'high' | 'critical'
  due_date?: string | null
  assignee?: string
}

export type VoiceIntent =
  | 'standup_update'     // Morning standup updates
  | 'create_project'     // Create new project
  | 'create_task'        // Create new task
  | 'update_task'        // Update existing task
  | 'query_status'       // Query project/task status
  | 'plan_conversation'  // Multi-turn planning conversation
  | 'quick_capture'      // Quick voice memo capture
  | 'unknown'            // Unrecognized intent

export interface VoiceTranscript {
  id: string
  text: string
  confidence: number
  duration: number
  timestamp: Date
  language?: string
}

export interface ParsedIntent {
  intent: VoiceIntent
  confidence: number
  entities: {
    tasks?: Array<{
      title: string
      status?: 'todo' | 'in_progress' | 'review' | 'done' | 'blocked'
      priority?: 'low' | 'medium' | 'high' | 'critical'
      assignee?: string
    }>
    projects?: Array<{
      title: string
      description?: string
      due_date?: string
    }>
    milestones?: Array<{
      title: string
      due_date?: string
    }>
    blockers?: string[]
    mentions?: string[]
    dates?: string[]
  }
  raw_text: string
  requires_confirmation: boolean
  suggested_actions: Action[]
}

export interface Action {
  id: string
  type: 'create' | 'update' | 'delete' | 'query'
  entity: 'task' | 'project' | 'milestone'
  data: any
  confirmation_message: string
}

export interface ConversationContext {
  conversation_id: string
  user_id: string
  organization_id?: string
  project_id?: string
  recent_messages: ConversationMessage[]
  user_preferences?: {
    default_priority?: string
    typical_team_size?: number
    preferred_duration_weeks?: number
  }
  metadata: {
    created_at: Date
    last_updated: Date
    turn_count: number
  }
}

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  intent?: VoiceIntent
  actions?: Action[]
}

export interface VoiceResponse {
  text: string
  actions?: Action[]
  requires_input?: boolean
  next_question?: string
}

// ============================================================================
// VOICE SERVICE CLASS
// ============================================================================

export class VoiceService {
  private client: OpenAI
  private config: {
    whisperModel: string
    maxConversationTurns: number
    confirmationThreshold: number
  }
  private conversations: Map<string, ConversationContext>

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY || ''

    if (!apiKey) {
      console.warn('⚠️  OpenAI API key not configured - voice transcription will not work')
    }

    this.client = new OpenAI({
      apiKey: apiKey || 'sk-mock-key-for-development',
    })

    this.config = {
      whisperModel: 'whisper-1',
      maxConversationTurns: 20,
      confirmationThreshold: 0.7,
    }

    this.conversations = new Map()
  }

  // ============================================================================
  // 1. VOICE TRANSCRIPTION
  // ============================================================================

  /**
   * Transcribe audio to text using OpenAI Whisper
   */
  async transcribe(audioBlob: Blob): Promise<VoiceTranscript> {
    try {
      const startTime = Date.now()

      // Convert Blob to File (Whisper API requires File object)
      const audioFile = new File([audioBlob], 'audio.webm', {
        type: audioBlob.type || 'audio/webm',
      })

      const transcription = await this.client.audio.transcriptions.create({
        file: audioFile,
        model: this.config.whisperModel,
        language: 'en', // Can be made configurable
        response_format: 'verbose_json',
      })

      const duration = Date.now() - startTime

      return {
        id: `transcript-${Date.now()}`,
        text: transcription.text,
        confidence: 0.95, // Whisper doesn't return confidence, use default high value
        duration,
        timestamp: new Date(),
        language: transcription.language,
      }
    } catch (error: any) {
      console.error('❌ Voice transcription error:', error)
      throw new Error(`Transcription failed: ${error.message}`)
    }
  }

  // ============================================================================
  // 2. INTENT PARSING
  // ============================================================================

  /**
   * Parse user intent from transcript with context awareness
   */
  async parseIntent(
    transcript: string,
    context?: {
      user_id: string
      organization_id?: string
      current_project?: any
      recent_tasks?: any[]
    }
  ): Promise<ParsedIntent> {
    try {
      const systemPrompt = `You are an AI assistant for a voice-first project management system called Foco.
Your job is to parse user voice input and extract actionable intents.

Context:
${context?.current_project ? `- Current project: ${context.current_project.title}` : ''}
${context?.recent_tasks?.length ? `- Recent tasks: ${context.recent_tasks.map(t => t.title).join(', ')}` : ''}

Available intents:
- "standup_update": User is giving a morning standup (completed tasks, in-progress, blockers)
- "create_project": User wants to create a new project
- "create_task": User wants to create a new task
- "update_task": User wants to update an existing task
- "query_status": User is asking about project/task status
- "plan_conversation": User wants to have a planning conversation
- "quick_capture": Quick note/reminder to process later
- "unknown": Cannot determine intent

Extract entities:
- Tasks (with title, status, priority, assignee if mentioned)
- Projects (with title, description, due date if mentioned)
- Blockers (things that are blocking progress)
- Mentions (people referenced by name)
- Dates (deadlines, due dates)

Return ONLY valid JSON with this structure:
{
  "intent": "standup_update",
  "confidence": 0.9,
  "entities": {
    "tasks": [{"title": "...", "status": "done"}],
    "blockers": ["waiting for design feedback"],
    "mentions": ["Sarah"]
  },
  "requires_confirmation": false,
  "suggested_actions": [
    {
      "id": "action-1",
      "type": "update",
      "entity": "task",
      "data": {"title": "Auth Bug", "status": "done"},
      "confirmation_message": "Mark 'Auth Bug' as complete?"
    }
  ]
}`

      const content = await aiService.chatCompletion([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Parse this voice input: "${transcript}"` }
      ])

      if (!content) {
        throw new Error('No response from AI service')
      }

      // Parse JSON response
      let parsed: ParsedIntent
      try {
        parsed = JSON.parse(content)
      } catch {
        // Try to extract JSON from markdown code blocks
        const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/)
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[1])
        } else {
          throw new Error('Could not parse intent JSON')
        }
      }

      // Add raw text
      parsed.raw_text = transcript

      return parsed
    } catch (error: any) {
      console.error('❌ Intent parsing error:', error)

      // Return fallback unknown intent
      return {
        intent: 'unknown',
        confidence: 0.0,
        entities: {},
        raw_text: transcript,
        requires_confirmation: true,
        suggested_actions: [],
      }
    }
  }

  // ============================================================================
  // 3. MULTI-TURN CONVERSATION
  // ============================================================================

  /**
   * Start a new conversation
   */
  startConversation(params: {
    user_id: string
    organization_id?: string
    project_id?: string
  }): ConversationContext {
    const conversation_id = `conv-${Date.now()}-${Math.random().toString(36).slice(2)}`

    const context: ConversationContext = {
      conversation_id,
      user_id: params.user_id,
      organization_id: params.organization_id,
      project_id: params.project_id,
      recent_messages: [],
      metadata: {
        created_at: new Date(),
        last_updated: new Date(),
        turn_count: 0,
      },
    }

    this.conversations.set(conversation_id, context)
    return context
  }

  /**
   * Continue an existing conversation with multi-turn support
   */
  async continueConversation(
    conversation_id: string,
    user_message: string,
    intent?: ParsedIntent
  ): Promise<VoiceResponse> {
    const context = this.conversations.get(conversation_id)

    if (!context) {
      throw new Error(`Conversation ${conversation_id} not found`)
    }

    // Add user message to history
    context.recent_messages.push({
      role: 'user',
      content: user_message,
      timestamp: new Date(),
      intent: intent?.intent,
      actions: intent?.suggested_actions,
    })

    context.metadata.turn_count++
    context.metadata.last_updated = new Date()

    // Limit message history
    if (context.recent_messages.length > this.config.maxConversationTurns * 2) {
      context.recent_messages = context.recent_messages.slice(-this.config.maxConversationTurns * 2)
    }

    try {
      // Build conversation history for GPT
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        {
          role: 'system',
          content: this.buildConversationalSystemPrompt(context),
        },
        ...context.recent_messages.slice(-10).map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
      ]

      const responseText = await aiService.chatCompletion(messages) || 'I understand. What would you like to do next?'

      // Add assistant response to history
      context.recent_messages.push({
        role: 'assistant',
        content: responseText,
        timestamp: new Date(),
      })

      // Update conversation context
      this.conversations.set(conversation_id, context)

      // Determine if we need more input
      const needsInput = this.detectNeedsInput(responseText)

      return {
        text: responseText,
        actions: intent?.suggested_actions,
        requires_input: needsInput,
        next_question: needsInput ? this.extractQuestion(responseText) : undefined,
      }
    } catch (error: any) {
      console.error('❌ Conversation error:', error)
      throw new Error(`Failed to continue conversation: ${error.message}`)
    }
  }

  /**
   * Get conversation context
   */
  getConversation(conversation_id: string): ConversationContext | undefined {
    return this.conversations.get(conversation_id)
  }

  /**
   * End conversation and clean up
   */
  endConversation(conversation_id: string): void {
    this.conversations.delete(conversation_id)
  }

  // ============================================================================
  // 4. VOICE-TO-TASK QUICK CAPTURE
  // ============================================================================

  /**
   * Quick capture: Convert voice memo to structured task
   */
  async quickCapture(params: {
    transcript: string
    user_id: string
    organization_id?: string
    project_id?: string
  }): Promise<{
    task: Partial<Task>
    confidence: number
    needs_clarification: boolean
  }> {
    try {
      const systemPrompt = `You are extracting a task from a quick voice memo.
Extract the task title and any details mentioned.

Return ONLY valid JSON:
{
  "title": "Task title (clear, actionable)",
  "description": "Additional details if mentioned",
  "priority": "medium",
  "due_date": "YYYY-MM-DD or null",
  "confidence": 0.9,
  "needs_clarification": false
}`

      const content = await aiService.chatCompletion([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Extract task from: "${params.transcript}"` }
      ])

      if (!content) {
        throw new Error('No response from AI service')
      }

      const result = JSON.parse(content)

      return {
        task: {
          title: result.title,
          description: result.description,
          priority: result.priority || 'medium',
          due_date: result.due_date,
          status: 'todo',
        },
        confidence: result.confidence || 0.8,
        needs_clarification: result.needs_clarification || false,
      }
    } catch (error: any) {
      console.error('❌ Quick capture error:', error)

      // Fallback: use transcript as task title
      return {
        task: {
          title: params.transcript.slice(0, 100),
          description: params.transcript,
          priority: 'medium',
          status: 'todo',
        },
        confidence: 0.5,
        needs_clarification: true,
      }
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private buildConversationalSystemPrompt(context: ConversationContext): string {
    return `You are Foco, an AI assistant for conversational project management.

Current context:
- User ID: ${context.user_id}
${context.project_id ? `- Current project: ${context.project_id}` : ''}
${context.organization_id ? `- Organization: ${context.organization_id}` : ''}
- Conversation turns: ${context.metadata.turn_count}

Your role:
- Help users create projects, tasks, and milestones through natural conversation
- Ask clarifying questions when needed (team size, timeline, requirements)
- Be concise and actionable
- Confirm actions before executing ("Should I create this project?")
- Remember context from previous messages

Style:
- Professional but friendly
- Use bullet points for lists
- Keep responses under 3 sentences when possible
- Use emojis sparingly (only for emphasis)

When ready to execute:
- Clearly state what you'll do
- Ask for confirmation if confidence < 90%`
  }

  private detectNeedsInput(responseText: string): boolean {
    const questionMarkers = ['?', 'when ', 'who ', 'what ', 'which ', 'how ']
    return questionMarkers.some(marker => responseText.toLowerCase().includes(marker))
  }

  private extractQuestion(responseText: string): string | undefined {
    const sentences = responseText.split(/[.!?]+/)
    const question = sentences.find(s => s.trim().includes('?'))
    return question?.trim()
  }

  /**
   * Validate intent confidence and return whether to proceed
   */
  shouldConfirm(intent: ParsedIntent): boolean {
    return (
      intent.requires_confirmation ||
      intent.confidence < this.config.confirmationThreshold ||
      intent.intent === 'unknown'
    )
  }

  /**
   * Generate confirmation message for actions
   */
  generateConfirmationMessage(actions: Action[]): string {
    if (actions.length === 0) return ''
    if (actions.length === 1) return actions[0].confirmation_message

    const summary = actions.map(a => `• ${a.confirmation_message}`).join('\n')
    return `I'll perform these actions:\n${summary}\n\nProceed?`
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const voiceService = new VoiceService()
