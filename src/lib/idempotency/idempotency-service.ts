import { randomUUID } from 'crypto'
import { createHash } from 'crypto'
import { ApiError, ErrorFactory } from '../errors/api-error'

/**
 * Idempotency layer for voice planning API endpoints
 * Ensures that duplicate requests with the same idempotency key return the same response
 */

export interface IdempotencyRecord {
  id: string
  idempotency_key: string
  request_hash: string
  response_status: number
  response_body: any
  created_at: Date
  expires_at: Date
  user_id?: string
  organization_id?: string
  endpoint: string
}

export interface IdempotencyOptions {
  // Default expiration time for idempotency records (24 hours)
  expirationHours?: number
  // Maximum request body size for hashing (1MB)
  maxBodySize?: number
  // Whether to include headers in hash calculation
  includeHeaders?: boolean
  // Headers to exclude from hash calculation
  excludeHeaders?: string[]
}

export class IdempotencyService {
  private static instance: IdempotencyService
  private options: Required<IdempotencyOptions>
  private storage: Map<string, IdempotencyRecord> = new Map()

  private constructor(options: IdempotencyOptions = {}) {
    this.options = {
      expirationHours: options.expirationHours ?? 24,
      maxBodySize: options.maxBodySize ?? 1024 * 1024, // 1MB
      includeHeaders: options.includeHeaders ?? false,
      excludeHeaders: options.excludeHeaders ?? [
        'authorization',
        'x-api-key',
        'cookie',
        'user-agent'
      ]
    }
  }

  static getInstance(options?: IdempotencyOptions): IdempotencyService {
    if (!IdempotencyService.instance) {
      IdempotencyService.instance = new IdempotencyService(options)
    }
    return IdempotencyService.instance
  }

  /**
   * Generate a hash of the request for idempotency comparison
   */
  generateRequestHash(
    method: string,
    url: string,
    body: any,
    headers?: Record<string, string>
  ): string {
    const hashInput = {
      method,
      url,
      body: this.normalizeBody(body),
      headers: this.options.includeHeaders ? this.normalizeHeaders(headers) : undefined
    }

    const hashString = JSON.stringify(hashInput, Object.keys(hashInput).sort())
    return createHash('sha256').update(hashString).digest('hex')
  }

  /**
   * Check if a request with the given idempotency key has been processed
   */
  async checkIdempotency(
    idempotencyKey: string,
    requestHash: string,
    context?: { userId?: string; organizationId?: string; endpoint?: string }
  ): Promise<{ isDuplicate: boolean; record?: IdempotencyRecord }> {
    // Clean up expired records first
    this.cleanupExpiredRecords()

    const record = this.storage.get(idempotencyKey)

    if (!record) {
      return { isDuplicate: false }
    }

    // Check if the request hash matches (same request content)
    if (record.request_hash !== requestHash) {
      throw ErrorFactory.idempotencyConflict(idempotencyKey)
    }

    // Check if record has expired
    if (new Date() > record.expires_at) {
      this.storage.delete(idempotencyKey)
      return { isDuplicate: false }
    }

    // Verify context matches (prevent cross-user/organization replay)
    if (context?.userId && record.user_id && context.userId !== record.user_id) {
      throw ErrorFactory.idempotencyConflict(idempotencyKey)
    }

    if (context?.organizationId && record.organization_id && context.organizationId !== record.organization_id) {
      throw ErrorFactory.idempotencyConflict(idempotencyKey)
    }

    return { isDuplicate: true, record }
  }

  /**
   * Store a successful response for idempotency
   */
  async storeResponse(
    idempotencyKey: string,
    requestHash: string,
    responseStatus: number,
    responseBody: any,
    context?: { userId?: string; organizationId?: string; endpoint?: string }
  ): Promise<void> {
    const record: IdempotencyRecord = {
      id: randomUUID(),
      idempotency_key: idempotencyKey,
      request_hash: requestHash,
      response_status: responseStatus,
      response_body: responseBody,
      created_at: new Date(),
      expires_at: new Date(Date.now() + this.options.expirationHours * 60 * 60 * 1000),
      user_id: context?.userId,
      organization_id: context?.organizationId,
      endpoint: context?.endpoint ?? 'unknown'
    }

    this.storage.set(idempotencyKey, record)
  }

  /**
   * Clean up expired records
   */
  private cleanupExpiredRecords(): void {
    const now = new Date()
    for (const [key, record] of this.storage.entries()) {
      if (now > record.expires_at) {
        this.storage.delete(key)
      }
    }
  }

  /**
   * Normalize request body for consistent hashing
   */
  private normalizeBody(body: any): any {
    if (!body) return body

    // Handle large bodies
    const bodyString = JSON.stringify(body)
    if (bodyString.length > this.options.maxBodySize) {
      // For large bodies, hash the content and use that for comparison
      return {
        __large_body_hash: createHash('sha256').update(bodyString).digest('hex'),
        __size: bodyString.length
      }
    }

    // Sort object keys for consistent hashing
    if (typeof body === 'object' && body !== null && !Array.isArray(body)) {
      const sorted: any = {}
      Object.keys(body).sort().forEach(key => {
        sorted[key] = body[key]
      })
      return sorted
    }

    return body
  }

  /**
   * Normalize headers for consistent hashing
   */
  private normalizeHeaders(headers?: Record<string, string>): Record<string, string> | undefined {
    if (!headers) return undefined

    const normalized: Record<string, string> = {}
    Object.keys(headers)
      .filter(key => !this.options.excludeHeaders.includes(key.toLowerCase()))
      .sort()
      .forEach(key => {
        normalized[key.toLowerCase()] = headers[key]
      })

    return Object.keys(normalized).length > 0 ? normalized : undefined
  }

  /**
   * Get statistics about idempotency storage
   */
  getStats(): {
    totalRecords: number
    expiredRecords: number
    memoryUsageEstimate: number
  } {
    let expiredCount = 0
    let totalSize = 0

    for (const record of this.storage.values()) {
      if (new Date() > record.expires_at) {
        expiredCount++
      }
      totalSize += JSON.stringify(record).length
    }

    return {
      totalRecords: this.storage.size,
      expiredRecords: expiredCount,
      memoryUsageEstimate: totalSize
    }
  }

  /**
   * Clear all records (useful for testing)
   */
  clear(): void {
    this.storage.clear()
  }
}

/**
 * Express middleware for idempotency handling
 */
export function idempotencyMiddleware(options?: IdempotencyOptions) {
  const idempotencyService = IdempotencyService.getInstance(options)

  return async (req: any, res: any, next: any) => {
    const idempotencyKey = req.headers['idempotency-key']

    // Skip idempotency for GET, DELETE, OPTIONS requests
    if (['GET', 'DELETE', 'OPTIONS'].includes(req.method)) {
      return next()
    }

    // Skip if no idempotency key provided (optional for non-critical endpoints)
    if (!idempotencyKey) {
      return next()
    }

    try {
      // Validate idempotency key format
      if (typeof idempotencyKey !== 'string' || idempotencyKey.length < 8) {
        throw ErrorFactory.idempotencyConflict(idempotencyKey)
      }

      // Generate request hash
      const requestHash = idempotencyService.generateRequestHash(
        req.method,
        req.originalUrl,
        req.body,
        req.headers
      )

      // Check for existing request
      const context = {
        userId: req.user?.id,
        organizationId: req.organization?.id,
        endpoint: `${req.method} ${req.route?.path ?? req.originalUrl}`
      }

      const { isDuplicate, record } = await idempotencyService.checkIdempotency(
        idempotencyKey,
        requestHash,
        context
      )

      if (isDuplicate && record) {
        // Return the stored response
        return res
          .status(record.response_status)
          .set('X-Idempotent-Replay', 'true')
          .json(record.response_body)
      }

      // Store the original res.json method to intercept responses
      const originalJson = res.json
      let responseStored = false

      res.json = function(body: any) {
        if (!responseStored && res.statusCode >= 200 && res.statusCode < 300) {
          // Store successful responses
          idempotencyService.storeResponse(
            idempotencyKey,
            requestHash,
            res.statusCode,
            body,
            context
          ).catch(error => {
            console.error('Failed to store idempotency response:', error)
          })
          responseStored = true
        }
        return originalJson.call(this, body)
      }

      // Add idempotency key to response headers
      res.set('Idempotency-Key', idempotencyKey)

      next()
    } catch (error) {
      next(error)
    }
  }
}

/**
 * Decorator for making functions idempotent
 */
export function Idempotent(options?: IdempotencyOptions) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value
    const idempotencyService = IdempotencyService.getInstance(options)

    descriptor.value = async function (...args: any[]) {
      // Extract idempotency key from arguments (assuming it's the first argument or in options)
      const idempotencyKey = args[0]?.idempotencyKey || args[1]?.idempotencyKey

      if (!idempotencyKey) {
        // No idempotency key, proceed normally
        return method.apply(this, args)
      }

      // Generate hash from arguments (excluding idempotency key)
      const argsForHash = args.map(arg => {
        if (typeof arg === 'object' && arg !== null) {
          const { idempotencyKey, ...rest } = arg
          return rest
        }
        return arg
      })

      const requestHash = idempotencyService.generateRequestHash(
        'FUNCTION',
        propertyName,
        argsForHash
      )

      const context = {
        userId: this.user?.id,
        organizationId: this.organization?.id,
        endpoint: `function:${propertyName}`
      }

      const { isDuplicate, record } = await idempotencyService.checkIdempotency(
        idempotencyKey,
        requestHash,
        context
      )

      if (isDuplicate && record) {
        return record.response_body
      }

      // Execute the original method
      const result = await method.apply(this, args)

      // Store the result if successful
      await idempotencyService.storeResponse(
        idempotencyKey,
        requestHash,
        200,
        result,
        context
      )

      return result
    }

    return descriptor
  }
}

/**
 * Utility functions for idempotency key generation
 */
export class IdempotencyUtils {
  /**
   * Generate a secure idempotency key
   */
  static generateKey(): string {
    return randomUUID()
  }

  /**
   * Generate a deterministic idempotency key from context
   */
  static generateKeyFromContext(context: {
    userId?: string
    operation: string
    timestamp?: number
    additionalData?: any
  }): string {
    const hashInput = {
      userId: context.userId,
      operation: context.operation,
      timestamp: context.timestamp ?? Date.now(),
      additionalData: context.additionalData
    }

    const hashString = JSON.stringify(hashInput, Object.keys(hashInput).sort())
    return createHash('sha256').update(hashString).digest('hex').substring(0, 32)
  }

  /**
   * Validate idempotency key format
   */
  static validateKey(key: string): boolean {
    return typeof key === 'string' && key.length >= 8 && key.length <= 255
  }
}

// Types are already exported through their interface declarations
