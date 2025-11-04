import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest'
import { z } from 'zod'
import { 
  VoicePlanningValidator,
  VoiceSessionSchema,
  TranscriptionResultSchema,
  PlanGenerationResultSchema,
  VoicePlanCommitResultSchema,
  FeatureFlagsSchema
} from '../schemas'

// Mock data generators
const generateMockVoiceSession = () => ({
  id: 'session-123',
  userId: 'user-456',
  projectId: 'project-789',
  status: 'in_progress' as const,
  audioFileUrl: 'https://example.com/audio.wav',
  transcription: null,
  plan: null,
  metadata: {
    duration: 120,
    sampleRate: 44100,
    language: 'en'
  },
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T01:00:00Z'
})

const generateMockTranscriptionResult = () => ({
  text: 'Create a new mobile app with user authentication',
  confidence: 0.95,
  language: 'en',
  duration: 120.5,
  words: [
    { word: 'Create', start: 0.0, end: 0.5, confidence: 0.98 },
    { word: 'a', start: 0.6, end: 0.7, confidence: 0.95 },
    { word: 'new', start: 0.8, end: 1.0, confidence: 0.97 },
    { word: 'mobile', start: 1.1, end: 1.5, confidence: 0.96 },
    { word: 'app', start: 1.6, end: 1.8, confidence: 0.99 }
  ],
  alternatives: [
    { text: 'Create a new mobile application', confidence: 0.92 }
  ],
  metadata: {
    model: 'whisper-1',
    processingTime: 2.3
  }
})

const generateMockPlanGenerationResult = () => ({
  plan: {
    title: 'Mobile App Development',
    description: 'Create a new mobile app with user authentication',
    milestones: [
      {
        id: 'milestone-1',
        title: 'Design Phase',
        description: 'Create UI/UX designs',
        targetDate: '2024-02-01T00:00:00Z',
        tasks: [
          {
            id: 'task-1',
            title: 'Create wireframes',
            description: 'Design basic app wireframes',
            estimatedDuration: 5,
            priority: 'high' as const
          }
        ]
      }
    ]
  },
  confidence: 0.88,
  processingTime: 3.2,
  model: 'gpt-4',
  tokensUsed: 1250,
  metadata: {
    temperature: 0.7,
    maxTokens: 2000
  }
})

const generateMockFeatureFlags = () => ({
  voice_capture: true,
  plan_orchestration: true,
  plan_commit: false,
  shadow_mode: true,
  backfill_enabled: false,
  monitoring_enabled: true
})

describe('VoicePlanningValidator', () => {
  let validator: VoicePlanningValidator

  beforeEach(() => {
    validator = new VoicePlanningValidator()
  })

  describe('Voice Session Validation', () => {
    it('should validate a correct voice session', () => {
      const mockSession = generateMockVoiceSession()
      const result = VoicePlanningValidator.validateVoiceSession(mockSession)
      
      expect(result).toEqual(mockSession)
    })

    it('should throw error for invalid voice session', () => {
      const invalidSession = {
        ...generateMockVoiceSession(),
        id: '123', // Invalid type
        status: 'invalid_status' // Invalid enum value
      }

      expect(() => VoicePlanningValidator.validateVoiceSession(invalidSession)).toThrow()
    })

    it('should safely validate and return null for invalid data', () => {
      const invalidSession = { invalid: 'data' }
      const result = VoicePlanningValidator.safeValidateVoiceSession(invalidSession)
      
      expect(result).toBeNull()
    })

    it('should validate voice session with missing optional fields', () => {
      const minimalSession = {
        id: 'session-123',
        userId: 'user-456',
        projectId: 'project-789',
        status: 'pending' as const,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      }

      const result = VoicePlanningValidator.validateVoiceSession(minimalSession)
      expect(result).toEqual(minimalSession)
    })
  })

  describe('Transcription Result Validation', () => {
    it('should validate a correct transcription result', () => {
      const mockTranscription = generateMockTranscriptionResult()
      const result = VoicePlanningValidator.validateTranscriptionResult(mockTranscription)
      
      expect(result).toEqual(mockTranscription)
    })

    it('should throw error for transcription with invalid confidence', () => {
      const invalidTranscription = {
        ...generateMockTranscriptionResult(),
        confidence: 1.5 // Invalid confidence > 1
      }

      expect(() => VoicePlanningValidator.validateTranscriptionResult(invalidTranscription)).toThrow()
    })

    it('should validate transcription with minimal required fields', () => {
      const minimalTranscription = {
        text: 'Hello world',
        confidence: 0.9,
        language: 'en',
        duration: 2.5
      }

      const result = VoicePlanningValidator.validateTranscriptionResult(minimalTranscription)
      expect(result).toEqual(minimalTranscription)
    })
  })

  describe('Plan Generation Result Validation', () => {
    it('should validate a correct plan generation result', () => {
      const mockPlan = generateMockPlanGenerationResult()
      const result = VoicePlanningValidator.validatePlanGenerationResult(mockPlan)
      
      expect(result).toEqual(mockPlan)
    })

    it('should throw error for plan with invalid confidence', () => {
      const invalidPlan = {
        ...generateMockPlanGenerationResult(),
        confidence: -0.1 // Invalid negative confidence
      }

      expect(() => VoicePlanningValidator.validatePlanGenerationResult(invalidPlan)).toThrow()
    })

    it('should validate plan with empty milestones array', () => {
      const planWithEmptyMilestones = {
        ...generateMockPlanGenerationResult(),
        plan: {
          ...generateMockPlanGenerationResult().plan,
          milestones: []
        }
      }

      const result = VoicePlanningValidator.validatePlanGenerationResult(planWithEmptyMilestones)
      expect(result.plan.milestones).toEqual([])
    })
  })

  describe('Feature Flags Validation', () => {
    it('should validate correct feature flags', () => {
      const mockFlags = generateMockFeatureFlags()
      const result = VoicePlanningValidator.validateFeatureFlags(mockFlags)
      
      expect(result).toEqual(mockFlags)
    })

    it('should throw error for invalid feature flag values', () => {
      const invalidFlags = {
        ...generateMockFeatureFlags(),
        voice_capture: 'yes' // Should be boolean
      }

      expect(() => VoicePlanningValidator.validateFeatureFlags(invalidFlags)).toThrow()
    })

    it('should validate feature flags with missing optional flags', () => {
      const minimalFlags = {
        voice_capture: true,
        plan_orchestration: false
      }

      const result = VoicePlanningValidator.validateFeatureFlags(minimalFlags)
      expect(result.voice_capture).toBe(true)
      expect(result.plan_orchestration).toBe(false)
    })
  })

  describe('Schema Validation', () => {
    it('should validate voice session schema directly', () => {
      const mockSession = generateMockVoiceSession()
      const result = VoiceSessionSchema.parse(mockSession)
      
      expect(result).toEqual(mockSession)
    })

    it('should validate transcription result schema directly', () => {
      const mockTranscription = generateMockTranscriptionResult()
      const result = TranscriptionResultSchema.parse(mockTranscription)
      
      expect(result).toEqual(mockTranscription)
    })

    it('should validate plan generation result schema directly', () => {
      const mockPlan = generateMockPlanGenerationResult()
      const result = PlanGenerationResultSchema.parse(mockPlan)
      
      expect(result).toEqual(mockPlan)
    })

    it('should validate feature flags schema directly', () => {
      const mockFlags = generateMockFeatureFlags()
      const result = FeatureFlagsSchema.parse(mockFlags)
      
      expect(result).toEqual(mockFlags)
    })
  })

  describe('Error Handling', () => {
    it('should handle null input gracefully', () => {
      expect(() => VoicePlanningValidator.validateVoiceSession(null)).toThrow()
      expect(VoicePlanningValidator.safeValidateVoiceSession(null)).toBeNull()
    })

    it('should handle undefined input gracefully', () => {
      expect(() => VoicePlanningValidator.validateVoiceSession(undefined)).toThrow()
      expect(VoicePlanningValidator.safeValidateVoiceSession(undefined)).toBeNull()
    })

    it('should provide detailed error messages', () => {
      const invalidData = { invalid: 'data' }
      
      try {
        validator.validateVoiceSession(invalidData)
      } catch (error) {
        expect(error).toBeInstanceOf(z.ZodError)
      }
    })
  })

  describe('Complex Nested Validation', () => {
    it('should validate complex nested plan structure', () => {
      const complexPlan = {
        ...generateMockPlanGenerationResult(),
        plan: {
          title: 'Complex Project',
          description: 'A complex project with multiple milestones',
          milestones: [
            {
              id: 'milestone-1',
              title: 'Phase 1',
              description: 'First phase',
              targetDate: '2024-02-01T00:00:00Z',
              tasks: [
                {
                  id: 'task-1',
                  title: 'Task 1',
                  description: 'First task',
                  estimatedDuration: 3,
                  priority: 'high' as const,
                  dependencies: ['task-2'],
                  assigneeId: 'user-123'
                },
                {
                  id: 'task-2',
                  title: 'Task 2',
                  estimatedDuration: 2,
                  priority: 'medium' as const,
                  dependencies: []
                }
              ]
            },
            {
              id: 'milestone-2',
              title: 'Phase 2',
              targetDate: '2024-03-01T00:00:00Z',
              tasks: []
            }
          ]
        }
      }

      const result = VoicePlanningValidator.validatePlanGenerationResult(complexPlan)
      expect(result.plan.milestones).toHaveLength(2)
      expect(result.plan.milestones[0].tasks).toHaveLength(2)
    })
  })
})
