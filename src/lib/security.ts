/**
 * Security utilities for enhanced protection
 */

import crypto from 'crypto'

export interface SecurityConfig {
  maxLoginAttempts: number
  lockoutDuration: number
  passwordMinLength: number
  passwordRequireSpecialChars: boolean
  sessionTimeout: number
  csrfTokenExpiry: number
}

export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  maxLoginAttempts: 5,
  lockoutDuration: 15 * 60 * 1000, // 15 minutes
  passwordMinLength: 8,
  passwordRequireSpecialChars: true,
  sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
  csrfTokenExpiry: 60 * 60 * 1000 // 1 hour
}

class SecurityManager {
  private loginAttempts = new Map<string, { count: number; lockedUntil: number }>()
  private csrfTokens = new Map<string, { token: string; expires: number }>()

  /**
   * Validate password strength
   */
  validatePassword(password: string, config: SecurityConfig = DEFAULT_SECURITY_CONFIG): {
    isValid: boolean
    errors: string[]
  } {
    const errors: string[] = []

    if (password.length < config.passwordMinLength) {
      errors.push(`Password must be at least ${config.passwordMinLength} characters long`)
    }

    if (config.passwordRequireSpecialChars) {
      if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        errors.push('Password must contain at least one special character')
      }
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter')
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter')
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number')
    }

    // Check for common passwords
    const commonPasswords = [
      'password', '123456', '123456789', 'qwerty', 'abc123',
      'password123', 'admin', 'letmein', 'welcome', 'monkey'
    ]

    if (commonPasswords.includes(password.toLowerCase())) {
      errors.push('Password is too common. Please choose a more unique password')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Hash password using bcrypt-like algorithm
   */
  async hashPassword(password: string): Promise<string> {
    const salt = crypto.randomBytes(16).toString('hex')
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex')
    return `${salt}:${hash}`
  }

  /**
   * Verify password against hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    const [salt, storedHash] = hash.split(':')
    if (!salt || !storedHash) return false

    const computedHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex')
    return computedHash === storedHash
  }

  /**
   * Check if IP is locked due to failed login attempts
   */
  isIPLocked(ip: string): boolean {
    const attempt = this.loginAttempts.get(ip)
    if (!attempt) return false

    if (Date.now() < attempt.lockedUntil) {
      return true
    }

    // Remove expired lockout
    this.loginAttempts.delete(ip)
    return false
  }

  /**
   * Record failed login attempt
   */
  recordFailedLogin(ip: string, config: SecurityConfig = DEFAULT_SECURITY_CONFIG): {
    isLocked: boolean
    remainingAttempts: number
    lockoutTime?: number
  } {
    const attempt = this.loginAttempts.get(ip) || { count: 0, lockedUntil: 0 }

    // Check if already locked
    if (Date.now() < attempt.lockedUntil) {
      return {
        isLocked: true,
        remainingAttempts: 0,
        lockoutTime: attempt.lockedUntil
      }
    }

    // Increment attempt count
    attempt.count++

    if (attempt.count >= config.maxLoginAttempts) {
      // Lock the IP
      attempt.lockedUntil = Date.now() + config.lockoutDuration
      this.loginAttempts.set(ip, attempt)

      return {
        isLocked: true,
        remainingAttempts: 0,
        lockoutTime: attempt.lockedUntil
      }
    }

    this.loginAttempts.set(ip, attempt)

    return {
      isLocked: false,
      remainingAttempts: config.maxLoginAttempts - attempt.count
    }
  }

  /**
   * Clear failed login attempts for IP
   */
  clearFailedLogins(ip: string): void {
    this.loginAttempts.delete(ip)
  }

  /**
   * Generate CSRF token
   */
  generateCSRFToken(sessionId: string, config: SecurityConfig = DEFAULT_SECURITY_CONFIG): string {
    const token = crypto.randomBytes(32).toString('hex')
    const expires = Date.now() + config.csrfTokenExpiry

    this.csrfTokens.set(sessionId, { token, expires })

    return token
  }

  /**
   * Verify CSRF token
   */
  verifyCSRFToken(sessionId: string, token: string): boolean {
    const stored = this.csrfTokens.get(sessionId)
    if (!stored) return false

    if (Date.now() > stored.expires) {
      this.csrfTokens.delete(sessionId)
      return false
    }

    return stored.token === token
  }

  /**
   * Generate secure random token
   */
  generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex')
  }

  /**
   * Sanitize user input
   */
  sanitizeInput(input: string): string {
    return input
      .replace(/[<>]/g, '') // Remove HTML tags
      .replace(/['"]/g, '') // Remove quotes
      .replace(/[;\\]/g, '') // Remove semicolons and backslashes
      .trim()
  }

  /**
   * Validate email format
   */
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email) && email.length <= 254
  }

  /**
   * Check for SQL injection patterns
   */
  detectSQLInjection(input: string): boolean {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
      /(;|\-\-|\/\*|\*\/)/,
      /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
      /(\b(OR|AND)\s+['"]?\w+['"]?\s*=\s*['"]?\w+['"]?)/i
    ]

    return sqlPatterns.some(pattern => pattern.test(input))
  }

  /**
   * Check for XSS patterns
   */
  detectXSS(input: string): boolean {
    const xssPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe[^>]*>.*?<\/iframe>/gi,
      /<object[^>]*>.*?<\/object>/gi,
      /<embed[^>]*>.*?<\/embed>/gi
    ]

    return xssPatterns.some(pattern => pattern.test(input))
  }

  /**
   * Rate limit by IP and endpoint
   */
  private rateLimits = new Map<string, { count: number; resetTime: number }>()

  checkRateLimit(ip: string, endpoint: string, limit: number, windowMs: number): boolean {
    const key = `${ip}:${endpoint}`
    const now = Date.now()
    const entry = this.rateLimits.get(key)

    if (!entry || entry.resetTime < now) {
      this.rateLimits.set(key, { count: 1, resetTime: now + windowMs })
      return true
    }

    if (entry.count >= limit) {
      return false
    }

    entry.count++
    return true
  }

  /**
   * Cleanup expired entries
   */
  cleanup(): void {
    const now = Date.now()

    // Cleanup login attempts
    for (const [ip, attempt] of this.loginAttempts.entries()) {
      if (now > attempt.lockedUntil) {
        this.loginAttempts.delete(ip)
      }
    }

    // Cleanup CSRF tokens
    for (const [sessionId, token] of this.csrfTokens.entries()) {
      if (now > token.expires) {
        this.csrfTokens.delete(sessionId)
      }
    }

    // Cleanup rate limits
    for (const [key, limit] of this.rateLimits.entries()) {
      if (now > limit.resetTime) {
        this.rateLimits.delete(key)
      }
    }
  }
}

export const securityManager = new SecurityManager()

// Cleanup expired entries every 5 minutes
setInterval(() => {
  securityManager.cleanup()
}, 5 * 60 * 1000)

// Helper function to validate request security
export function validateRequestSecurity(req: any): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  // Check for required headers
  if (!req.headers['user-agent']) {
    errors.push('Missing User-Agent header')
  }

  // Check for suspicious patterns in URL
  if (req.url && (securityManager.detectSQLInjection(req.url) || securityManager.detectXSS(req.url))) {
    errors.push('Suspicious patterns detected in URL')
  }

  // Check for suspicious patterns in body
  if (req.body && typeof req.body === 'string') {
    if (securityManager.detectSQLInjection(req.body) || securityManager.detectXSS(req.body)) {
      errors.push('Suspicious patterns detected in request body')
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

