import crypto from 'crypto'
import { z } from 'zod'

/**
 * Voice Data Encryption Service
 * Provides encryption and decryption for voice data at rest
 */

// Encryption schemas
export const EncryptionResultSchema = z.object({
  encryptedData: z.string(),
  iv: z.string(),
  algorithm: z.string(),
  keyId: z.string(),
  timestamp: z.string().datetime(),
  metadata: z.record(z.any()).optional()
})

export const DecryptionResultSchema = z.object({
  decryptedData: z.string(),
  algorithm: z.string(),
  keyId: z.string(),
  metadata: z.record(z.any()).optional()
})

export const EncryptionKeySchema = z.object({
  id: z.string().uuid(),
  algorithm: z.string(),
  keySize: z.number(),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime().optional(),
  status: z.enum(['active', 'rotating', 'expired', 'revoked']),
  usageCount: z.number().min(0),
  lastUsedAt: z.string().datetime().optional()
})

export type EncryptionResult = z.infer<typeof EncryptionResultSchema>
export type DecryptionResult = z.infer<typeof DecryptionResultSchema>
export type EncryptionKey = z.infer<typeof EncryptionKeySchema>

// Encryption configuration
export interface EncryptionConfig {
  algorithm: string
  keySize: number
  ivLength: number
  tagLength: number
  keyRotationDays: number
  enableKeyEscrow: boolean
  enableHardwareSecurity: boolean
  masterKeyProvider: 'aws' | 'azure' | 'gcp' | 'local'
  retentionDays: number
}

/**
 * Voice Data Encryption Service
 */
export class VoiceDataEncryptionService {
  private config: EncryptionConfig
  private currentKey: EncryptionKey | null = null
  private keyCache: Map<string, EncryptionKey> = new Map()

  constructor(config: Partial<EncryptionConfig> = {}) {
    this.config = {
      algorithm: 'aes-256-gcm',
      keySize: 32,
      ivLength: 16,
      tagLength: 16,
      keyRotationDays: 90,
      enableKeyEscrow: true,
      enableHardwareSecurity: false,
      masterKeyProvider: 'local',
      retentionDays: 2555, // 7 years
      ...config
    }

    this.initializeCurrentKey()
  }

  /**
   * Encrypt voice data
   */
  async encryptData(
    data: string | Buffer,
    keyId?: string
  ): Promise<EncryptionResult> {
    try {
      const key = keyId ? await this.getKey(keyId) : await this.getCurrentKey()
      const dataBuffer = typeof data === 'string' ? Buffer.from(data, 'utf8') : data

      // Generate random IV
      const iv = crypto.randomBytes(this.config.ivLength)

      // Create cipher
      const cipher = crypto.createCipher(this.config.algorithm, (key as any).keyData)

      // Encrypt data
      const encrypted = Buffer.concat([
        cipher.update(dataBuffer),
        cipher.final()
      ])

      // For AES-GCM, we need to use createCipheriv
      const gcmCipher = crypto.createCipheriv(this.config.algorithm, (key as any).keyData, iv) as any
      const gcmEncrypted = Buffer.concat([
        gcmCipher.update(dataBuffer),
        gcmCipher.final()
      ])

      // Get authentication tag
      const tag = gcmCipher.getAuthTag()

      // Combine encrypted data and tag
      const encryptedData = Buffer.concat([gcmEncrypted, tag]).toString('base64')

      return {
        encryptedData,
        iv: iv.toString('base64'),
        algorithm: this.config.algorithm,
        keyId: key.id,
        timestamp: new Date().toISOString(),
        metadata: {
          keySize: this.config.keySize,
          tagLength: this.config.tagLength
        }
      }

    } catch (error) {
      console.error('Encryption failed:', error)
      throw new Error(`Failed to encrypt data: ${error}`)
    }
  }

  /**
   * Decrypt voice data
   */
  async decryptData(encryptedResult: EncryptionResult): Promise<DecryptionResult> {
    try {
      const key = await this.getKey(encryptedResult.keyId)
      const encryptedBuffer = Buffer.from(encryptedResult.encryptedData, 'base64')
      const iv = Buffer.from(encryptedResult.iv, 'base64')

      // Split encrypted data and tag
      const tagLength = this.config.tagLength
      const encrypted = encryptedBuffer.slice(0, -tagLength)
      const tag = encryptedBuffer.slice(-tagLength)

      // Create decipher
      const decipher = crypto.createDecipheriv(encryptedResult.algorithm, (key as any).keyData, iv) as any
      decipher.setAuthTag(tag)

      // Decrypt data
      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
      ])

      return {
        decryptedData: decrypted.toString('utf8'),
        algorithm: encryptedResult.algorithm,
        keyId: encryptedResult.keyId,
        metadata: encryptedResult.metadata
      }

    } catch (error) {
      console.error('Decryption failed:', error)
      throw new Error(`Failed to decrypt data: ${error}`)
    }
  }

  /**
   * Encrypt audio file
   */
  async encryptAudioFile(
    audioBuffer: Buffer,
    metadata?: { filename?: string; mimeType?: string; size?: number }
  ): Promise<EncryptionResult & { fileMetadata?: any }> {
    const result = await this.encryptData(audioBuffer)
    
    return {
      ...result,
      fileMetadata: metadata
    }
  }

  /**
   * Decrypt audio file
   */
  async decryptAudioFile(
    encryptedResult: EncryptionResult & { fileMetadata?: any }
  ): Promise<{ audioBuffer: Buffer; metadata?: any }> {
    const decryptionResult = await this.decryptData(encryptedResult)
    
    return {
      audioBuffer: Buffer.from(decryptionResult.decryptedData, 'base64'),
      metadata: encryptedResult.fileMetadata
    }
  }

  /**
   * Rotate encryption key
   */
  async rotateKey(): Promise<EncryptionKey> {
    try {
      // Mark current key as rotating
      if (this.currentKey) {
        this.currentKey.status = 'rotating'
        await this.updateKey(this.currentKey)
      }

      // Generate new key
      const newKey = await this.generateKey()
      
      // Set as current key
      this.currentKey = newKey
      this.keyCache.set(newKey.id, newKey)

      console.log(`[ENCRYPTION] Key rotated: ${newKey.id}`)
      return newKey

    } catch (error) {
      console.error('Key rotation failed:', error)
      throw new Error(`Failed to rotate key: ${error}`)
    }
  }

  /**
   * Re-encrypt data with new key
   */
  async reencryptData(
    encryptedResult: EncryptionResult,
    newKeyId?: string
  ): Promise<EncryptionResult> {
    try {
      // Decrypt with old key
      const decrypted = await this.decryptData(encryptedResult)
      
      // Encrypt with new key
      const reencrypted = await this.encryptData(decrypted.decryptedData, newKeyId)
      
      // Copy metadata
      reencrypted.metadata = {
        ...reencrypted.metadata,
        originalKeyId: encryptedResult.keyId,
        originalTimestamp: encryptedResult.timestamp,
        reencryptedAt: new Date().toISOString()
      }

      return reencrypted

    } catch (error) {
      console.error('Re-encryption failed:', error)
      throw new Error(`Failed to re-encrypt data: ${error}`)
    }
  }

  /**
   * Get encryption key status
   */
  async getKeyStatus(keyId: string): Promise<{
    key: EncryptionKey
    canDecrypt: boolean
    canEncrypt: boolean
    needsRotation: boolean
    daysUntilExpiration: number
  }> {
    const key = await this.getKey(keyId)
    const now = new Date()
    const createdAt = new Date(key.createdAt)
    const expiresAt = key.expiresAt ? new Date(key.expiresAt) : null

    const daysSinceCreation = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
    const daysUntilExpiration = expiresAt ? Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : -1

    return {
      key,
      canDecrypt: key.status === 'active' || key.status === 'rotating',
      canEncrypt: key.status === 'active',
      needsRotation: daysSinceCreation >= this.config.keyRotationDays,
      daysUntilExpiration
    }
  }

  /**
   * Initialize current key
   */
  private async initializeCurrentKey(): Promise<void> {
    try {
      // Try to get existing active key
      const activeKey = await this.getActiveKey()
      if (activeKey) {
        this.currentKey = activeKey
        this.keyCache.set(activeKey.id, activeKey)
        return
      }

      // Generate new key if none exists
      const newKey = await this.generateKey()
      this.currentKey = newKey
      this.keyCache.set(newKey.id, newKey)

    } catch (error) {
      console.error('Failed to initialize encryption key:', error)
      throw error
    }
  }

  /**
   * Generate new encryption key
   */
  private async generateKey(): Promise<EncryptionKey> {
    const keyData = crypto.randomBytes(this.config.keySize)
    const keyId = this.generateUUID()
    const now = new Date()
    const expiresAt = new Date(now.getTime() + this.config.keyRotationDays * 24 * 60 * 60 * 1000)

    const key: EncryptionKey = {
      id: keyId,
      algorithm: this.config.algorithm,
      keySize: this.config.keySize,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      status: 'active',
      usageCount: 0,
      lastUsedAt: now.toISOString()
    }

    // Store key data (in a real implementation, this would be stored securely)
    ;(key as any).keyData = keyData

    // Save key to storage
    await this.saveKey(key)

    return key
  }

  /**
   * Get current encryption key
   */
  private async getCurrentKey(): Promise<EncryptionKey> {
    if (!this.currentKey) {
      await this.initializeCurrentKey()
    }

    if (!this.currentKey) {
      throw new Error('No encryption key available')
    }

    // Check if key needs rotation
    const keyStatus = await this.getKeyStatus(this.currentKey.id)
    if (keyStatus.needsRotation) {
      await this.rotateKey()
    }

    // Update usage
    this.currentKey.usageCount++
    this.currentKey.lastUsedAt = new Date().toISOString()
    await this.updateKey(this.currentKey)

    return this.currentKey
  }

  /**
   * Get encryption key by ID
   */
  private async getKey(keyId: string): Promise<EncryptionKey> {
    // Check cache first
    if (this.keyCache.has(keyId)) {
      return this.keyCache.get(keyId)!
    }

    // Load from storage (mock implementation)
    const key = await this.loadKey(keyId)
    if (!key) {
      throw new Error(`Encryption key not found: ${keyId}`)
    }

    this.keyCache.set(keyId, key)
    return key
  }

  /**
   * Get active encryption key
   */
  private async getActiveKey(): Promise<EncryptionKey | null> {
    // Mock implementation - in reality, this would query a database
    return null
  }

  /**
   * Save key to storage
   */
  private async saveKey(key: EncryptionKey): Promise<void> {
    // Mock implementation - in reality, this would store in a secure key management system
    console.log(`[ENCRYPTION] Key saved: ${key.id}`)
  }

  /**
   * Update key in storage
   */
  private async updateKey(key: EncryptionKey): Promise<void> {
    // Mock implementation
    console.log(`[ENCRYPTION] Key updated: ${key.id}`)
  }

  /**
   * Load key from storage
   */
  private async loadKey(keyId: string): Promise<EncryptionKey | null> {
    // Mock implementation - in reality, this would load from a secure key management system
    console.log(`[ENCRYPTION] Loading key: ${keyId}`)
    return null
  }

  /**
   * Clean up expired keys
   */
  async cleanupExpiredKeys(): Promise<number> {
    const expiredKeys = await this.getExpiredKeys()
    let cleanedCount = 0

    for (const key of expiredKeys) {
      try {
        await this.deleteKey(key.id)
        this.keyCache.delete(key.id)
        cleanedCount++
        console.log(`[ENCRYPTION] Cleaned up expired key: ${key.id}`)
      } catch (error) {
        console.error(`[ENCRYPTION] Failed to clean up key ${key.id}:`, error)
      }
    }

    return cleanedCount
  }

  /**
   * Get expired keys
   */
  private async getExpiredKeys(): Promise<EncryptionKey[]> {
    // Mock implementation
    return []
  }

  /**
   * Delete key
   */
  private async deleteKey(keyId: string): Promise<void> {
    // Mock implementation
    console.log(`[ENCRYPTION] Key deleted: ${keyId}`)
  }

  /**
   * Generate UUID
   */
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
  getConfig(): EncryptionConfig {
    return { ...this.config }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<EncryptionConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Get encryption statistics
   */
  async getEncryptionStats(): Promise<{
    totalKeys: number
    activeKeys: number
    expiredKeys: number
    totalEncryptions: number
    totalDecryptions: number
    averageKeyAge: number
  }> {
    // Mock implementation
    return {
      totalKeys: 5,
      activeKeys: 2,
      expiredKeys: 3,
      totalEncryptions: 1000,
      totalDecryptions: 950,
      averageKeyAge: 45
    }
  }
}

// Export default instance
export const voiceDataEncryptionService = new VoiceDataEncryptionService()

// Convenience functions
export async function encryptVoiceData(
  data: string | Buffer,
  keyId?: string
): Promise<EncryptionResult> {
  const service = new VoiceDataEncryptionService()
  return await service.encryptData(data, keyId)
}

export async function decryptVoiceData(
  encryptedResult: EncryptionResult
): Promise<DecryptionResult> {
  const service = new VoiceDataEncryptionService()
  return await service.decryptData(encryptedResult)
}

export async function encryptAudioFile(
  audioBuffer: Buffer,
  metadata?: { filename?: string; mimeType?: string; size?: number }
): Promise<EncryptionResult & { fileMetadata?: any }> {
  const service = new VoiceDataEncryptionService()
  return await service.encryptAudioFile(audioBuffer, metadata)
}

export async function decryptAudioFile(
  encryptedResult: EncryptionResult & { fileMetadata?: any }
): Promise<{ audioBuffer: Buffer; metadata?: any }> {
  const service = new VoiceDataEncryptionService()
  return await service.decryptAudioFile(encryptedResult)
}

// Export types and schemas (schemas are already exported inline above)
