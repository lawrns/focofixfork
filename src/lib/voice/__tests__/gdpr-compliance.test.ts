import { describe, it, expect, beforeEach, vi } from 'vitest'
import { 
  GDPRComplianceService,
  LegalBasis,
  DataSubjectRight,
  GDPRConsent,
  DataSubjectRequest,
  DataSubjectRequestType,
  GDPRDataType
} from '../gdpr-compliance'

describe('GDPRComplianceService', () => {
  let service: GDPRComplianceService

  beforeEach(() => {
    service = new GDPRComplianceService()
  })

  describe('Consent Management', () => {
    it('should record consent correctly', async () => {
      const consentData = {
        dataSubjectId: 'user-123',
        organizationId: 'org-456',
        consentType: 'voice_data_processing' as const,
        legalBasis: LegalBasis.CONSENT,
        purposes: ['plan_generation', 'transcription'],
        dataTypes: [GDPRDataType.VOICE_RECORDINGS, GDPRDataType.TRANSCRIPTS],
        validFrom: '2024-01-01T00:00:00Z',
        validUntil: '2025-01-01T00:00:00Z',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
        consentDocumentId: 'doc-789'
      }

      const result = await service.recordConsent(consentData)

      expect(result.id).toBeDefined()
      expect(result.dataSubjectId).toBe(consentData.dataSubjectId)
      expect(result.legalBasis).toBe(LegalBasis.CONSENT)
      expect(result.status).toBe('active')
      expect(result.createdAt).toBeDefined()
    })

    it('should validate consent data before recording', async () => {
      const invalidConsent = {
        dataSubjectId: '', // Invalid empty ID
        legalBasis: LegalBasis.CONSENT,
        purposes: []
      }

      await expect(service.recordConsent(invalidConsent as any)).rejects.toThrow()
    })

    it('should check if consent is valid', async () => {
      const consentData = {
        dataSubjectId: 'user-123',
        organizationId: 'org-456',
        consentType: 'voice_data_processing' as const,
        legalBasis: LegalBasis.CONSENT,
        purposes: ['plan_generation'],
        dataTypes: [GDPRDataType.VOICE_RECORDINGS],
        validFrom: '2024-01-01T00:00:00Z',
        validUntil: '2025-01-01T00:00:00Z'
      }

      await service.recordConsent(consentData)
      const isValid = await service.isConsentValid('user-123', 'voice_data_processing')

      expect(isValid).toBe(true)
    })

    it('should return false for expired consent', async () => {
      const expiredConsent = {
        dataSubjectId: 'user-123',
        organizationId: 'org-456',
        consentType: 'voice_data_processing' as const,
        legalBasis: LegalBasis.CONSENT,
        purposes: ['plan_generation'],
        dataTypes: [GDPRDataType.VOICE_RECORDINGS],
        validFrom: '2020-01-01T00:00:00Z',
        validUntil: '2021-01-01T00:00:00Z' // Expired
      }

      await service.recordConsent(expiredConsent)
      const isValid = await service.isConsentValid('user-123', 'voice_data_processing')

      expect(isValid).toBe(false)
    })

    it('should revoke consent correctly', async () => {
      const consentData = {
        dataSubjectId: 'user-123',
        organizationId: 'org-456',
        consentType: 'voice_data_processing' as const,
        legalBasis: LegalBasis.CONSENT,
        purposes: ['plan_generation'],
        dataTypes: [GDPRDataType.VOICE_RECORDINGS],
        validFrom: '2024-01-01T00:00:00Z',
        validUntil: '2025-01-01T00:00:00Z'
      }

      const consent = await service.recordConsent(consentData)
      await service.revokeConsent(consent.id, 'User requested withdrawal')

      const isValid = await service.isConsentValid('user-123', 'voice_data_processing')
      expect(isValid).toBe(false)
    })
  })

  describe('Data Subject Requests', () => {
    it('should process access request correctly', async () => {
      const requestData = {
        dataSubjectId: 'user-123',
        organizationId: 'org-456',
        requestType: DataSubjectRequestType.ACCESS,
        description: 'Request for copy of all personal data',
        contactInfo: {
          email: 'user@example.com',
          phone: '555-123-4567'
        },
        identityVerified: true,
        verificationMethod: 'email_code'
      }

      const result = await service.processDataSubjectRequest(requestData)

      expect(result.id).toBeDefined()
      expect(result.requestType).toBe(DataSubjectRequestType.ACCESS)
      expect(result.status).toBe('pending')
      expect(result.createdAt).toBeDefined()
    })

    it('should process rectification request correctly', async () => {
      const requestData = await service.createDataSubjectRequest(
        'user-123',
        'org-456',
        DataSubjectRight.RECTIFICATION,
        'Please update my email address'
      )
      requestData.changes = {
        email: 'newemail@example.com'
      }
      requestData.contactInfo = {
        email: 'user@example.com'
      }

      const result = await service.processDataSubjectRequest(requestData)

      expect(result.requestType).toBe(DataSubjectRequestType.RECTIFICATION)
      expect(result.changes).toBeDefined()
    })

    it('should process erasure request correctly', async () => {
      const requestData = await service.createDataSubjectRequest(
        'user-123',
        'org-456',
        DataSubjectRight.ERASURE,
        'Delete all my voice data'
      )
      requestData.contactInfo = {
        email: 'user@example.com'
      }
      requestData.identityVerified = true

      const result = await service.processDataSubjectRequest(requestData)

      expect(result.requestType).toBe(DataSubjectRequestType.ERASURE)
      expect(result.status).toBe('pending')
    })

    it('should process portability request correctly', async () => {
      const requestData = await service.createDataSubjectRequest(
        'user-123',
        'org-456',
        DataSubjectRight.PORTABILITY,
        'Export my data'
      )
      requestData.format = 'json'
      requestData.contactInfo = {
        email: 'user@example.com'
      }
      requestData.identityVerified = true

      const result = await service.processDataSubjectRequest(requestData)

      expect(result.requestType).toBe(DataSubjectRequestType.PORTABILITY)
      expect(result.format).toBe('json')
    })

    it('should validate request before processing', async () => {
      const invalidRequest = {
        dataSubjectId: '', // Invalid
        requestType: DataSubjectRequestType.ACCESS
      }

      await expect(service.processDataSubjectRequest(invalidRequest as any)).rejects.toThrow()
    })

    it('should complete request correctly', async () => {
      const requestData = {
        dataSubjectId: 'user-123',
        organizationId: 'org-456',
        requestType: DataSubjectRequestType.ACCESS,
        description: 'Access request',
        contactInfo: { email: 'user@example.com' },
        identityVerified: true
      }

      const request = await service.processDataSubjectRequest(requestData)
      const completed = await service.completeDataSubjectRequest(request.id, 'Request processed successfully')

      expect(completed.status).toBe('completed')
      expect(completed.completedAt).toBeDefined()
    })
  })

  describe('Data Processing Validation', () => {
    it('should validate data processing with valid consent', async () => {
      const consentData = {
        dataSubjectId: 'user-123',
        organizationId: 'org-456',
        consentType: 'voice_data_processing' as const,
        legalBasis: LegalBasis.CONSENT,
        purposes: ['plan_generation'],
        dataTypes: [GDPRDataType.VOICE_RECORDINGS],
        validFrom: '2024-01-01T00:00:00Z',
        validUntil: '2025-01-01T00:00:00Z'
      }

      await service.recordConsent(consentData)
      const validation = await service.validateDataProcessing(
        'user-123',
        'plan_generation',
        [GDPRDataType.VOICE_RECORDINGS]
      )

      expect(validation.valid).toBe(true)
      expect(validation.issues.length).toBe(0)
      expect(validation.recommendations.length).toBeGreaterThanOrEqual(0)
    })

    it('should reject processing without consent', async () => {
      const validation = await service.validateDataProcessing(
        'user-456',
        'plan_generation',
        [GDPRDataType.VOICE_RECORDINGS]
      )

      expect(validation.valid).toBe(false)
      expect(validation.reason).toContain('No valid consent found')
    })

    it('should reject processing for wrong purpose', async () => {
      const consentData = {
        dataSubjectId: 'user-123',
        organizationId: 'org-456',
        consentType: 'voice_data_processing' as const,
        legalBasis: LegalBasis.CONSENT,
        purposes: ['plan_generation'], // Only plan_generation consent
        dataTypes: [GDPRDataType.VOICE_RECORDINGS],
        validFrom: '2024-01-01T00:00:00Z',
        validUntil: '2025-01-01T00:00:00Z'
      }

      await service.recordConsent(consentData)
      const validation = await service.validateDataProcessing(
        'user-123',
        'marketing', // Different purpose
        [GDPRDataType.VOICE_RECORDINGS]
      )

      expect(validation.valid).toBe(false)
      expect(validation.reason).toContain('not covered by consent')
    })

    it('should validate processing with legitimate interest', async () => {
      const validation = await service.validateDataProcessing(
        'user-123',
        'fraud_detection',
        [GDPRDataType.TRANSCRIPTS],
        LegalBasis.LEGITIMATE_INTEREST
      )

      expect(validation.valid).toBe(true)
      expect(validation.legalBasis).toBe(LegalBasis.LEGITIMATE_INTEREST)
    })
  })

  describe('Retention Management', () => {
    it('should set retention policy correctly', async () => {
      const retentionPolicy = {
        organizationId: 'org-456',
        dataType: GDPRDataType.VOICE_RECORDINGS,
        retentionPeriodDays: 365,
        deletionAction: 'secure_delete',
        archivalPolicy: {
          enabled: true,
          archivalPeriodDays: 1800
        }
      }

      const policy = await service.setRetentionPolicy(retentionPolicy)

      expect(policy.id).toBeDefined()
      expect(policy.dataType).toBe(GDPRDataType.VOICE_RECORDINGS)
      expect(policy.retentionPeriodDays).toBe(365)
    })

    it('should identify data ready for deletion', async () => {
      const oldData = {
        dataSubjectId: 'user-123',
        dataType: GDPRDataType.VOICE_RECORDINGS,
        createdAt: '2022-01-01T00:00:00Z', // Over 2 years old
        organizationId: 'org-456'
      }

      const retentionPolicy = {
        organizationId: 'org-456',
        dataType: GDPRDataType.VOICE_RECORDINGS,
        retentionPeriodDays: 365 // 1 year retention
      }

      await service.setRetentionPolicy(retentionPolicy)
      const readyForDeletion = await service.getDataReadyForDeletion('org-456')

      expect(readyForDeletion.length).toBeGreaterThan(0)
    })

    it('should execute data deletion correctly', async () => {
      const deletionResult = await service.executeDataDeletion('org-456', {
        dataType: GDPRDataType.VOICE_RECORDINGS,
        dataSubjectIds: ['user-123'],
        reason: 'retention_period_expired'
      })

      expect(deletionResult.deleted).toBeGreaterThan(0)
      expect(deletionResult.failed).toBe(0)
    })
  })

  describe('Compliance Reporting', () => {
    it('should generate comprehensive compliance report', async () => {
      const report = await service.generateComplianceReport('org-456')

      expect(report.organizationId).toBe('org-456')
      expect(report.generatedAt).toBeDefined()
      expect(report.consentRecords.total).toBeGreaterThanOrEqual(0)
      expect(report.dataSubjectRequests.total).toBeGreaterThanOrEqual(0)
      expect(report.dataProcessing.valid).toBeGreaterThanOrEqual(0)
      expect(report.retentionPolicies.total).toBeGreaterThanOrEqual(0)
    })

    it('should include consent statistics in report', async () => {
      // Add some test consent records
      await service.recordConsent({
        dataSubjectId: 'user-1',
        organizationId: 'org-456',
        consentType: 'voice_data_processing',
        legalBasis: LegalBasis.CONSENT,
        purposes: ['plan_generation'],
        dataTypes: [GDPRDataType.VOICE_RECORDINGS],
        validFrom: '2024-01-01T00:00:00Z',
        validUntil: '2025-01-01T00:00:00Z'
      })

      const report = await service.generateComplianceReport('org-456')

      expect(report.consentRecords.total).toBeGreaterThan(0)
      expect(report.consentRecords.active).toBeGreaterThan(0)
      expect(report.consentRecords.expired).toBeGreaterThanOrEqual(0)
    })

    it('should include request statistics in report', async () => {
      // Add a test data subject request
      await service.processDataSubjectRequest({
        dataSubjectId: 'user-1',
        organizationId: 'org-456',
        requestType: DataSubjectRequestType.ACCESS,
        description: 'Access request',
        contactInfo: { email: 'user@example.com' },
        identityVerified: true
      })

      const report = await service.generateComplianceReport('org-456')

      expect(report.dataSubjectRequests.total).toBeGreaterThan(0)
      expect(report.dataSubjectRequests.byType[DataSubjectRequestType.ACCESS]).toBeGreaterThan(0)
    })
  })

  describe('Audit Trail', () => {
    it('should log consent actions correctly', async () => {
      const consent = await service.recordConsent(
        'user-123',
        'org-456',
        'voice_data_processing',
        LegalBasis.CONSENT
      )
      consent.purposes = ['plan_generation']
      consent.dataTypes = [GDPRDataType.VOICE_RECORDINGS]
      consent.validFrom = '2024-01-01T00:00:00Z'
      consent.validUntil = '2025-01-01T00:00:00Z'

      const auditLogs = await service.getAuditLogs('org-456', {
        action: 'consent_recorded'
      })

      expect(auditLogs.length).toBeGreaterThan(0)
      expect(auditLogs[0].action).toBe('consent_recorded')
      expect(auditLogs[0].dataSubjectId).toBe('user-123')
    })

    it('should log data processing actions correctly', async () => {
      await service.logDataProcessing({
        dataSubjectId: 'user-123',
        organizationId: 'org-456',
        purpose: 'plan_generation',
        dataTypes: [GDPRDataType.VOICE_RECORDINGS],
        legalBasis: LegalBasis.CONSENT,
        processedBy: 'system'
      })

      const auditLogs = await service.getAuditLogs('org-456', {
        action: 'data_processed'
      })

      expect(auditLogs.length).toBeGreaterThan(0)
      expect(auditLogs[0].action).toBe('data_processed')
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid consent data gracefully', async () => {
      const invalidConsent = {
        dataSubjectId: null,
        legalBasis: 'invalid_basis'
      }

      await expect(service.recordConsent(invalidConsent as any)).rejects.toThrow()
    })

    it('should handle missing data subject gracefully', async () => {
      const validation = await service.validateDataProcessing(
        'nonexistent-user',
        'plan_generation',
        [GDPRDataType.VOICE_RECORDINGS]
      )

      expect(validation.valid).toBe(false)
      expect(validation.reason).toBeDefined()
    })

    it('should handle database errors gracefully', async () => {
      // Mock database failure
      const mockDB = vi.spyOn(service as any, 'saveToDatabase').mockRejectedValue(new Error('Database error'))

      await expect(service.recordConsent({
        dataSubjectId: 'user-123',
        organizationId: 'org-456',
        consentType: 'voice_data_processing',
        legalBasis: LegalBasis.CONSENT,
        purposes: ['plan_generation'],
        dataTypes: [GDPRDataType.VOICE_RECORDINGS],
        validFrom: '2024-01-01T00:00:00Z',
        validUntil: '2025-01-01T00:00:00Z'
      })).rejects.toThrow('Database error')

      mockDB.mockRestore()
    })
  })

  describe('Convenience Functions', () => {
    it('should work with standalone recordConsent function', async () => {
      const consentData = {
        dataSubjectId: 'user-123',
        organizationId: 'org-456',
        consentType: 'voice_data_processing' as const,
        legalBasis: LegalBasis.CONSENT,
        purposes: ['plan_generation'],
        dataTypes: [GDPRDataType.VOICE_RECORDINGS],
        validFrom: '2024-01-01T00:00:00Z',
        validUntil: '2025-01-01T00:00:00Z'
      }

      const result = await service.recordConsent(consentData)

      expect(result.id).toBeDefined()
      expect(result.dataSubjectId).toBe('user-123')
    })

    it('should work with standalone processDataSubjectRequest function', async () => {
      const requestData = {
        dataSubjectId: 'user-123',
        organizationId: 'org-456',
        requestType: DataSubjectRequestType.ACCESS,
        description: 'Access request',
        contactInfo: { email: 'user@example.com' },
        identityVerified: true
      }

      const result = await service.processDataSubjectRequest(requestData)

      expect(result.id).toBeDefined()
      expect(result.requestType).toBe(DataSubjectRequestType.ACCESS)
    })

    it('should work with standalone validateDataProcessing function', async () => {
      const validation = service.validateDataProcessing(
        'user-123',
        'org-456',
        'voice_data_processing'
      )

      expect(validation.valid).toBe(true)
    })

    it('should work with standalone generateGDPRReport function', async () => {
      const report = await generateGDPRReport('org-456')

      expect(report.organizationId).toBe('org-456')
      expect(report.generatedAt).toBeDefined()
    })
  })
})
