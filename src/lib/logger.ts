import pino from 'pino'

export const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'body.password',
      'body.token',
      'body.secret',
      'body.api_key',
      'query.token',
      'query.password',
      'query.email',
      'user.email',
      'email',
      'password',
      'token',
      'secret',
      'apiKey',
      'api_key'
    ],
    censor: '[REDACTED]'
  },
  formatters: {
    level: (label) => {
      return { level: label }
    }
  },
  ...(process.env.NODE_ENV === 'production'
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            ignore: 'pid,hostname',
            translateTime: 'HH:MM:ss Z',
            singleLine: false
          }
        }
      }
  )
})

// Helper for structured error logging
export function logError(error: unknown, context?: Record<string, unknown>) {
  const errorObj = error instanceof Error
    ? { message: error.message, stack: error.stack, name: error.name }
    : { message: String(error) }

  logger.error({
    ...context,
    error: errorObj
  })
}

// Helper for correlation ID logging
export function logWithCorrelation(level: 'info' | 'warn' | 'error', message: string, correlationId: string, data?: Record<string, unknown>) {
  logger[level]({
    correlationId,
    message,
    ...data
  })
}
