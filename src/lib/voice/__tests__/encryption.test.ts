import { describe, it, expect, beforeEach, vi } from 'vitest'
import { 
  VoiceDataEncryptionService,
  encryptVoiceData,
  decryptVoiceData,
  encryptAudioFile,
  decryptAudioFile,
  EncryptionResult,
  DecryptionResult
} from '../encryption'

describe('VoiceDataEncryptionService', () => {
  let service: VoiceDataEncryptionService

  beforeEach(() => {
    service = new VoiceDataEncryptionService()
  })

  describe('Data Encryption', () => {
    it('should encrypt string data correctly', async () => {
      const testData = "This is sensitive voice data"
      const result = await service.encryptData(testData)

      expect(result.encryptedData).toBeDefined()
      expect(result.encryptedData).not.toBe(testData)
      expect(result.iv).toBeDefined()
      expect(result.algorithm).toBe('aes-256-gcm')
      expect(result.keyId).toBeDefined()
      expect(result.timestamp).toBeDefined()
    })

    it('should encrypt buffer data correctly', async () => {
      const testBuffer = Buffer.from('Binary voice data', 'utf8')
      const result = await service.encryptData(testBuffer)

      expect(result.encryptedData).toBeDefined()
      expect(result.encryptedData).not.toBe(testBuffer.toString())
      expect(result.iv).toBeDefined()
      expect(result.keyId).toBeDefined()
    })

    it('should use different IVs for each encryption', async () => {
      const testData = "Test data"
      const result1 = await service.encryptData(testData)
      const result2 = await service.encryptData(testData)

      expect(result1.iv).not.toBe(result2.iv)
      expect(result1.encryptedData).not.toBe(result2.encryptedData)
    })

    it('should include metadata in encryption result', async () => {
      const testData = "Test data"
      const result = await service.encryptData(testData)

      expect(result.metadata).toBeDefined()
      expect(result.metadata?.keySize).toBe(32)
      expect(result.metadata?.tagLength).toBe(16)
    })
  })

  describe('Data Decryption', () => {
    it('should decrypt data correctly', async () => {
      const originalData = "Sensitive voice information"
      const encrypted = await service.encryptData(originalData)
      const decrypted = await service.decryptData(encrypted)

      expect(decrypted.decryptedData).toBe(originalData)
      expect(decrypted.algorithm).toBe(encrypted.algorithm)
      expect(decrypted.keyId).toBe(encrypted.keyId)
    })

    it('should decrypt buffer data correctly', async () => {
      const originalBuffer = Buffer.from('Binary voice data', 'utf8')
      const encrypted = await service.encryptData(originalBuffer)
      const decrypted = await service.decryptData(encrypted)

      expect(decrypted.decryptedData).toBe(originalBuffer.toString('utf8'))
    })

    it('should preserve metadata during decryption', async () => {
      const testData = "Test data"
      const metadata = { test: 'value' }
      const encrypted = await service.encryptData(testData)
      encrypted.metadata = metadata

      const decrypted = await service.decryptData(encrypted)

      expect(decrypted.metadata).toEqual(metadata)
    })

    it('should throw error for invalid encrypted data', async () => {
      const invalidEncrypted = {
        encryptedData: "invalid-data",
        iv: "invalid-iv",
        algorithm: "invalid-algorithm",
        keyId: "nonexistent-key"
      }

      await expect(service.decryptData(invalidEncrypted as any)).rejects.toThrow()
    })

    it('should throw error for wrong key', async () => {
      const testData = "Test data"
      const encrypted = await service.encryptData(testData)
      
      // Modify the keyId to simulate wrong key
      encrypted.keyId = 'wrong-key-id'

      await expect(service.decryptData(encrypted)).rejects.toThrow()
    })
  })

  describe('Audio File Encryption', () => {
    it('should encrypt audio file with metadata', async () => {
      const audioBuffer = Buffer.from('fake audio data', 'utf8')
      const fileMetadata = {
        filename: 'recording.wav',
        mimeType: 'audio/wav',
        size: audioBuffer.length
      }

      const result = await service.encryptAudioFile(audioBuffer, fileMetadata)

      expect(result.encryptedData).toBeDefined()
      expect(result.fileMetadata).toEqual(fileMetadata)
      expect(result.keyId).toBeDefined()
    })

    it('should decrypt audio file correctly', async () => {
      const originalAudio = Buffer.from('fake audio data', 'utf8')
      const fileMetadata = {
        filename: 'recording.wav',
        mimeType: 'audio/wav'
      }

      const encrypted = await service.encryptAudioFile(originalAudio, fileMetadata)
      const decrypted = await service.decryptAudioFile(encrypted)

      expect(decrypted.audioBuffer).toEqual(originalAudio)
      expect(decrypted.metadata).toEqual(fileMetadata)
    })

    it('should handle large audio files', async () => {
      // Create a large buffer (1MB)
      const largeAudio = Buffer.alloc(1024 * 1024, 'audio-data')
      const encrypted = await service.encryptAudioFile(largeAudio)
      const decrypted = await service.decryptAudioFile(encrypted)

      expect(decrypted.audioBuffer).toEqual(largeAudio)
    })
  })

  describe('Key Management', () => {
    it('should generate unique keys', async () => {
      const key1 = await service['generateKey']()
      const key2 = await service['generateKey']()

      expect(key1.id).not.toBe(key2.id)
      expect(key1.keyData).not.toBe(key2.keyData)
      expect(key1.algorithm).toBe('aes-256-gcm')
      expect(key1.keySize).toBe(32)
    })

    it('should rotate keys correctly', async () => {
      const originalKey = await service.getCurrentKey()
      const rotatedKey = await service.rotateKey()

      expect(rotatedKey.id).not.toBe(originalKey.id)
      expect(rotatedKey.status).toBe('active')
      expect(originalKey.status).toBe('rotating')
    })

    it('should get key status correctly', async () => {
      const key = await service['getCurrentKey']()
      const status = await service.getKeyStatus(key.id)

      expect(status.key.id).toBe(key.id)
      expect(status.canDecrypt).toBe(true)
      expect(status.canEncrypt).toBe(true)
      expect(status.needsRotation).toBe(false)
      expect(status.daysUntilExpiration).toBeGreaterThan(0)
    })

    it('should identify keys that need rotation', async () => {
      // Create an old key that needs rotation
      const oldKey = await service['generateKey']()
      oldKey.createdAt = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString() // 100 days ago
      
      const status = await service.getKeyStatus(oldKey.id)
      
      expect(status.needsRotation).toBe(true)
    })

    it('should handle key expiration', async () => {
      const expiredKey = await service['generateKey']()
      expiredKey.expiresAt = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // Yesterday
      
      const status = await service.getKeyStatus(expiredKey.id)
      
      expect(status.canEncrypt).toBe(false)
      expect(status.daysUntilExpiration).toBe(-1)
    })
  })

  describe('Re-encryption', () => {
    it('should re-encrypt data with new key', async () => {
      const originalData = "Test data"
      const originalEncrypted = await service.encryptData(originalData)
      
      // Rotate key
      await service.rotateKey()
      
      const reencrypted = await service.reencryptData(originalEncrypted)
      
      expect(reencrypted.keyId).not.toBe(originalEncrypted.keyId)
      expect(reencrypted.metadata?.originalKeyId).toBe(originalEncrypted.keyId)
      expect(reencrypted.metadata?.reencryptedAt).toBeDefined()
      
      // Decrypt with new key
      const decrypted = await service.decryptData(reencrypted)
      expect(decrypted.decryptedData).toBe(originalData)
    })

    it('should re-encrypt with specific key ID', async () => {
      const originalData = "Test data"
      const originalEncrypted = await service.encryptData(originalData)
      
      // Generate new key
      const newKey = await service['generateKey']()
      
      const reencrypted = await service.reencryptData(originalEncrypted, newKey.id)
      
      expect(reencrypted.keyId).toBe(newKey.id)
    })
  })

  describe('Configuration', () => {
    it('should use custom configuration', () => {
      const customConfig = {
        algorithm: 'aes-192-cbc',
        keySize: 24,
        ivLength: 16,
        keyRotationDays: 30
      }

      const customService = new VoiceDataEncryptionService(customConfig)
      const config = customService.getConfig()

      expect(config.algorithm).toBe('aes-192-cbc')
      expect(config.keySize).toBe(24)
      expect(config.keyRotationDays).toBe(30)
    })

    it('should update configuration', () => {
      const newConfig = {
        keyRotationDays: 60,
        enableKeyEscrow: false
      }

      service.updateConfig(newConfig)
      const config = service.getConfig()

      expect(config.keyRotationDays).toBe(60)
      expect(config.enableKeyEscrow).toBe(false)
    })
  })

  describe('Performance', () => {
    it('should handle encryption performance efficiently', async () => {
      const largeData = "x".repeat(100000) // 100KB string
      const startTime = Date.now()
      
      await service.encryptData(largeData)
      
      const endTime = Date.now()
      expect(endTime - startTime).toBeLessThan(1000) // Should complete within 1 second
    })

    it('should handle decryption performance efficiently', async () => {
      const largeData = "x".repeat(100000)
      const encrypted = await service.encryptData(largeData)
      const startTime = Date.now()
      
      await service.decryptData(encrypted)
      
      const endTime = Date.now()
      expect(endTime - startTime).toBeLessThan(1000) // Should complete within 1 second
    })

    it('should handle concurrent operations', async () => {
      const promises = Array(10).fill(0).map((_, i) => 
        service.encryptData(`Test data ${i}`)
      )

      const results = await Promise.all(promises)
      
      expect(results).toHaveLength(10)
      expect(new Set(results.map(r => r.keyId)).size).toBeGreaterThan(0) // Keys should be distributed
    })
  })

  describe('Security Features', () => {
    it('should use authenticated encryption', async () => {
      const data = "Test data"
      const encrypted = await service.encryptData(data)
      
      // Tamper with encrypted data
      const tampered = {
        ...encrypted,
        encryptedData: encrypted.encryptedData.slice(0, -1) + 'X'
      }

      await expect(service.decryptData(tampered)).rejects.toThrow()
    })

    it('should generate cryptographically secure random IVs', async () => {
      const ivs = await Promise.all(
        Array(100).fill(0).map(() => service.encryptData("test").then(r => r.iv))
      )

      const uniqueIvs = new Set(ivs)
      expect(uniqueIvs.size).toBe(100) // All IVs should be unique
    })

    it('should handle key cleanup', async () => {
      const cleanedCount = await service.cleanupExpiredKeys()
      
      expect(typeof cleanedCount).toBe('number')
      expect(cleanedCount).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Statistics and Monitoring', () => {
    it('should provide encryption statistics', async () => {
      const stats = await service.getEncryptionStats()
      
      expect(stats.totalKeys).toBeGreaterThanOrEqual(0)
      expect(stats.activeKeys).toBeGreaterThanOrEqual(0)
      expect(stats.expiredKeys).toBeGreaterThanOrEqual(0)
      expect(stats.totalEncryptions).toBeGreaterThanOrEqual(0)
      expect(stats.totalDecryptions).toBeGreaterThanOrEqual(0)
    })

    it('should track key usage', async () => {
      const key = await service['getCurrentKey']()
      const initialUsage = key.usageCount
      
      await service.encryptData("test data")
      const updatedKey = await service.getCurrentKey()
      
      expect(updatedKey.usageCount).toBe(initialUsage + 1)
    })
  })

  describe('Error Handling', () => {
    it('should handle empty data gracefully', async () => {
      const result = await service.encryptData("")
      
      expect(result.encryptedData).toBeDefined()
      expect(result.encryptedData).not.toBe("")
    })

    it('should handle null data gracefully', async () => {
      await expect(service.encryptData(null as any)).rejects.toThrow()
    })

    it('should handle invalid configuration gracefully', () => {
      expect(() => {
        new VoiceDataEncryptionService({
          algorithm: 'invalid-algorithm'
        })
      }).not.toThrow() // Should fallback to defaults
    })

    it('should handle missing keys gracefully', async () => {
      const invalidEncrypted = {
        encryptedData: "data",
        iv: "iv",
        algorithm: "aes-256-gcm",
        keyId: "nonexistent-key"
      }

      await expect(service.decryptData(invalidEncrypted as any)).rejects.toThrow()
    })
  })

  describe('Convenience Functions', () => {
    it('should work with standalone encryptVoiceData function', async () => {
      const result = await encryptVoiceData("test data")
      
      expect(result.encryptedData).toBeDefined()
      expect(result.keyId).toBeDefined()
    })

    it('should work with standalone decryptVoiceData function', async () => {
      const encrypted = await encryptVoiceData("test data")
      const decrypted = await decryptVoiceData(encrypted)
      
      expect(decrypted.decryptedData).toBe("test data")
    })

    it('should work with standalone encryptAudioFile function', async () => {
      const audioBuffer = Buffer.from("audio data", 'utf8')
      const result = await encryptAudioFile(audioBuffer, {
        filename: 'test.wav'
      })
      
      expect(result.encryptedData).toBeDefined()
      expect(result.fileMetadata?.filename).toBe('test.wav')
    })

    it('should work with standalone decryptAudioFile function', async () => {
      const audioBuffer = Buffer.from("audio data", 'utf8')
      const encrypted = await encryptAudioFile(audioBuffer)
      const decrypted = await decryptAudioFile(encrypted)
      
      expect(decrypted.audioBuffer).toEqual(audioBuffer)
    })
  })

  describe('Integration Tests', () => {
    it('should handle complete encryption/decryption workflow', async () => {
      const originalData = "Sensitive voice transcription data"
      const metadata = {
        sessionId: 'session-123',
        userId: 'user-456',
        timestamp: new Date().toISOString()
      }

      // Encrypt
      const encrypted = await service.encryptData(originalData)
      encrypted.metadata = metadata

      // Decrypt
      const decrypted = await service.decryptData(encrypted)

      // Verify
      expect(decrypted.decryptedData).toBe(originalData)
      expect(decrypted.metadata).toEqual(metadata)
    })

    it('should handle key rotation during active operations', async () => {
      const originalData = "Test data"
      
      // Encrypt with original key
      const encrypted1 = await service.encryptData(originalData)
      
      // Rotate key
      await service.rotateKey()
      
      // Encrypt with new key
      const encrypted2 = await service.encryptData(originalData)
      
      // Both should decrypt correctly
      const decrypted1 = await service.decryptData(encrypted1)
      const decrypted2 = await service.decryptData(encrypted2)
      
      expect(decrypted1.decryptedData).toBe(originalData)
      expect(decrypted2.decryptedData).toBe(originalData)
      expect(encrypted1.keyId).not.toBe(encrypted2.keyId)
    })
  })
})
