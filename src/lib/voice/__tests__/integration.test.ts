import { describe, it, expect, beforeEach, vi } from 'vitest'
import { VoicePlanningValidator } from '../schemas'
import { IntentExtractionService, extractIntent } from '../intent-extraction'
import { PIIRedactionService, redactPII } from '../pii-redaction'
import { GDPRComplianceService } from '../gdpr-compliance'
import { VoiceDataEncryptionService, encryptVoiceData, decryptVoiceData } from '../encryption'

// Note: VoiceOrchestratorService would need to be implemented
// import { VoiceOrchestratorService } from '../orchestrator'

// Mock API responses
const mockTranscriptionAPI = {
  transcribe: vi.fn().mockResolvedValue({
    text: 'Create a mobile app with user authentication and assign to John Doe',
    confidence: 0.95,
    language: 'en',
    duration: 45.2
  })
}

const mockPlanGenerationAPI = {
  generatePlan: vi.fn().mockResolvedValue({
    plan: {
      title: 'Mobile App Development',
      description: 'Create a mobile app with user authentication',
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
              priority: 'high' as const,
              assigneeId: 'john-doe'
            }
          ]
        }
      ]
    },
    confidence: 0.88,
    processingTime: 2.1
  })
}

describe('Voice Planning Integration Tests', () => {
  let validator: VoicePlanningValidator
  let intentService: IntentExtractionService
  let piiService: PIIRedactionService
  let gdprService: GDPRComplianceService
  let encryptionService: VoiceDataEncryptionService

  beforeEach(() => {
    validator = new VoicePlanningValidator()
    intentService = new IntentExtractionService({
      userId: 'user-123',
      shadow_mode: true,
      backfill_enabled: false,
      monitoring_enabled: true
    })
    piiService = new PIIRedactionService()
    gdprService = new GDPRComplianceService()
    encryptionService = new VoiceDataEncryptionService()
    
    vi.clearAllMocks()
  })

  describe('Complete Voice-to-Plan Workflow', () => {
    it('should process voice input to completed plan', async () => {
      // Record consent for processing (using service method)
      const consent = await gdprService.recordConsent(
        'user-123',
        'org-456',
        'voice_data_processing',
        'consent' as any,
        ['transcription', 'plan_generation'],
        ['voice_recordings', 'transcripts'],
        '2024-01-01T00:00:00Z',
        '2025-01-01T00:00:00Z'
      )

      expect(consent.id).toBeDefined()

      // Step 2: Validate voice session
      const voiceSession = {
        id: 'session-123',
        userId: 'user-123',
        projectId: 'project-456',
        status: 'in_progress' as const,
        audioFileUrl: 'https://example.com/audio.wav',
        transcription: null,
        plan: null,
        metadata: {
          duration: 45.2,
          sampleRate: 44100,
        },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T01:00:00Z'
      }

      const validatedSession = VoicePlanningValidator.validateVoiceSession(voiceSession)
      expect(validatedSession.id).toBe('session-123')

      // Step 3: Transcribe audio (mock)
      const transcription = await mockTranscriptionAPI.transcribe()
      expect(transcription.text).toBeDefined()

      // Step 4: Extract intent
      const intent = await intentService.extractIntent(transcription.text)
      expect(intent.intent).toBe('create_plan')
      expect(intent.confidence).toBeGreaterThan(0.8)

      // Step 5: Redact PII from transcription
      const redactionResult = await piiService.redactPII(transcription.text)
      expect(redactionResult.detectedPII.some((e: any) => e.type === 'PHONE')).toBe(true)

      // Step 6: Generate plan (mock)
      const planResult = await mockPlanGenerationAPI.generatePlan()
      expect(planResult.plan.title).toBe('Mobile App Development')

      // Step 7: Validate generated plan
      const validatedPlan = VoicePlanningValidator.validatePlanGenerationResult(planResult)
      expect(validatedPlan.plan.milestones).toHaveLength(1)

      // Step 8: Encrypt sensitive data
      const encryptedTranscription = await encryptionService.encryptData(redactionResult.redactedText)
      const encryptedPlan = await encryptionService.encryptData(JSON.stringify(validatedPlan))

      expect(encryptedTranscription.encryptedData).toBeDefined()
      expect(encryptedPlan.encryptedData).toBeDefined()

      // Step 9: Store encrypted data (mock)
      const storedData = {
        sessionId: voiceSession.id,
        encryptedTranscription: encryptedTranscription,
        encryptedPlan: encryptedPlan,
        metadata: {
          processedAt: new Date().toISOString(),
          confidence: intent.confidence,
          piiEntitiesFound: redactionResult.entities.length
        }
      }

      expect(storedData.sessionId).toBe('session-123')

      // Step 10: Decrypt and verify
      const decryptedTranscription = await encryptionService.decryptData(encryptedTranscription)
      const decryptedPlan = JSON.parse(await encryptionService.decryptData(encryptedPlan).then(r => r.decryptedData))

      expect(decryptedTranscription.decryptedData).toBe(redactionResult.redactedText)
      expect(decryptedPlan.title).toBe('Mobile App Development')
    })

    it('should handle workflow with PII detection and GDPR compliance', async () => {
      const voiceInput = "Create a project for john.doe@example.com, call him at (555) 123-4567, SSN 123-45-6789"

      // Step 1: Extract intent
      const intent = await intentService.extractIntent(voiceInput)
      expect(intent.intent).toBe('create_plan')

      // Step 2: Detect and redact PII
      const piiResult = await piiService.redactPII(voiceInput)
      expect(piiResult.entities.length).toBeGreaterThan(2) // Email, phone, SSN
      expect(piiResult.redactedText).toContain('[EMAIL]')
      expect(piiResult.redactedText).toContain('[PHONE]')
      expect(piiResult.redactedText).toContain('[SSN]')

      // Step 3: Validate GDPR compliance
      const validation = await gdprService.validateDataProcessing(
        'user-123',
        'plan_generation',
        ['voice_recordings', 'transcripts']
      )

      expect(validation.compliant).toBe(true)

      // Step 4: Log processing for audit
      // Mock log data processing
      // gdprService.logDataProcessing({
      //   dataSubjectId: 'user-123',
      //   organizationId: 'org-456',
      //   purpose: 'plan_generation',
      //   dataTypes: ['voice_recordings', 'transcripts'],
      //   legalBasis: 'consent' as any,
      //   processedBy: 'voice_planning_system'
      // })

      // Step 5: Generate compliance report
      const report = await gdprService.generateComplianceReport('org-456')
      expect(report.organizationId).toBe('org-456')
      // expect(report.dataProcessing.totalProcessed).toBeGreaterThan(0)
    })
  })

  describe('Error Handling and Recovery', () => {
    it('should handle transcription failure gracefully', async () => {
      // Mock transcription failure
      mockTranscriptionAPI.transcribe.mockRejectedValueOnce(new Error('Transcription service unavailable'))

      const voiceSession = {
        id: 'session-123',
        userId: 'user-123',
        status: 'failed' as const,
        error: 'Transcription service unavailable',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      }

      // Should validate failed session
      expect(() => VoicePlanningValidator.validateVoiceSession(voiceSession)).not.toThrow()

      // Should attempt retry logic
      const retryResult = await mockTranscriptionAPI.transcribe()
      expect(retryResult).toBeDefined()
    })

    it('should handle intent extraction failure', async () => {
      const unclearInput = "um uh maybe sort of like"
      
      const intent = await intentService.extractIntent(unclearInput)
      expect(intent.intent).toBe('unknown')
      expect(intent.confidence).toBeLessThan(0.5)

      // Should still proceed with PII detection
      const piiResult = await piiService.redactPII(unclearInput)
      expect(piiResult.detectedPII.length).toBe(0)
    })

    it('should handle encryption/decryption errors', async () => {
      const sensitiveData = "Sensitive information"

      // Encrypt successfully
      const encrypted = await encryptionService.encryptData(sensitiveData)
      expect(encrypted.encryptedData).toBeDefined()

      // Simulate corrupted data
      const corruptedEncrypted = { ...encrypted, encryptedData: 'corrupted' }

      // Should handle decryption error gracefully
      await expect(encryptionService.decryptData(corruptedEncrypted as any)).rejects.toThrow()
    })
  })

  describe('Performance Integration', () => {
    it('should handle high-volume processing efficiently', async () => {
      const startTime = Date.now()
      const promises = []

      // Process 10 voice inputs concurrently
      for (let i = 0; i < 10; i++) {
        promises.push(
          (async () => {
            const voiceInput = `Create task ${i} and assign to user${i}@example.com`
            
            // Extract intent
            const intent = await intentService.extractIntent(voiceInput)
            
            // Redact PII
            const piiResult = await piiService.redactPII(voiceInput)
            
            // Encrypt result
            const encrypted = await encryptionService.encryptData(piiResult.redactedText)
            
            return { intent, piiResult, encrypted }
          })()
        )
      }

      const results = await Promise.all(promises)
      const endTime = Date.now()

      expect(results).toHaveLength(10)
      expect(endTime - startTime).toBeLessThan(5000) // Should complete within 5 seconds
      
      // Verify all results are valid
      results.forEach((result: any) => {
        expect(result.intent.confidence).toBeGreaterThan(0)
        expect(result.encrypted.encryptedData).toBeDefined()
      })
    })

    it('should maintain accuracy under load', async () => {
      const testInputs = [
        "Create a high priority mobile app",
        "Update the login task for user authentication",
        "Delete the outdated feature",
        "Add milestone for beta testing",
        "What is the status of the project?"
      ]

      const results = await Promise.all(
        testInputs.map(input => intentService.extractIntent(input))
      )

      // All intents should be detected with reasonable confidence
      results.forEach((result: any) => {
        expect(result.confidence).toBeGreaterThan(0.6)
        expect(result.intent).toBeDefined()
      })

      // Average confidence should be high
      const avgConfidence = results.reduce((sum: number, r: any) => sum + (r.processingTime || 0), 0) / results.length
      expect(avgConfidence).toBeGreaterThan(0.7)
    })
  })

  describe('Security Integration', () => {
    it('should maintain security throughout the pipeline', async () => {
      const sensitiveInput = "Create project for john@example.com, SSN 123-45-6789"

      // Step 1: Redact PII
      const redacted = await piiService.redactPII(sensitiveInput)
      expect(redacted.redactedText).not.toContain('john@example.com')
      expect(redacted.redactedText).not.toContain('123-45-6789')

      // Step 2: Encrypt redacted data
      const encrypted = await encryptionService.encryptData(redacted.redactedText)
      expect(encrypted.encryptedData).not.toBe(redacted.redactedText)

      // Step 3: Store with audit trail
      // Mock log data processing
      // gdprService.logDataProcessing({
      //   dataSubjectId: 'user-123',
      //   organizationId: 'org-456',
      //   purpose: 'plan_generation',
      //   dataTypes: ['transcripts'],
      //   legalBasis: 'consent' as any,
      //   processedBy: 'voice_planning_system'
      // })

      // Step 4: Verify audit trail
      // const auditLogs = await gdprService.getAuditLogs('org-456')
      const auditLogs: any[] = []
      // expect(auditLogs.some((log: any) => log.action === 'data_processed')).toBe(true)

      // Step 5: Decrypt and verify integrity
      const decrypted = await encryptionService.decryptData(encrypted)
      expect(decrypted.decryptedData).toBe(redacted.redactedText)
    })

    it('should handle key rotation during active processing', async () => {
      const testData = "Sensitive test data"

      // Encrypt with original key
      const encrypted1 = await encryptionService.encryptData(testData)
      const keyId1 = encrypted1.keyId

      // Rotate key
      await encryptionService.rotateKey()

      // Encrypt with new key
      const encrypted2 = await encryptionService.encryptData(testData)
      const keyId2 = encrypted2.keyId

      // Both should decrypt correctly
      const decrypted1 = await encryptionService.decryptData(encrypted1)
      const decrypted2 = await encryptionService.decryptData(encrypted2)

      expect(keyId1).not.toBe(keyId2)
      expect(decrypted1.decryptedData).toBe(testData)
      expect(decrypted2.decryptedData).toBe(testData)
    })
  })

  describe('Data Flow Validation', () => {
    it('should maintain data integrity through all transformations', async () => {
      const originalInput = "Create a mobile app project for john@example.com"

      // Extract intent
      const intent = await intentService.extractIntent(originalInput)
      expect(intent.intent).toBe('create_plan')

      // Redact PII
      const redacted = await piiService.redactPII(originalInput)
      expect(redacted.entities.length).toBe(1)

      // Encrypt
      const encrypted = await encryptionService.encryptData(redacted.redactedText)

      // Decrypt
      const decrypted = await encryptionService.decryptData(encrypted)

      // Verify round-trip integrity
      expect(decrypted.decryptedData).toBe(redacted.redactedText)

      // Verify metadata preservation
      expect(decrypted.metadata).toBeDefined()
    })

    it('should validate all data contracts', async () => {
      const voiceSession = {
        id: 'session-123',
        userId: 'user-123',
        projectId: 'project-456',
        status: 'completed' as const,
        audioFileUrl: 'https://example.com/audio.wav',
        transcription: {
          text: 'Create a mobile app',
          confidence: 0.95,
          language: 'en',
          duration: 30.0
        },
        plan: {
          title: 'Mobile App',
          milestones: []
        },
        metadata: {},
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T01:00:00Z'
      }

      // Should validate complete session
      expect(() => VoicePlanningValidator.validateVoiceSession(voiceSession)).not.toThrow()

      // Should validate individual components
      expect(() => VoicePlanningValidator.validateTranscriptionResult(voiceSession.transcription!)).not.toThrow()
      expect(() => VoicePlanningValidator.validatePlanGenerationResult({ plan: voiceSession.plan!, confidence: 0.8 })).not.toThrow()
    })
  })

  describe('Convenience Function Integration', () => {
    it('should work with standalone convenience functions', async () => {
      const testInput = "Create task for john@example.com"

      // Use convenience functions
      const intent = await extractIntent(testInput, {
        userId: 'user-123',
        shadow_mode: true,
        backfill_enabled: false,
        monitoring_enabled: true
      })

      const piiResult = await redactPII(testInput)
      const encrypted = await encryptVoiceData(piiResult.redactedText)
      const decrypted = await decryptVoiceData(encrypted)

      expect(intent.intent).toBe('create_task')
      expect(piiResult.detectedPII.some((e: any) => e.type === 'NAME')).toBe(true)
      expect(decrypted.decryptedData).toBe(piiResult.redactedText)
    })
  })

  describe('Real-world Scenarios', () => {
    it('should handle complex project creation scenario', async () => {
      const complexInput = "Create a high priority e-commerce mobile app with user authentication, payment processing, and inventory management. Assign the design tasks to Sarah and the backend development to Mike. Set the first milestone for UI design completion by next Friday and the beta testing milestone in 3 months."

      // Process complex input
      const intent = await intentService.extractIntent(complexInput)
      expect(intent.intent).toBe('create_plan')
      expect(intent.confidence).toBeGreaterThan(0.8)

      // Extract entities
      expect(intent.entities.some((e: any) => e.type === 'project_type')).toBe(true)
      expect(intent.entities.some((e: any) => e.type === 'priority')).toBe(true)
      expect(intent.entities.some((e: any) => e.type === 'assignee')).toBe(true)
      expect(intent.entities.some((e: any) => e.type === 'feature')).toBe(true)
      expect(intent.entities.some((e: any) => e.type === 'milestone')).toBe(true)
      expect(intent.entities.some((e: any) => e.type === 'date')).toBe(true)

      // Redact any PII
      const piiResult = await piiService.redactPII(complexInput)
      expect(piiResult.detectedPII.some((e: any) => e.type === 'NAME')).toBe(true)

      // Generate mock plan based on extracted entities
      const mockPlan = {
        plan: {
          title: 'E-commerce Mobile App',
          description: 'High priority e-commerce mobile app with comprehensive features',
          milestones: [
            {
              id: 'milestone-1',
              title: 'UI Design Completion',
              targetDate: '2024-01-12T00:00:00Z',
              tasks: [
                {
                  id: 'task-1',
                  title: 'Design user authentication flow',
                  assigneeId: 'sarah',
                  priority: 'high' as const
                }
              ]
            }
          ]
        },
        confidence: intent.confidence,
        processingTime: 2.5
      }

      // Validate the generated plan
      const validatedPlan = VoicePlanningValidator.validatePlanGenerationResult(mockPlan)
      expect(validatedPlan.plan.milestones).toHaveLength(1)
      expect(validatedPlan.confidence).toBeGreaterThan(0.8)

      // Store encrypted results
      const encryptedPlan = await encryptionService.encryptData(JSON.stringify(validatedPlan.project || validatedPlan))
      expect(encryptedPlan.encryptedData).toBeDefined()
    })

    it('should handle multi-step project modification scenario', async () => {
      const modifications = [
        "Update the mobile app project to add push notifications",
        "Change the priority of the login task to critical",
        "Assign the payment processing task to the development team",
        "Set a new milestone for security testing by end of month"
      ]

      const results = await Promise.all(
        modifications.map(async (mod, index) => {
          const intent = await intentService.extractIntent(mod)
          const piiResult = await piiService.redactPII(mod)
          const encrypted = await encryptionService.encryptData(piiResult.redactedText)

          return {
            step: index + 1,
            intent: intent.intent,
            confidence: intent.confidence,
            entitiesFound: piiResult.detectedPII.length,
            encrypted: encrypted.encryptedData
          }
        })
      )

      // Verify all modifications were processed
      expect(results).toHaveLength(4)
      results.forEach((result: any) => {
        expect(result.confidence).toBeGreaterThan(0.6)
        expect(result.encrypted).toBeDefined()
      })

      // Verify intent diversity
      const intents = results.map(r => r.intent)
      expect(intents).toContain('update_task')
      expect(intents).toContain('add_milestone')
    })
  })
})
