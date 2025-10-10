// Security utilities for API responses and error handling

// Sanitize error messages to prevent sensitive information leakage
export function sanitizeErrorMessage(error: any): string {
  // Never expose internal error details, stack traces, or sensitive data
  if (typeof error === 'string') {
    // Check for common sensitive patterns
    if (error.includes('password') ||
        error.includes('token') ||
        error.includes('secret') ||
        error.includes('key') ||
        error.includes('auth')) {
      return 'An authentication error occurred'
    }

    // Check for database errors
    if (error.includes('SQL') ||
        error.includes('database') ||
        error.includes('query') ||
        error.includes('connection')) {
      return 'A database error occurred'
    }

    // Check for file system errors
    if (error.includes('ENOENT') ||
        error.includes('EACCES') ||
        error.includes('file') ||
        error.includes('path')) {
      return 'A file system error occurred'
    }

    // Check for network errors
    if (error.includes('ECONNREFUSED') ||
        error.includes('ENOTFOUND') ||
        error.includes('timeout')) {
      return 'A network error occurred'
    }

    // For generic errors, provide a safe message
    return 'An unexpected error occurred'
  }

  if (error instanceof Error) {
    return sanitizeErrorMessage(error.message)
  }

  // For any other error type, return a generic message
  return 'An unexpected error occurred'
}

// Safe error response for API endpoints
export function createSafeErrorResponse(error: any, statusCode: number = 500) {
  const safeMessage = sanitizeErrorMessage(error)

  // In development, we might want to see more details
  const isDevelopment = process.env.NODE_ENV === 'development'

  return {
    success: false,
    error: safeMessage,
    ...(isDevelopment && {
      // Only include debug info in development
      debug: {
        originalError: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
        statusCode
      }
    })
  }
}

// Sanitize API response data to prevent sensitive data exposure
export function sanitizeApiResponse<T extends Record<string, any>>(data: T): T {
  const sensitiveKeys = [
    'password',
    'token',
    'secret',
    'key',
    'auth',
    'authorization',
    'bearer',
    'session',
    'cookie',
    'private_key',
    'access_token',
    'refresh_token',
    'api_key',
    'database_url',
    'connection_string'
  ]

  const sanitized = { ...data }

  function sanitizeObject(obj: any): any {
    if (typeof obj !== 'object' || obj === null) {
      return obj
    }

    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject)
    }

    const result: any = {}
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase()

      // Remove sensitive keys entirely
      if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
        continue
      }

      // Recursively sanitize nested objects
      result[key] = sanitizeObject(value)
    }

    return result
  }

  return sanitizeObject(sanitized)
}

// Validate and sanitize user input
export function sanitizeUserInput(input: string, maxLength: number = 1000): string {
  if (typeof input !== 'string') {
    return ''
  }

  // Remove potentially dangerous characters
  let sanitized = input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/data:/gi, '') // Remove data: protocol
    .trim()

  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength)
  }

  return sanitized
}

// Rate limiting helper (basic implementation)
const requestCounts = new Map<string, { count: number; resetTime: number }>()

export function checkRateLimit(identifier: string, maxRequests: number = 100, windowMs: number = 60000): boolean {
  const now = Date.now()
  const existing = requestCounts.get(identifier)

  if (!existing || now > existing.resetTime) {
    requestCounts.set(identifier, { count: 1, resetTime: now + windowMs })
    return true
  }

  if (existing.count >= maxRequests) {
    return false
  }

  existing.count++
  return true
}

// Security headers for API responses
export function getSecurityHeaders() {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'",
  }
}

// Validate request origin for CORS-like protection
export function validateRequestOrigin(request: Request, allowedOrigins: string[] = []): boolean {
  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')

  // Allow requests without origin (same-origin, mobile apps, etc.)
  if (!origin && !referer) {
    return true
  }

  // Check origin
  if (origin && allowedOrigins.includes(origin)) {
    return true
  }

  // Check referer (fallback)
  if (referer) {
    try {
      const refererOrigin = new URL(referer).origin
      if (allowedOrigins.includes(refererOrigin)) {
        return true
      }
    } catch {
      // Invalid referer URL
    }
  }

  return false
}

// Log security events (for monitoring)
export function logSecurityEvent(event: string, details: Record<string, any>) {
  const logEntry = {
    event,
    details,
    timestamp: new Date().toISOString(),
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
    ip: 'unknown', // Would need to be set by middleware
  }

  console.warn('SECURITY EVENT:', logEntry)

  // In production, you would send this to a security monitoring service
  // Example: sendToSecurityService(logEntry)
}

// Validate file uploads
export function validateFileUpload(file: File, options: {
  maxSize?: number
  allowedTypes?: string[]
  allowedExtensions?: string[]
} = {}): { valid: boolean; error?: string } {
  const { maxSize = 10 * 1024 * 1024, allowedTypes = [], allowedExtensions = [] } = options

  // Check file size
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of ${maxSize / (1024 * 1024)}MB`
    }
  }

  // Check MIME type
  if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type ${file.type} is not allowed. Allowed types: ${allowedTypes.join(', ')}`
    }
  }

  // Check file extension
  if (allowedExtensions.length > 0) {
    const extension = file.name.split('.').pop()?.toLowerCase()
    if (!extension || !allowedExtensions.includes(extension)) {
      return {
        valid: false,
        error: `File extension is not allowed. Allowed extensions: ${allowedExtensions.join(', ')}`
      }
    }
  }

  return { valid: true }
}
