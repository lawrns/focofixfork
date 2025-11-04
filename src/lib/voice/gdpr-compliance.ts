import { z } from 'zod'
import { PIIRedactionService, PIIType } from './pii-redaction'

/**
 * GDPR Compliance Service
 * Ensures voice data handling complies with GDPR requirements
 */

// GDPR legal bases for processing
export enum LegalBasis {
  CONSENT = 'consent',
  CONTRACT = 'contract',
  LEGAL_OBLIGATION = 'legal_obligation',
  VITAL_INTERESTS = 'vital_interests',
  PUBLIC_TASK = 'public_task',
  LEGITIMATE_INTERESTS = 'legitimate_interests'
}

// Data subject rights
export enum DataSubjectRight {
  ACCESS = 'access',
  RECTIFICATION = 'rectification',
  ERASURE = 'erasure',
  PORTABILITY = 'portability',
  RESTRICTION = 'restriction',
  OBJECTION = 'objection',
  NOTIFICATION = 'notification'
}

// GDPR compliance schemas
export const GDPRConsentSchema = z.object({
  id: z.string().uuid(),
  dataSubjectId: z.string(),
  organizationId: z.string(),
  legalBasis: z.nativeEnum(LegalBasis),
  purpose: z.string(),
  dateGiven: z.string().datetime(),
  dateWithdrawn: z.string().datetime().optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  documentation: z.string().optional()
})

export const DataSubjectRequestSchema = z.object({
  id: z.string().uuid(),
  dataSubjectId: z.string(),
  organizationId: z.string(),
  right: z.nativeEnum(DataSubjectRight),
  requestDate: z.string().datetime(),
  status: z.enum(['pending', 'processing', 'completed', 'rejected']),
  completionDate: z.string().datetime().optional(),
  notes: z.string().optional(),
  evidence: z.array(z.string()).optional()
})

export const GDPRComplianceReportSchema = z.object({
  organizationId: z.string(),
  reportDate: z.string().datetime(),
  totalDataSubjects: z.number().min(0),
  activeConsents: z.number().min(0),
  pendingRequests: z.number().min(0),
  completedRequests: z.number().min(0),
  averageResponseTime: z.number().min(0),
  dataRetentionCompliance: z.number().min(0).max(100),
  piiRedactionRate: z.number().min(0).max(100),
  encryptionCompliance: z.number().min(0).max(100),
  auditTrailCompleteness: z.number().min(0).max(100)
})

export type GDPRConsent = z.infer<typeof GDPRConsentSchema>
export type DataSubjectRequest = z.infer<typeof DataSubjectRequestSchema>
export type GDPRComplianceReport = z.infer<typeof GDPRComplianceReportSchema>

// GDPR configuration
export interface GDPRConfig {
  defaultRetentionDays: number
  maxRetentionDays: number
  requireExplicitConsent: boolean
  enableDataPortability: boolean
  enableRightToErasure: boolean
  auditRetentionDays: number
  encryptionRequired: boolean
  anonymizationRequired: boolean
  dataProtectionOfficer: {
    name: string
    email: string
    phone: string
  }
  dataProcessingLocations: string[]
}

/**
 * GDPR Compliance Service
 */
export class GDPRComplianceService {
  private config: GDPRConfig
  private piiRedactionService: PIIRedactionService

  constructor(config: Partial<GDPRConfig> = {}) {
    this.config = {
      defaultRetentionDays: 365,
      maxRetentionDays: 2555, // 7 years
      requireExplicitConsent: true,
      enableDataPortability: true,
      enableRightToErasure: true,
      auditRetentionDays: 2555,
      encryptionRequired: true,
      anonymizationRequired: true,
      dataProtectionOfficer: {
        name: 'Data Protection Officer',
        email: 'dpo@company.com',
        phone: '+1-555-0123'
      },
      dataProcessingLocations: ['EU', 'US'],
      ...config
    }

    this.piiRedactionService = new PIIRedactionService({
      methods: ['regex', 'nlp'],
      minConfidence: 70
    })
  }

  /**
   * Check if consent is required for processing
   */
  requiresConsent(purpose: string, dataSubjectId: string): boolean {
    if (!this.config.requireExplicitConsent) {
      return false
    }

    // Check if consent already exists and is valid
    return !this.hasValidConsent(dataSubjectId, purpose)
  }

  /**
   * Record consent for data processing
   */
  async recordConsent(
    dataSubjectId: string,
    organizationId: string,
    purpose: string,
    legalBasis: LegalBasis,
    context?: {
      ipAddress?: string
      userAgent?: string
      documentation?: string
    }
  ): Promise<GDPRConsent> {
    const consent: GDPRConsent = {
      id: this.generateUUID(),
      dataSubjectId,
      organizationId,
      legalBasis,
      purpose,
      dateGiven: new Date().toISOString(),
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      documentation: context?.documentation
    }

    // In a real implementation, this would be stored in a database
    console.log(`[GDPR] Consent recorded:`, consent)

    return consent
  }

  /**
   * Withdraw consent for data processing
   */
  async withdrawConsent(consentId: string): Promise<void> {
    // In a real implementation, this would update the database
    console.log(`[GDPR] Consent withdrawn: ${consentId}`)
    
    // Trigger data deletion or anonymization
    await this.handleConsentWithdrawal(consentId)
  }

  /**
   * Process data subject request
   */
  async processDataSubjectRequest(
    dataSubjectId: string,
    organizationId: string,
    right: DataSubjectRight,
    details?: string
  ): Promise<DataSubjectRequest> {
    const request: DataSubjectRequest = {
      id: this.generateUUID(),
      dataSubjectId,
      organizationId,
      right,
      requestDate: new Date().toISOString(),
      status: 'pending',
      notes: details
    }

    // In a real implementation, this would be stored in a database
    console.log(`[GDPR] Data subject request created:`, request)

    // Process the request based on the right
    await this.executeDataSubjectRequest(request)

    return request
  }

  /**
   * Execute data subject request
   */
  private async executeDataSubjectRequest(request: DataSubjectRequest): Promise<void> {
    request.status = 'processing'

    try {
      switch (request.right) {
        case DataSubjectRight.ACCESS:
          await this.handleAccessRequest(request)
          break
        case DataSubjectRight.RECTIFICATION:
          await this.handleRectificationRequest(request)
          break
        case DataSubjectRight.ERASURE:
          await this.handleErasureRequest(request)
          break
        case DataSubjectRight.PORTABILITY:
          await this.handlePortabilityRequest(request)
          break
        case DataSubjectRight.RESTRICTION:
          await this.handleRestrictionRequest(request)
          break
        case DataSubjectRight.OBJECTION:
          await this.handleObjectionRequest(request)
          break
        case DataSubjectRight.NOTIFICATION:
          await this.handleNotificationRequest(request)
          break
      }

      request.status = 'completed'
      request.completionDate = new Date().toISOString()
    } catch (error) {
      console.error(`[GDPR] Failed to process request ${request.id}:`, error)
      request.status = 'rejected'
      request.notes = request.notes ? `${request.notes}\nError: ${error}` : `Error: ${error}`
    }
  }

  /**
   * Handle access request
   */
  private async handleAccessRequest(request: DataSubjectRequest): Promise<void> {
    // Retrieve all personal data for the data subject
    const personalData = await this.retrievePersonalData(request.dataSubjectId)
    
    // Create data package for the subject
    const dataPackage = {
      requestDate: request.requestDate,
      personalData,
      processingPurposes: await this.getProcessingPurposes(request.dataSubjectId),
      dataCategories: await this.getDataCategories(request.dataSubjectId),
      retentionPeriods: await this.getRetentionPeriods(request.dataSubjectId),
      recipients: await this.getDataRecipients(request.dataSubjectId),
      sources: await this.getDataSources(request.dataSubjectId)
    }

    // In a real implementation, this would be sent to the data subject
    console.log(`[GDPR] Access request data prepared for ${request.dataSubjectId}:`, dataPackage)
  }

  /**
   * Handle rectification request
   */
  private async handleRectificationRequest(request: DataSubjectRequest): Promise<void> {
    // Identify inaccurate data
    const inaccurateData = await this.identifyInaccurateData(request.dataSubjectId)
    
    // Correct the data
    for (const data of inaccurateData) {
      await this.correctPersonalData(data.id, request.dataSubjectId)
    }

    console.log(`[GDPR] Rectified ${inaccurateData.length} records for ${request.dataSubjectId}`)
  }

  /**
   * Handle erasure request (right to be forgotten)
   */
  private async handleErasureRequest(request: DataSubjectRequest): Promise<void> {
    if (!this.config.enableRightToErasure) {
      throw new Error('Right to erasure is not enabled')
    }

    // Identify all personal data
    const personalData = await this.retrievePersonalData(request.dataSubjectId)
    
    // Delete or anonymize data
    for (const data of personalData) {
      if (this.canDeleteData(data)) {
        await this.deletePersonalData(data.id)
      } else {
        await this.anonymizePersonalData(data.id)
      }
    }

    console.log(`[GDPR] Erased/anonymized ${personalData.length} records for ${request.dataSubjectId}`)
  }

  /**
   * Handle portability request
   */
  private async handlePortabilityRequest(request: DataSubjectRequest): Promise<void> {
    if (!this.config.enableDataPortability) {
      throw new Error('Data portability is not enabled')
    }

    // Export data in machine-readable format
    const personalData = await this.retrievePersonalData(request.dataSubjectId)
    const exportData = {
      dataSubjectId: request.dataSubjectId,
      exportDate: new Date().toISOString(),
      data: personalData.map(item => ({
        type: item.type,
        value: item.value,
        timestamp: item.timestamp,
        source: item.source
      }))
    }

    // In a real implementation, this would be provided to the data subject
    console.log(`[GDPR] Data export prepared for ${request.dataSubjectId}:`, exportData)
  }

  /**
   * Handle restriction request
   */
  private async handleRestrictionRequest(request: DataSubjectRequest): Promise<void> {
    // Restrict processing of specified data
    const restrictedData = await this.identifyRestrictedData(request.dataSubjectId)
    
    for (const data of restrictedData) {
      await this.restrictDataProcessing(data.id)
    }

    console.log(`[GDPR] Restricted processing for ${restrictedData.length} records for ${request.dataSubjectId}`)
  }

  /**
   * Handle objection request
   */
  private async handleObjectionRequest(request: DataSubjectRequest): Promise<void> {
    // Stop processing based on legitimate interests
    const processingActivities = await this.getLegitimateInterestProcessing(request.dataSubjectId)
    
    for (const activity of processingActivities) {
      await this.stopProcessingActivity(activity.id)
    }

    console.log(`[GDPR] Stopped ${processingActivities.length} processing activities for ${request.dataSubjectId}`)
  }

  /**
   * Handle notification request
   */
  private async handleNotificationRequest(request: DataSubjectRequest): Promise<void> {
    // Notify about data breaches or other required notifications
    await this.sendDataSubjectNotification(request.dataSubjectId)
  }

  /**
   * Ensure data retention compliance
   */
  async enforceRetentionPolicies(): Promise<void> {
    const expiredData = await this.identifyExpiredData()
    
    for (const data of expiredData) {
      if (data.requiresAnonymization) {
        await this.anonymizePersonalData(data.id)
      } else {
        await this.deletePersonalData(data.id)
      }
    }

    console.log(`[GDPR] Processed ${expiredData.length} expired data records`)
  }

  /**
   * Generate GDPR compliance report
   */
  async generateComplianceReport(organizationId: string): Promise<GDPRComplianceReport> {
    const totalDataSubjects = await this.getTotalDataSubjects(organizationId)
    const activeConsents = await this.getActiveConsents(organizationId)
    const pendingRequests = await this.getPendingRequests(organizationId)
    const completedRequests = await this.getCompletedRequests(organizationId)
    const averageResponseTime = await this.getAverageResponseTime(organizationId)
    const dataRetentionCompliance = await this.getDataRetentionCompliance(organizationId)
    const piiRedactionRate = await this.getPIIRedactionRate(organizationId)
    const encryptionCompliance = await this.getEncryptionCompliance(organizationId)
    const auditTrailCompleteness = await this.getAuditTrailCompleteness(organizationId)

    return {
      organizationId,
      reportDate: new Date().toISOString(),
      totalDataSubjects,
      activeConsents,
      pendingRequests,
      completedRequests,
      averageResponseTime,
      dataRetentionCompliance,
      piiRedactionRate,
      encryptionCompliance,
      auditTrailCompleteness
    }
  }

  /**
   * Validate data processing for GDPR compliance
   */
  async validateDataProcessing(
    dataSubjectId: string,
    purpose: string,
    dataTypes: string[]
  ): Promise<{
    compliant: boolean
    issues: string[]
    recommendations: string[]
  }> {
    const issues: string[] = []
    const recommendations: string[] = []

    // Check consent
    if (this.requiresConsent(purpose, dataSubjectId)) {
      issues.push('No valid consent found for data processing')
      recommendations.push('Obtain explicit consent before processing')
    }

    // Check data minimization
    if (dataTypes.length > 10) {
      issues.push('Excessive data collection detected')
      recommendations.push('Implement data minimization principles')
    }

    // Check retention policy
    const retentionDays = await this.getRetentionDays(dataSubjectId)
    if (retentionDays > this.config.maxRetentionDays) {
      issues.push('Data retention period exceeds maximum allowed')
      recommendations.push('Implement automated data deletion')
    }

    // Check encryption
    if (this.config.encryptionRequired) {
      const encryptionStatus = await this.getEncryptionStatus(dataSubjectId)
      if (!encryptionStatus) {
        issues.push('Data is not encrypted as required')
        recommendations.push('Enable encryption for all personal data')
      }
    }

    return {
      compliant: issues.length === 0,
      issues,
      recommendations
    }
  }

  // Helper methods (mock implementations)
  private hasValidConsent(dataSubjectId: string, purpose: string): boolean {
    // In a real implementation, this would check the database
    return false
  }

  private async handleConsentWithdrawal(consentId: string): Promise<void> {
    // Trigger data deletion or anonymization
    console.log(`[GDPR] Processing consent withdrawal: ${consentId}`)
  }

  private async retrievePersonalData(dataSubjectId: string): Promise<any[]> {
    // Mock implementation
    return [
      { id: '1', type: 'voice_data', value: 'redacted', timestamp: new Date().toISOString(), source: 'voice_capture' },
      { id: '2', type: 'transcription', value: 'redacted', timestamp: new Date().toISOString(), source: 'transcription' }
    ]
  }

  private async getProcessingPurposes(dataSubjectId: string): Promise<string[]> {
    return ['voice_planning', 'project_management']
  }

  private async getDataCategories(dataSubjectId: string): Promise<string[]> {
    return ['voice_recordings', 'transcriptions', 'project_plans']
  }

  private async getRetentionPeriods(dataSubjectId: string): Promise<any[]> {
    return [{ category: 'voice_data', retentionDays: 365 }]
  }

  private async getDataRecipients(dataSubjectId: string): Promise<string[]> {
    return ['internal_processing', 'ai_services']
  }

  private async getDataSources(dataSubjectId: string): Promise<string[]> {
    return ['direct_input', 'voice_capture']
  }

  private async identifyInaccurateData(dataSubjectId: string): Promise<any[]> {
    return [] // Mock: no inaccurate data
  }

  private async correctPersonalData(dataId: string, dataSubjectId: string): Promise<void> {
    console.log(`[GDPR] Corrected data: ${dataId} for ${dataSubjectId}`)
  }

  private canDeleteData(data: any): boolean {
    // Check if there are legal obligations to keep the data
    return !data.legalHold
  }

  private async deletePersonalData(dataId: string): Promise<void> {
    console.log(`[GDPR] Deleted data: ${dataId}`)
  }

  private async anonymizePersonalData(dataId: string): Promise<void> {
    console.log(`[GDPR] Anonymized data: ${dataId}`)
  }

  private async identifyRestrictedData(dataSubjectId: string): Promise<any[]> {
    return [] // Mock: no restricted data
  }

  private async restrictDataProcessing(dataId: string): Promise<void> {
    console.log(`[GDPR] Restricted processing for data: ${dataId}`)
  }

  private async getLegitimateInterestProcessing(dataSubjectId: string): Promise<any[]> {
    return [] // Mock: no legitimate interest processing
  }

  private async stopProcessingActivity(activityId: string): Promise<void> {
    console.log(`[GDPR] Stopped processing activity: ${activityId}`)
  }

  private async sendDataSubjectNotification(dataSubjectId: string): Promise<void> {
    console.log(`[GDPR] Sent notification to data subject: ${dataSubjectId}`)
  }

  private async identifyExpiredData(): Promise<any[]> {
    return [] // Mock: no expired data
  }

  private async getTotalDataSubjects(organizationId: string): Promise<number> {
    return 1000 // Mock
  }

  private async getActiveConsents(organizationId: string): Promise<number> {
    return 850 // Mock
  }

  private async getPendingRequests(organizationId: string): Promise<number> {
    return 5 // Mock
  }

  private async getCompletedRequests(organizationId: string): Promise<number> {
    return 95 // Mock
  }

  private async getAverageResponseTime(organizationId: string): Promise<number> {
    return 14 // Mock: days
  }

  private async getDataRetentionCompliance(organizationId: string): Promise<number> {
    return 98 // Mock: percentage
  }

  private async getPIIRedactionRate(organizationId: string): Promise<number> {
    return 95 // Mock: percentage
  }

  private async getEncryptionCompliance(organizationId: string): Promise<number> {
    return 100 // Mock: percentage
  }

  private async getAuditTrailCompleteness(organizationId: string): Promise<number> {
    return 99 // Mock: percentage
  }

  private async getRetentionDays(dataSubjectId: string): Promise<number> {
    return 200 // Mock
  }

  private async getEncryptionStatus(dataSubjectId: string): Promise<boolean> {
    return true // Mock
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0
      const v = c === 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
  }

  /**
   * Get current configuration
   */
  getConfig(): GDPRConfig {
    return { ...this.config }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<GDPRConfig>): void {
    this.config = { ...this.config, ...config }
  }
}

// Export default instance
export const gdprComplianceService = new GDPRComplianceService()

// Convenience functions
export async function validateGDPRCompliance(
  dataSubjectId: string,
  purpose: string,
  dataTypes: string[]
): Promise<{
  compliant: boolean
  issues: string[]
  recommendations: string[]
}> {
  const service = new GDPRComplianceService()
  return await service.validateDataProcessing(dataSubjectId, purpose, dataTypes)
}

export async function generateGDPRReport(organizationId: string): Promise<GDPRComplianceReport> {
  const service = new GDPRComplianceService()
  return await service.generateComplianceReport(organizationId)
}

// Export types and schemas (schemas are already exported inline above)
