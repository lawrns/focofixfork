import { describe, it, expect, beforeEach, vi } from 'vitest'
import { 
  IntentExtractionService,
  extractIntent,
  IntentType,
  EntityType
} from '../intent-extraction'

// Mock feature flag context
const mockFeatureFlagContext = {
  userId: 'user-123',
  organizationId: 'org-456',
  environment: 'development' as const
}

describe('IntentExtractionService', () => {
  let service: IntentExtractionService

  beforeEach(() => {
    service = new IntentExtractionService(mockFeatureFlagContext)
  })

  describe('Intent Extraction', () => {
    it('should extract create_plan intent correctly', async () => {
      const transcription = "I want to create a new mobile app with user authentication for John"
      const result = await service.extractIntent(transcription)

      expect(result.intent).toBe(IntentType.CREATE_PROJECT)
      expect(result.confidence).toBeGreaterThan(0.8)
      expect(result.entities).toContainEqual({
        type: EntityType.PERSON_NAME,
        value: 'John',
        startIndex: expect.any(Number),
        endIndex: expect.any(Number),
        confidence: expect.any(Number)
      })
    })

    it('should extract update_task intent correctly', async () => {
      const transcription = "Update the login task to add two-factor authentication"
      const result = await service.extractIntent(transcription)

      expect(result.intent).toBe(IntentType.UPDATE_TASK)
      expect(result.confidence).toBeGreaterThan(0.7)
      expect(result.entities).toContainEqual({
        type: EntityType.TASK_TITLE,
        value: 'two-factor authentication',
        startIndex: expect.any(Number),
        endIndex: expect.any(Number),
        confidence: expect.any(Number)
      })
    })

    it('should extract add_milestone intent correctly', async () => {
      const transcription = "Add a milestone for beta testing next month"
      const result = await service.extractIntent(transcription)

      expect(result.intent).toBe(IntentType.CREATE_MILESTONE)
      expect(result.confidence).toBeGreaterThan(0.7)
      expect(result.entities).toContainEqual({
        type: EntityType.MILESTONE_TITLE,
        value: 'beta testing',
        startIndex: expect.any(Number),
        endIndex: expect.any(Number),
        confidence: expect.any(Number)
      })
    })

    it('should extract delete_task intent correctly', async () => {
      const transcription = "Delete the outdated login form task"
      const result = await service.extractIntent(transcription)

      expect(result.intent).toBe(IntentType.DELETE_TASK)
      expect(result.confidence).toBeGreaterThan(0.7)
    })

    it('should extract query_status intent correctly', async () => {
      const transcription = "What's the status of the mobile app project?"
      const result = await service.extractIntent(transcription)

      expect(result.intent).toBe(IntentType.GENERATE_REPORT)
      expect(result.confidence).toBeGreaterThan(0.6)
    })

    it('should return unknown intent for unclear transcription', async () => {
      const transcription = "Hello, how are you today?"
      const result = await service.extractIntent(transcription, {
        useLLM: true,
        timeout: 5000
      })

      expect(result.intent).toBe(IntentType.UNKNOWN)
      expect(result.confidence).toBeLessThan(0.5)
    })
  })

  describe('Entity Extraction', () => {
    it('should extract date entities correctly', async () => {
      const transcription = "Create a task due next Friday by 5 PM"
      const result = await service.extractIntent(transcription)

      const dateEntities = result.entities.filter(e => e.type === EntityType.DATE)
      expect(dateEntities.length).toBeGreaterThan(0)
      expect(dateEntities[0].value).toContain('Friday')
    })

    it('should extract priority entities correctly', async () => {
      const transcription = "This is a high priority task that needs immediate attention"
      const result = await service.extractIntent(transcription)

      const priorityEntities = result.entities.filter(e => e.type === EntityType.PRIORITY)
      expect(priorityEntities.length).toBeGreaterThan(0)
      expect(priorityEntities[0].value).toBe('high')
    })

    it('should extract assignee entities correctly', async () => {
      const transcription = "Assign this task to John for the frontend development"
      const result = await service.extractIntent(transcription)

      const assigneeEntities = result.entities.filter(e => e.type === EntityType.PERSON_NAME)
      expect(assigneeEntities.length).toBeGreaterThan(0)
      expect(assigneeEntities[0].value).toBe('John')
    })

    it('should extract duration entities correctly', async () => {
      const transcription = "This task should take about 3 days to complete"
      const result = await service.extractIntent(transcription, {
        useLLM: false // Disable LLM refinement
      })

      const durationEntities = result.entities.filter(e => e.type === EntityType.DURATION)
      expect(durationEntities.length).toBeGreaterThan(0)
      expect(durationEntities[0].value).toContain('3 days')
    })

    it('should extract multiple entities from complex transcription', async () => {
      const transcription = "Assign a high priority mobile app task to John due next Friday that should take 2 days"
      const result = await service.extractIntent(transcription)

      expect(result.entities.length).toBeGreaterThan(3)
      expect(result.entities.some(e => e.type === EntityType.PERSON_NAME)).toBe(true)
      expect(result.entities.some(e => e.type === EntityType.PRIORITY)).toBe(true)
      expect(result.entities.some(e => e.type === EntityType.PROJECT_NAME)).toBe(true)
      expect(result.entities.some(e => e.type === EntityType.DATE)).toBe(true)
      expect(result.entities.some(e => e.type === EntityType.DURATION)).toBe(true)
    })
  })

  describe('Confidence Scoring', () => {
    it('should assign high confidence for clear intents', async () => {
      const clearTranscription = "Create a new mobile app project"
      const result = await service.extractIntent(clearTranscription)

      expect(result.confidence).toBeGreaterThan(0.8)
    })

    it('should assign medium confidence for moderately clear intents', async () => {
      const moderateTranscription = "I think we should maybe create something for mobile"
      const result = await service.extractIntent(moderateTranscription)

      expect(result.confidence).toBeGreaterThan(0.5)
      expect(result.confidence).toBeLessThan(0.8)
    })

    it('should assign low confidence for ambiguous transcriptions', async () => {
      const ambiguousTranscription = "Maybe we could do something with the app sometime"
      const result = await service.extractIntent(ambiguousTranscription)

      expect(result.confidence).toBeLessThan(0.6)
    })
  })

  describe('Regex Pattern Matching', () => {
    it('should match create patterns correctly', () => {
      const createPatterns = [
        "create a new project",
        "make a new task",
        "build an app",
        "develop a feature",
        "start a milestone"
      ]

      createPatterns.forEach(pattern => {
        expect(service['matchesCreatePattern'](pattern)).toBe(true)
      })
    })

    it('should match update patterns correctly', () => {
      const updatePatterns = [
        "update the task",
        "modify the project",
        "change the milestone",
        "edit the feature",
        "adjust the timeline"
      ]

      updatePatterns.forEach(pattern => {
        expect(service['matchesUpdatePattern'](pattern)).toBe(true)
      })
    })

    it('should match delete patterns correctly', () => {
      const deletePatterns = [
        "delete the task",
        "remove the project",
        "cancel the milestone",
        "eliminate the feature"
      ]

      deletePatterns.forEach(pattern => {
        expect(service['matchesDeletePattern'](pattern)).toBe(true)
      })
    })

    it('should match query patterns correctly', () => {
      const queryPatterns = [
        "what is the status",
        "show me the progress",
        "how is the project doing",
        "check the task status",
        "tell me about the milestone"
      ]

      queryPatterns.forEach(pattern => {
        expect(service['matchesQueryPattern'](pattern)).toBe(true)
      })
    })
  })

  describe('Entity Extraction Methods', () => {
    it('should extract dates using regex patterns', () => {
      const text = "due next Friday by 5 PM"
      const dates = service['extractDates'](text)
      
      expect(dates.length).toBeGreaterThan(0)
      expect(dates[0]).toContain('Friday')
    })

    it('should extract priorities using regex patterns', () => {
      const text = "high priority urgent critical"
      const priorities = service['extractPriorities'](text)
      
      expect(priorities.length).toBeGreaterThan(0)
      expect(priorities[0].value).toBe('high')
    })

    it('should extract assignees using regex patterns', () => {
      const text = "assign to John Smith and Mary Johnson"
      const assignees = service['extractAssignees'](text)
      
      expect(assignees.length).toBeGreaterThan(0)
      expect(assignees[0].value).toBe('John Smith')
    })

    it('should extract durations using regex patterns', () => {
      const text = "takes 3 days and 2 hours"
      const durations = service['extractDurations'](text)
      
      expect(durations.length).toBeGreaterThan(0)
      expect(durations[0].value).toContain('3 days')
    })
  })

  describe('LLM Refinement', () => {
    it('should refine intent using LLM mock', async () => {
      const initialExtraction = {
        intent: IntentType.CREATE_PLAN,
        confidence: 0.7,
        entities: [
          { type: EntityType.PROJECT_TYPE, value: 'app', confidence: 0.8 }
        ]
      }

      const refined = await service['refineWithLLM'](initialExtraction, "create a mobile app")
      
      expect(refined.confidence).toBeGreaterThan(initialExtraction.confidence)
      expect(refined.entities.length).toBeGreaterThanOrEqual(initialExtraction.entities.length)
    })

    it('should handle LLM refinement errors gracefully', async () => {
      // Mock LLM failure
      const mockLLMCall = vi.spyOn(service as any, 'callLLM').mockRejectedValue(new Error('LLM failed'))
      
      const initialExtraction = {
        intent: IntentType.CREATE_PLAN,
        confidence: 0.7,
        entities: []
      }

      const result = await service['refineWithLLM'](initialExtraction, "test")
      
      expect(result).toEqual(initialExtraction)
      mockLLMCall.mockRestore()
    })

    it('should mock LLM refinement', async () => {
      // Mock LLM refinement
      vi.spyOn(service, 'refineWithLLM').mockResolvedValue({
        intent: IntentType.CREATE_PROJECT,
        confidence: 0.95,
        entities: [],
        parameters: {},
        processingTime: 100,
        method: 'llm' as const
      })

      const result = await service['refineWithLLM'](initialExtraction, "test")
      
      expect(result).toEqual(initialExtraction)
    })
  })

  describe('Hybrid Approach', () => {
    it('should combine regex and LLM results effectively', async () => {
      const transcription = "Create a high priority mobile app assigned to John due next Friday"
      const result = await service.extractIntent(transcription)

      expect(result.intent).toBe(IntentType.CREATE_PROJECT)
      expect(result.confidence).toBeGreaterThan(0.8)
      expect(result.entities.length).toBeGreaterThan(3)
    })

    it('should fallback to regex-only when LLM is disabled', async () => {
      const serviceWithoutLLM = new IntentExtractionService({
        ...mockFeatureFlagContext,
        plan_orchestration: false // Disable LLM
      })

      const result = await serviceWithoutLLM.extractIntent("create a new app")
      
      expect(result.intent).toBe(IntentType.CREATE_PROJECT)
      expect(result.confidence).toBeGreaterThan(0.6)
    })
  })

  describe('Error Handling', () => {
    it('should handle empty transcription gracefully', async () => {
      const result = await service.extractIntent("")
      
      expect(result.intent).toBe(IntentType.UNKNOWN)
      expect(result.confidence).toBe(0)
      expect(result.entities).toEqual([])
    })

    it('should handle null transcription gracefully', async () => {
      const result = await service.extractIntent(null as any)
      
      expect(result.intent).toBe(IntentType.UNKNOWN)
      expect(result.confidence).toBe(0)
      expect(result.entities).toEqual([])
    })

    it('should handle very long transcriptions', async () => {
      const longTranscription = "create ".repeat(1000) + "mobile app"
      const result = await service.extractIntent(longTranscription)
      
      expect(result.intent).toBe(IntentType.CREATE_PROJECT)
      expect(result.confidence).toBeGreaterThan(0)
    })
  })

  describe('Convenience Functions', () => {
    it('should work with standalone extractIntent function', async () => {
      const result = await extractIntent("create a new project", mockFeatureFlagContext)
      
      expect(result.intent).toBe(IntentType.CREATE_PROJECT)
      expect(result.confidence).toBeGreaterThan(0)
    })
  })
})
