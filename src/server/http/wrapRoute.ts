import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { requireAuth, AuthError } from '@/server/auth/requireAuth'

type RouteHandler<I extends z.ZodTypeAny> = (ctx: {
  input: z.infer<I>
  req: NextRequest
  user: { id: string; email?: string | undefined; supabase: any }
  correlationId: string
}) => Promise<any>

/**
 * Wrap an API route with standard error handling, validation, and authentication
 *
 * @param schema - Zod schema to validate request body and query params
 * @param handler - Route handler function
 * @returns Next.js route handler
 *
 * @example
 * export const POST = wrapRoute(CreateProjectSchema, async ({ input, user, correlationId }) => {
 *   const project = await createProject(user.id, input.body)
 *   return project
 * })
 */
export function wrapRoute<I extends z.ZodTypeAny>(
  schema: I,
  handler: RouteHandler<I>
) {
  return async (req: NextRequest) => {
    const correlationId = req.headers.get('x-correlation-id') ?? crypto.randomUUID()

    try {
      // Parse request body and query params
      const body = await req.json().catch(() => ({})) as unknown
      const query = Object.fromEntries(new URL(req.url).searchParams)

      // Validate input with Zod
      const input = schema.parse({ body, query })

      // Authenticate user
      const user = await requireAuth()

      // Log request
      logger.info(JSON.stringify({
        correlationId,
        method: req.method,
        url: req.url,
        userId: user.id
      }))

      // Execute handler
      const data = await handler({ input, req, user, correlationId })

      // Return success response
      return NextResponse.json(
        { success: true, data },
        {
          status: 200,
          headers: {
            'x-correlation-id': correlationId,
            'Cache-Control': 'no-store, private'
          }
        }
      )
    } catch (err: any) {
      // Determine error code and status
      let code: string
      let status: number
      let message: string
      let details: Record<string, unknown> | undefined

      if (err instanceof AuthError) {
        code = err.code
        status = err.statusCode
        message = err.message
      } else if (err?.name === 'ZodError') {
        code = 'VALIDATION_ERROR'
        status = 422
        message = 'Validation failed'
        details = err.issues
      } else if (err?.code) {
        code = err.code
        status = err.statusCode || 500
        message = err.message || 'Request failed'
      } else {
        code = 'INTERNAL_ERROR'
        status = 500
        message = 'An unexpected error occurred'
      }

      // Log error with correlation ID
      logger.error(JSON.stringify({
        correlationId,
        error: {
          code,
          message: err?.message,
          stack: err?.stack
        },
        method: req.method,
        url: req.url
      }))

      // Return error response
      return NextResponse.json(
        {
          success: false,
          error: {
            code,
            message,
            ...(details && { details })
          }
        },
        {
          status,
          headers: {
            'x-correlation-id': correlationId,
            'Cache-Control': 'no-store, private'
          }
        }
      )
    }
  }
}

/**
 * Wrap a public route (no authentication required)
 */
export function wrapPublicRoute<I extends z.ZodTypeAny>(
  schema: I,
  handler: (ctx: {
    input: z.infer<I>
    req: NextRequest
    correlationId: string
  }) => Promise<any>
) {
  return async (req: NextRequest) => {
    const correlationId = req.headers.get('x-correlation-id') ?? crypto.randomUUID()

    try {
      const body = await req.json().catch(() => ({})) as unknown
      const query = Object.fromEntries(new URL(req.url).searchParams)
      const input = schema.parse({ body, query })

      logger.info(JSON.stringify({
        correlationId,
        method: req.method,
        url: req.url
      }))

      const data = await handler({ input, req, correlationId })

      return NextResponse.json(
        { success: true, data },
        {
          status: 200,
          headers: { 'x-correlation-id': correlationId }
        }
      )
    } catch (err: any) {
      let code: string
      let status: number
      let message: string
      let details: Record<string, unknown> | undefined

      if (err?.name === 'ZodError') {
        code = 'VALIDATION_ERROR'
        status = 422
        message = 'Validation failed'
        details = err.issues
      } else {
        code = err?.code || 'INTERNAL_ERROR'
        status = err?.statusCode || 500
        message = err?.message || 'Request failed'
      }

      logger.error(JSON.stringify({
        correlationId,
        error: {
          code,
          message: err?.message,
          stack: err?.stack
        }
      }))

      return NextResponse.json(
        {
          success: false,
          error: {
            code,
            message,
            ...(details && { details })
          }
        },
        {
          status,
          headers: { 'x-correlation-id': correlationId }
        }
      )
    }
  }
}
