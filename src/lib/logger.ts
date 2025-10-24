// Simple console logger to avoid worker thread issues
export const logger = {
  debug: (msg: string, ...args: any[]) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEBUG] ${msg}`, ...args)
    }
  },
  info: (msg: string, ...args: any[]) => {
    console.log(`[INFO] ${msg}`, ...args)
  },
  warn: (msg: string, ...args: any[]) => {
    console.warn(`[WARN] ${msg}`, ...args)
  },
  error: (msg: string, ...args: any[]) => {
    console.error(`[ERROR] ${msg}`, ...args)
  }
}

// Helper for structured error logging
export function logError(error: unknown, context?: Record<string, unknown>) {
  const errorObj = error instanceof Error
    ? { message: error.message, stack: error.stack, name: error.name }
    : { message: String(error) }

  logger.error(JSON.stringify({
    ...context,
    error: errorObj
  }))
}

// Helper for correlation ID logging
export function logWithCorrelation(level: 'info' | 'warn' | 'error', message: string, correlationId: string, data?: Record<string, unknown>) {
  logger[level](JSON.stringify({
    correlationId,
    message,
    ...data
  }))
}
