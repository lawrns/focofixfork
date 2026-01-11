import { z } from 'zod'
import { FeatureFlagContext } from '../feature-flags/feature-flags'
import { VoicePlanningValidator } from './schemas'

/**
 * Intent Extraction Service
 * Extracts user intent from voice transcriptions using regex patterns and LLM refinement
 */

// Intent types
export enum IntentType {
  CREATE_PROJECT = 'create_project',
  UPDATE_PROJECT = 'update_project',
  DELETE_PROJECT = 'delete_project',
  CREATE_TASK = 'create_task',
  UPDATE_TASK = 'update_task',
  DELETE_TASK = 'delete_task',
  CREATE_MILESTONE = 'create_milestone',
  UPDATE_MILESTONE = 'update_milestone',
  DELETE_MILESTONE = 'delete_milestone',
  ASSIGN_TASK = 'assign_task',
  SET_DEADLINE = 'set_deadline',
  UPDATE_STATUS = 'update_status',
  GENERATE_REPORT = 'generate_report',
  SCHEDULE_MEETING = 'schedule_meeting',
  UNKNOWN = 'unknown'
}

// Intent schemas
export const IntentExtractionSchema = z.object({
  intent: z.nativeEnum(IntentType),
  confidence: z.number().min(0).max(100),
  entities: z.array(z.object({
    type: z.string(),
    value: z.string(),
    startIndex: z.number(),
    endIndex: z.number(),
    confidence: z.number().min(0).max(100)
  })),
  parameters: z.record(z.any()),
  processingTime: z.number().min(0),
  method: z.enum(['regex', 'llm', 'hybrid'])
})

export type IntentExtraction = z.infer<typeof IntentExtractionSchema>

// Entity types
export enum EntityType {
  PROJECT_NAME = 'project_name',
  TASK_TITLE = 'task_title',
  MILESTONE_TITLE = 'milestone_title',
  PERSON_NAME = 'person_name',
  DATE = 'date',
  TIME = 'time',
  DURATION = 'duration',
  PRIORITY = 'priority',
  STATUS = 'status',
  BUDGET = 'budget',
  TEAM_SIZE = 'team_size',
  DEPARTMENT = 'department'
}

// Regex patterns for intent detection
const INTENT_PATTERNS = {
  [IntentType.CREATE_PROJECT]: [
    /(?:create|start|begin|launch|initiate)\s+(?:a\s+)?(?:new\s+)?project\s+(?:called\s+)?(.+)/i,
    /(?:i\s+want\s+to|i\s+need\s+to|let's)\s+(?:create|start|begin|launch)\s+(?:a\s+)?(?:new\s+)?project\s+(?:called\s+)?(.+)/i,
    /(?:we\s+should|we\s+need\s+to)\s+(?:create|start|begin|launch)\s+(?:a\s+)?(?:new\s+)?project\s+(?:called\s+)?(.+)/i
  ],
  [IntentType.CREATE_TASK]: [
    /(?:create|add|make)\s+(?:a\s+)?(?:new\s+)?task\s+(?:called\s+)?(.+)/i,
    /(?:i\s+want\s+to|i\s+need\s+to)\s+(?:create|add|make)\s+(?:a\s+)?(?:new\s+)?task\s+(?:called\s+)?(.+)/i,
    /(?:add\s+)?(?:a\s+)?task\s+(?:called\s+)?(.+)/i
  ],
  [IntentType.CREATE_MILESTONE]: [
    /(?:create|add|set)\s+(?:a\s+)?(?:new\s+)?milestone\s+(?:called\s+)?(.+)/i,
    /(?:i\s+want\s+to|i\s+need\s+to)\s+(?:create|add|set)\s+(?:a\s+)?(?:new\s+)?milestone\s+(?:called\s+)?(.+)/i
  ],
  [IntentType.ASSIGN_TASK]: [
    /(?:assign|give|delegate)\s+(?:task\s+)?(.+)\s+(?:to|for)\s+(.+)/i,
    /(.+)\s+(?:should|needs\s+to)\s+(?:handle|work\s+on|take)\s+(?:task\s+)?(.+)/i
  ],
  [IntentType.SET_DEADLINE]: [
    /(?:set|establish|define)\s+(?:a\s+)?(?:deadline|due\s+date)\s+(?:for|of)\s+(.+)\s+(?:by|on|before)\s+(.+)/i,
    /(.+)\s+(?:is\s+due|needs\s+to\s+be\s+done|must\s+be\s+completed)\s+(?:by|on|before)\s+(.+)/i
  ],
  [IntentType.UPDATE_STATUS]: [
    /(?:mark|set|change|update)\s+(.+)\s+(?:as|to)\s+(.+)/i,
    /(.+)\s+(?:is|has\s+been|should\s+be)\s+(.+)/i
  ],
  [IntentType.GENERATE_REPORT]: [
    /(?:generate|create|make)\s+(?:a\s+)?(?:report|summary|overview)\s+(?:for|of|about)\s+(.+)/i,
    /(?:i\s+want\s+to|i\s+need\s+to)\s+(?:generate|create|make)\s+(?:a\s+)?(?:report|summary|overview)\s+(?:for|of|about)\s+(.+)/i
  ],
  [IntentType.SCHEDULE_MEETING]: [
    /(?:schedule|set|arrange|organize)\s+(?:a\s+)?meeting\s+(?:with|for)\s+(.+)\s+(?:on|at|for)\s+(.+)/i,
    /(?:let's|we\s+should)\s+(?:meet|have\s+a\s+meeting)\s+(?:with|for)\s+(.+)\s+(?:on|at|for)\s+(.+)/i
  ]
}

// Entity extraction patterns
const ENTITY_PATTERNS = {
  [EntityType.PROJECT_NAME]: [
    /(?:project|initiative)\s+(?:called|named)\s+([A-Z][a-zA-Z\s]+)/gi,
    /(?:["'])([A-Z][a-zA-Z\s]+)(?:["'])/gi
  ],
  [EntityType.TASK_TITLE]: [
    /(?:task|item)\s+(?:called|named)\s+([A-Z][a-zA-Z\s]+)/gi,
    /(?:["'])([A-Z][a-zA-Z\s]+)(?:["'])/gi
  ],
  [EntityType.PERSON_NAME]: [
    /\b([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/g,
    /(?:assign|delegate)\s+(?:to|for)\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/gi
  ],
  [EntityType.DATE]: [
    /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?(?:,\s+\d{4})?\b/gi,
    /\b\d{1,2}\/\d{1,2}\/\d{4}\b/g,
    /\b(?:today|tomorrow|yesterday|next\s+week|next\s+month|in\s+\d+\s+days?)\b/gi
  ],
  [EntityType.TIME]: [
    /\b\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?\b/g,
    /\b(?:noon|midnight|morning|afternoon|evening)\b/gi
  ],
  [EntityType.DURATION]: [
    /\b\d+\s+(?:hours?|days?|weeks?|months?)\b/gi,
    /\b(?:a\s+few|several|many)\s+(?:hours?|days?|weeks?)\b/gi
  ],
  [EntityType.PRIORITY]: [
    /\b(?:high|medium|low|critical|urgent)\s+(?:priority|importance)\b/gi,
    /\b(?:asap|urgent|immediately|right\s+away)\b/gi
  ],
  [EntityType.STATUS]: [
    /\b(?:completed|done|finished|in\s+progress|started|pending|blocked|on\s+hold|cancelled)\b/gi
  ],
  [EntityType.BUDGET]: [
    /\$\s*\d{1,3}(?:,\d{3})*(?:\.\d{2})?\b/g,
    /\b\d{1,3}(?:,\d{3})*(?:\.\d{2})?\s*(?:dollars?|USD|budget)\b/gi
  ],
  [EntityType.TEAM_SIZE]: [
    /\b\d+\s+(?:people|person|team\s+members?|developers?|staff)\b/gi
  ],
  [EntityType.DEPARTMENT]: [
    /\b(?:engineering|marketing|sales|finance|hr|operations|product|design)\s+(?:team|department)\b/gi
  ]
}

/**
 * Intent Extraction Service
 */
export class IntentExtractionService {
  private context: FeatureFlagContext

  constructor(context: FeatureFlagContext) {
    this.context = context
  }

  /**
   * Extract intent from transcription text
   */
  async extractIntent(transcription: string): Promise<IntentExtraction> {
    const startTime = Date.now()

    try {
      // Step 1: Try regex-based extraction
      const regexResult = this.extractWithRegex(transcription)
      
      if (regexResult.confidence > 70) {
        // High confidence regex result, return it
        return {
          ...regexResult,
          processingTime: Date.now() - startTime,
          method: 'regex'
        }
      }

      // Step 2: Use LLM for refinement if regex confidence is low
      const llmResult = await this.extractWithLLM(transcription)
      
      // Step 3: Combine results (hybrid approach)
      const hybridResult = this.combineResults(regexResult, llmResult)
      
      return {
        ...hybridResult,
        processingTime: Date.now() - startTime,
        method: 'hybrid'
      }

    } catch (error) {
      console.error('Intent extraction failed:', error)
      
      // Fallback to unknown intent
      return {
        intent: IntentType.UNKNOWN,
        confidence: 0,
        entities: [],
        parameters: {},
        processingTime: Date.now() - startTime,
        method: 'regex'
      }
    }
  }

  /**
   * Extract intent using regex patterns
   */
  private extractWithRegex(text: string): Omit<IntentExtraction, 'processingTime' | 'method'> {
    let bestMatch: { intent: IntentType; confidence: number; entities: any[]; parameters: any } = {
      intent: IntentType.UNKNOWN,
      confidence: 0,
      entities: [],
      parameters: {}
    }

    // Test each intent pattern
    for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
      for (const pattern of patterns) {
        const match = text.match(pattern)
        if (match) {
          const confidence = this.calculateRegexConfidence(text, pattern, match)
          
          if (confidence > bestMatch.confidence) {
            const entities = this.extractEntities(text)
            const parameters = this.extractParameters(match, intent as IntentType)
            
            bestMatch = {
              intent: intent as IntentType,
              confidence,
              entities,
              parameters
            }
          }
        }
      }
    }

    return bestMatch
  }

  /**
   * Extract intent using LLM
   */
  private async extractWithLLM(text: string): Promise<Omit<IntentExtraction, 'processingTime' | 'method'>> {
    try {
      // In a real implementation, this would call an LLM API
      // For now, we'll simulate with a mock response
      const mockLLMResponse = this.simulateLLMExtraction(text)
      
      return mockLLMResponse
    } catch (error) {
      console.error('LLM intent extraction failed:', error)
      
      return {
        intent: IntentType.UNKNOWN,
        confidence: 0,
        entities: [],
        parameters: {}
      }
    }
  }

  /**
   * Combine regex and LLM results
   */
  private combineResults(
    regexResult: Omit<IntentExtraction, 'processingTime' | 'method'>,
    llmResult: Omit<IntentExtraction, 'processingTime' | 'method'>
  ): Omit<IntentExtraction, 'processingTime' | 'method'> {
    
    // If both agree on intent, use LLM entities but regex confidence boost
    if (regexResult.intent === llmResult.intent && regexResult.intent !== IntentType.UNKNOWN) {
      return {
        intent: regexResult.intent,
        confidence: Math.min(95, regexResult.confidence + 15),
        entities: llmResult.entities,
        parameters: { ...regexResult.parameters, ...llmResult.parameters }
      }
    }

    // If LLM has higher confidence, use LLM result
    if (llmResult.confidence > regexResult.confidence) {
      return llmResult
    }

    // Otherwise, use regex result
    return regexResult
  }

  /**
   * Calculate confidence for regex match
   */
  private calculateRegexConfidence(text: string, pattern: RegExp, match: RegExpMatchArray): number {
    let confidence = 50 // Base confidence for any match

    // Boost confidence based on pattern specificity
    if (pattern.source.includes('create|start|begin|launch|initiate')) {
      confidence += 20
    }

    // Boost confidence based on match quality
    if (match[1] && match[1].length > 5) {
      confidence += 15
    }

    // Boost confidence if text contains intent-specific keywords
    const intentKeywords = ['project', 'task', 'milestone', 'assign', 'deadline', 'status', 'report', 'meeting']
    const keywordCount = intentKeywords.filter(keyword => 
      text.toLowerCase().includes(keyword.toLowerCase())
    ).length
    confidence += Math.min(15, keywordCount * 5)

    return Math.min(100, confidence)
  }

  /**
   * Extract entities from text
   */
  private extractEntities(text: string): any[] {
    const entities: any[] = []

    for (const [entityType, patterns] of Object.entries(ENTITY_PATTERNS)) {
      for (const pattern of patterns) {
        const matches = text.matchAll(pattern)
        
        for (const match of matches) {
          if (match.index !== undefined) {
            entities.push({
              type: entityType,
              value: match[1] || match[0],
              startIndex: match.index,
              endIndex: match.index + match[0].length,
              confidence: 80 // Base confidence for entity extraction
            })
          }
        }
      }
    }

    return entities
  }

  /**
   * Extract parameters from regex match
   */
  private extractParameters(match: RegExpMatchArray, intent: IntentType): Record<string, any> {
    const parameters: Record<string, any> = {}

    switch (intent) {
      case IntentType.CREATE_PROJECT:
        if (match[1]) parameters.projectName = match[1].trim()
        break
      case IntentType.CREATE_TASK:
        if (match[1]) parameters.taskTitle = match[1].trim()
        break
      case IntentType.CREATE_MILESTONE:
        if (match[1]) parameters.milestoneTitle = match[1].trim()
        break
      case IntentType.ASSIGN_TASK:
        if (match[1]) parameters.taskName = match[1].trim()
        if (match[2]) parameters.assignee = match[2].trim()
        break
      case IntentType.SET_DEADLINE:
        if (match[1]) parameters.itemName = match[1].trim()
        if (match[2]) parameters.deadline = match[2].trim()
        break
      case IntentType.UPDATE_STATUS:
        if (match[1]) parameters.itemName = match[1].trim()
        if (match[2]) parameters.status = match[2].trim()
        break
      case IntentType.GENERATE_REPORT:
        if (match[1]) parameters.reportType = match[1].trim()
        break
      case IntentType.SCHEDULE_MEETING:
        if (match[1]) parameters.attendees = match[1].trim()
        if (match[2]) parameters.meetingTime = match[2].trim()
        break
    }

    return parameters
  }

  /**
   * Simulate LLM extraction (mock implementation)
   */
  private async simulateLLMExtraction(text: string): Promise<Omit<IntentExtraction, 'processingTime' | 'method'>> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100))

    const lowerText = text.toLowerCase()
    
    // Simple keyword-based intent detection for mock
    if (lowerText.includes('create') && lowerText.includes('project')) {
      return {
        intent: IntentType.CREATE_PROJECT,
        confidence: 85,
        entities: this.extractEntities(text),
        parameters: { projectName: this.extractProjectName(text) }
      }
    }

    if (lowerText.includes('create') && lowerText.includes('task')) {
      return {
        intent: IntentType.CREATE_TASK,
        confidence: 80,
        entities: this.extractEntities(text),
        parameters: { taskTitle: this.extractTaskTitle(text) }
      }
    }

    if (lowerText.includes('assign') || lowerText.includes('delegate')) {
      return {
        intent: IntentType.ASSIGN_TASK,
        confidence: 75,
        entities: this.extractEntities(text),
        parameters: this.extractAssignmentParameters(text)
      }
    }

    if (lowerText.includes('deadline') || lowerText.includes('due')) {
      return {
        intent: IntentType.SET_DEADLINE,
        confidence: 78,
        entities: this.extractEntities(text),
        parameters: this.extractDeadlineParameters(text)
      }
    }

    return {
      intent: IntentType.UNKNOWN,
      confidence: 30,
      entities: [],
      parameters: {}
    }
  }

  /**
   * Helper methods for parameter extraction
   */
  private extractProjectName(text: string): string {
    const match = text.match(/(?:project|initiative)\s+(?:called|named)?\s*["']?([^"']+)["']?/i)
    return match ? match[1].trim() : ''
  }

  private extractTaskTitle(text: string): string {
    const match = text.match(/(?:task|item)\s+(?:called|named)?\s*["']?([^"']+)["']?/i)
    return match ? match[1].trim() : ''
  }

  private extractAssignmentParameters(text: string): Record<string, any> {
    const assignMatch = text.match(/(?:assign|delegate)\s+(.+?)\s+(?:to|for)\s+(.+)/i)
    if (assignMatch) {
      return {
        taskName: assignMatch[1].trim(),
        assignee: assignMatch[2].trim()
      }
    }
    return {}
  }

  private extractDeadlineParameters(text: string): Record<string, any> {
    const deadlineMatch = text.match(/(.+?)\s+(?:by|on|before)\s+(.+)/i)
    if (deadlineMatch) {
      return {
        itemName: deadlineMatch[1].trim(),
        deadline: deadlineMatch[2].trim()
      }
    }
    return {}
  }
}

// Export singleton instance
export const intentExtractionService = (context: FeatureFlagContext) => 
  new IntentExtractionService(context)

// Convenience functions
export async function extractIntent(
  transcription: string,
  context: FeatureFlagContext
): Promise<IntentExtraction> {
  const service = new IntentExtractionService(context)
  return await service.extractIntent(transcription)
}

// Export types and schemas (schemas are already exported inline above)
