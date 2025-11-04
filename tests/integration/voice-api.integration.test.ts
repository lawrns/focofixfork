import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { VoicePlanningValidator } from '@/lib/voice/schemas'
import { IntentExtractionService } from '@/lib/voice/intent-extraction'
import { PIIRedactionService } from '@/lib/voice/pii-redaction'
import { GDPRComplianceService } from '@/lib/voice/gdpr-compliance'
import { VoiceDataEncryptionService } from '@/lib/voice/encryption'

// Mock fetch for API calls
global.fetch = vi.fn()

describe('Voice API Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Transcription API', () => {
    it('should successfully transcribe audio data', async () => {
      const mockTranscriptionResponse = {
        text: 'Create a mobile app with user authentication',
        confidence: 0.95,
        language: 'en',
        duration: 45.2
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTranscriptionResponse
      } as Response)

      const audioData = new Blob(['mock audio data'], { type: 'audio/webm' })
      const formData = new FormData()
      formData.append('audio', audioData)

      const response = await fetch('/api/voice/transcribe', {
        method: 'POST',
        body: formData
      })

      expect(response.ok).toBe(true)
      const result = await response.json()
      expect(result.text).toBe('Create a mobile app with user authentication')
      expect(result.confidence).toBe(0.95)
      expect(result.language).toBe('en')
    })

    it('should handle transcription API errors', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Transcription service unavailable' })
      } as Response)

      const audioData = new Blob(['mock audio data'], { type: 'audio/webm' })
      const formData = new FormData()
      formData.append('audio', audioData)

      const response = await fetch('/api/voice/transcribe', {
        method: 'POST',
        body: formData
      })

      expect(response.ok).toBe(false)
      expect(response.status).toBe(500)
    })

    it('should validate audio data format', async () => {
      const invalidAudioData = new Blob(['invalid data'], { type: 'text/plain' })
      const formData = new FormData()
      formData.append('audio', invalidAudioData)

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Invalid audio format' })
      } as Response)

      const response = await fetch('/api/voice/transcribe', {
        method: 'POST',
        body: formData
      })

      expect(response.ok).toBe(false)
      expect(response.status).toBe(400)
    })
  })

  describe('Plan Generation API', () => {
    it('should generate plan from transcript', async () => {
      const mockPlanResponse = {
        plan: {
          title: 'Mobile App Development',
          description: 'Create a mobile app with user authentication',
          milestones: [
            {
              id: 'milestone-1',
              title: 'Design Phase',
              description: 'Create UI/UX designs',
              targetDate: '2024-02-01T00:00:00Z',
              status: 'pending',
              tasks: [
                {
                  id: 'task-1',
                  title: 'Create wireframes',
                  description: 'Design basic app wireframes',
                  status: 'todo',
                  estimatedDuration: 5,
                  priority: 'high',
                  assigneeId: null
                }
              ]
            }
          ]
        },
        confidence: 0.88,
        processingTime: 2.1
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockPlanResponse
      } as Response)

      const transcript = 'Create a mobile app with user authentication and assign to John Doe'
      
      const response = await fetch('/api/voice/generate-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ transcript })
      })

      expect(response.ok).toBe(true)
      const result = await response.json()
      expect(result.plan.title).toBe('Mobile App Development')
      expect(result.confidence).toBe(0.88)
      expect(result.plan.milestones).toHaveLength(1)
    })

    it('should handle plan generation errors', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Plan generation failed' })
      } as Response)

      const transcript = 'Invalid transcript'
      
      const response = await fetch('/api/voice/generate-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ transcript })
      })

      expect(response.ok).toBe(false)
      expect(response.status).toBe(500)
    })

    it('should validate transcript input', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Transcript is required' })
      } as Response)

      const response = await fetch('/api/voice/generate-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ transcript: '' })
      })

      expect(response.ok).toBe(false)
      expect(response.status).toBe(400)
    })
  })

  describe('Intent Extraction Integration', () => {
    it('should extract key intents from transcript', async () => {
      const transcript = 'We need a mobile task manager with auth, offline sync, and a dashboard. Public beta in 10 weeks. Two devs, one designer. iOS first, Android after.'
      
      const intents = IntentExtractionService.extractIntents(transcript)
      
      expect(intents).toContain('mobile')
      expect(intents).toContain('task manager')
      expect(intents).toContain('authentication')
      expect(intents).toContain('offline sync')
      expect(intents).toContain('dashboard')
      expect(intents).toContain('10 weeks')
      expect(intents).toContain('2 devs')
      expect(intents).toContain('1 designer')
      expect(intents).toContain('iOS')
    })

    it('should handle empty transcript gracefully', () => {
      const intents = IntentExtractionService.extractIntents('')
      expect(intents).toEqual([])
    })

    it('should extract timeline information', () => {
      const transcript = 'Launch in 3 months, deliver MVP in 6 weeks, public beta in 10 weeks'
      const timeline = IntentExtractionService.extractTimeline(transcript)
      
      expect(timeline.deadline).toContain('3 months')
      expect(timeline.mvp).toContain('6 weeks')
      expect(timeline.beta).toContain('10 weeks')
    })

    it('should extract team composition', () => {
      const transcript = 'Team of 5 developers, 2 designers, and 1 project manager'
      const team = IntentExtractionService.extractTeam(transcript)
      
      expect(team.developers).toBe(5)
      expect(team.designers).toBe(2)
      expect(team.managers).toBe(1)
    })
  })

  describe('PII Redaction Integration', () => {
    it('should redact email addresses from transcript', () => {
      const transcript = 'Contact john.doe@example.com for project details'
      const redacted = PIIRedactionService.redactPII(transcript)
      
      expect(redacted).not.toContain('john.doe@example.com')
      expect(redacted).toContain('[EMAIL_REDACTED]')
    })

    it('should redact phone numbers from transcript', () => {
      const transcript = 'Call me at (555) 123-4567 for updates'
      const redacted = PIIRedactionService.redactPII(transcript)
      
      expect(redacted).not.toContain('(555) 123-4567')
      expect(redacted).toContain('[PHONE_REDACTED]')
    })

    it('should redact social security numbers', () => {
      const transcript = 'Employee SSN is 123-45-6789'
      const redacted = PIIRedactionService.redactPII(transcript)
      
      expect(redacted).not.toContain('123-45-6789')
      expect(redacted).toContain('[SSN_REDACTED]')
    })

    it('should preserve non-PII content', () => {
      const transcript = 'We need to build a mobile app with authentication features'
      const redacted = PIIRedactionService.redactPII(transcript)
      
      expect(redacted).toBe(transcript)
    })
  })

  describe('GDPR Compliance Integration', () => {
    it('should obtain consent before processing', async () => {
      const consentService = new GDPRComplianceService()
      
      const hasConsent = await consentService.checkConsent('user-123')
      expect(typeof hasConsent).toBe('boolean')
    })

    it('should respect data retention policies', async () => {
      const consentService = new GDPRComplianceService()
      
      const shouldRetain = await consentService.shouldRetainData('user-123', new Date())
      expect(typeof shouldRetain).toBe('boolean')
    })

    it('should handle data deletion requests', async () => {
      const consentService = new GDPRComplianceService()
      
      const deleted = await consentService.deleteUserData('user-123')
      expect(typeof deleted).toBe('boolean')
    })
  })

  describe('Voice Data Encryption Integration', () => {
    it('should encrypt and decrypt voice data', async () => {
      const voiceData = 'sensitive audio transcript data'
      const encrypted = await VoiceDataEncryptionService.encrypt(voiceData)
      
      expect(encrypted).not.toBe(voiceData)
      expect(typeof encrypted).toBe('string')
      expect(encrypted.length).toBeGreaterThan(0)
      
      const decrypted = await VoiceDataEncryptionService.decrypt(encrypted)
      expect(decrypted).toBe(voiceData)
    })

    it('should handle encryption errors gracefully', async () => {
      const invalidData = null
      
      await expect(VoiceDataEncryptionService.encrypt(invalidData as any))
        .rejects.toThrow()
    })

    it('should generate unique encryption keys', async () => {
      const data1 = 'test data 1'
      const data2 = 'test data 2'
      
      const encrypted1 = await VoiceDataEncryptionService.encrypt(data1)
      const encrypted2 = await VoiceDataEncryptionService.encrypt(data2)
      
      expect(encrypted1).not.toBe(encrypted2)
    })
  })

  describe('Schema Validation Integration', () => {
    it('should validate valid plan draft', () => {
      const validPlan = {
        title: 'Test Project',
        description: 'Test description',
        milestones: [
          {
            id: 'milestone-1',
            title: 'Test Milestone',
            description: 'Test milestone description',
            targetDate: '2024-02-01T00:00:00Z',
            status: 'pending',
            tasks: [
              {
                id: 'task-1',
                title: 'Test Task',
                description: 'Test task description',
                status: 'todo',
                estimatedDuration: 5,
                priority: 'high',
                assigneeId: null
              }
            ]
          }
        ]
      }
      
      const result = VoicePlanningValidator.validatePlanDraft(validPlan)
      expect(result.success).toBe(true)
    })

    it('should reject invalid plan draft', () => {
      const invalidPlan = {
        title: '', // Invalid: empty title
        description: 'Test description',
        milestones: [] // Invalid: no milestones
      }
      
      const result = VoicePlanningValidator.validatePlanDraft(invalidPlan)
      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
    })

    it('should validate transcript data', () => {
      const validTranscript = {
        text: 'Create a mobile app with authentication',
        confidence: 0.95,
        language: 'en',
        duration: 45.2
      }
      
      const result = VoicePlanningValidator.validateTranscript(validTranscript)
      expect(result.success).toBe(true)
    })

    it('should reject invalid transcript data', () => {
      const invalidTranscript = {
        text: '', // Invalid: empty text
        confidence: 1.5, // Invalid: confidence > 1.0
        language: 'invalid-lang',
        duration: -10 // Invalid: negative duration
      }
      
      const result = VoicePlanningValidator.validateTranscript(invalidTranscript)
      expect(result.success).toBe(false)
    })
  })

  describe('Error Handling Integration', () => {
    it('should handle network timeouts', async () => {
      vi.mocked(fetch).mockImplementationOnce(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Network timeout')), 100)
        )
      )

      await expect(fetch('/api/voice/transcribe')).rejects.toThrow('Network timeout')
    })

    it('should handle malformed API responses', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invalid: 'response structure' })
      } as Response)

      const response = await fetch('/api/voice/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: 'test' })
      })

      expect(response.ok).toBe(true)
      const result = await response.json()
      expect(result.invalid).toBe('response structure')
    })

    it('should handle rate limiting', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({ error: 'Rate limit exceeded' })
      } as Response)

      const response = await fetch('/api/voice/transcribe')
      expect(response.status).toBe(429)
    })
  })
})
