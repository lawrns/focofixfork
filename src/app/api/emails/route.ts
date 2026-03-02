import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, mergeAuthResponse } from '@/lib/api/auth-helper'
import { authRequiredResponse } from '@/lib/api/response-helpers'

export const dynamic = 'force-dynamic'

/**
 * GET /api/emails
 * Returns a summary of all email sub-resources (outbox, deliveries, templates counts).
 * Clients should use sub-routes for full data:
 *   /api/emails/outbox, /api/emails/deliveries, /api/emails/templates
 */
export async function GET(req: NextRequest) {
  const { user, supabase, error, response: authResponse } = await getAuthUser(req)
  if (error || !user) return mergeAuthResponse(authRequiredResponse(), authResponse)

  const [outboxResult, deliveriesResult, templatesResult] = await Promise.allSettled([
    supabase.from('email_outbox').select('id', { count: 'exact', head: true }),
    supabase.from('email_deliveries').select('id', { count: 'exact', head: true }),
    supabase.from('email_templates').select('id', { count: 'exact', head: true }),
  ])

  return mergeAuthResponse(NextResponse.json({
    success: true,
    counts: {
      outbox: outboxResult.status === 'fulfilled' ? (outboxResult.value.count ?? 0) : 0,
      deliveries: deliveriesResult.status === 'fulfilled' ? (deliveriesResult.value.count ?? 0) : 0,
      templates: templatesResult.status === 'fulfilled' ? (templatesResult.value.count ?? 0) : 0,
    },
  }), authResponse)
}
