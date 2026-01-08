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

